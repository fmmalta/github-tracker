import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService security controls', () => {
  const userRepository = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    countActiveUsers: jest.fn(),
    create: jest.fn(),
    updatePassword: jest.fn(),
  };

  const refreshTokenRepository = {
    create: jest.fn(),
    findValid: jest.fn(),
    revokeAllForUser: jest.fn(),
  };

  const jwtService = { sign: jest.fn().mockReturnValue('jwt-token') };
  const configService = { getOrThrow: jest.fn().mockReturnValue('secret') };
  const redisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    client: {
      incr: jest.fn(),
      expire: jest.fn(),
    },
  };
  const otpRepository = {
    update: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      userRepository as any,
      refreshTokenRepository as any,
      jwtService as any,
      redisService as any,
      configService as any,
      otpRepository as any,
    );
    redisService.get.mockResolvedValue(null);
    redisService.client.expire.mockResolvedValue(1);
  });

  it('blocks OTP request when email-level rate limit exceeded', async () => {
    // first enforceRateLimit call (email) exceeds allowed attempts
    redisService.client.incr.mockResolvedValueOnce(6);

    await expect(service.requestOtp('dev@example.com', '203.0.113.10')).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('locks identity after repeated invalid OTP attempts', async () => {
    userRepository.findByEmail.mockResolvedValue({ id: 'user-1', email: 'dev@example.com' });
    otpRepository.findOne.mockResolvedValue(null);

    // increment calls:
    // 1) ip rate-limit in verifyOtp => 1
    // 2) fail counter for invalid otp => 5 (threshold reached -> lock)
    redisService.client.incr
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(5);

    await expect(
      service.verifyOtp('dev@example.com', '000000', 'new-password', '203.0.113.20'),
    ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });

    expect(redisService.set).toHaveBeenCalledWith(
      'auth:otp:lock:dev@example.com',
      '1',
      expect.any(Number),
    );
    expect(redisService.del).toHaveBeenCalledWith('auth:otp:verify:fail:dev@example.com');
  });
});
