import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController security behavior', () => {
  const authService = {
    signup: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
  };

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authService as any);
  });

  it('login sets refresh cookie as HttpOnly and returns only access token', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const req = {
      headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
      ip: '127.0.0.1',
    } as any;
    const cookie = jest.fn();
    const res = { cookie } as any;

    const out = await controller.login({ email: 'a@b.com', password: 'password123' } as any, req, res);

    expect(authService.login).toHaveBeenCalledWith('a@b.com', 'password123', '10.0.0.1');
    expect(out).toEqual({ accessToken: 'access-token' });
    expect(cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/api/v1/auth' }),
    );
    expect(cookie).toHaveBeenCalledWith(
      'auth_present',
      'true',
      expect.objectContaining({ httpOnly: false, sameSite: 'strict', path: '/' }),
    );
  });

  it('refresh uses cookie token fallback when body token is missing', async () => {
    authService.refresh.mockResolvedValue({ accessToken: 'new-access' });

    const req = {
      headers: { cookie: 'foo=bar; refresh_token=rt-cookie', 'x-forwarded-for': '198.51.100.10' },
      ip: '127.0.0.1',
    } as any;

    const out = await controller.refresh({} as any, req);

    expect(authService.refresh).toHaveBeenCalledWith('rt-cookie', '198.51.100.10');
    expect(out).toEqual({ accessToken: 'new-access' });
  });

  it('refresh throws UnauthorizedException when token absent in body and cookie', async () => {
    const req = { headers: {}, ip: '127.0.0.1' } as any;
    await expect(controller.refresh({} as any, req)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
