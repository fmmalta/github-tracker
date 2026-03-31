import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController security behavior', () => {
  const authService = {
    signup: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
  };

  function buildController(trustProxy = false) {
    const configService = {
      get: jest.fn((key: string, fallback: string) => {
        if (key === 'TRUST_PROXY') return trustProxy ? 'true' : 'false';
        return fallback;
      }),
    };
    return new AuthController(authService as any, configService as any);
  }

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = buildController(false);
  });

  it('login sets refresh cookie as HttpOnly and returns only access token', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const req = {
      headers: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as any;
    const cookie = jest.fn();
    const res = { cookie } as any;

    const out = await controller.login({ email: 'a@b.com', password: 'password123' } as any, req, res);

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

  it('refresh reads token from cookie and sets rotated token in new cookie', async () => {
    authService.refresh.mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' });

    const req = {
      headers: { cookie: 'refresh_token=old-rt' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as any;
    const cookie = jest.fn();
    const res = { cookie } as any;

    const out = await controller.refresh(req, res);

    expect(authService.refresh).toHaveBeenCalledWith('old-rt', '127.0.0.1');
    expect(out).toEqual({ accessToken: 'new-access' });
    expect(cookie).toHaveBeenCalledWith(
      'refresh_token',
      'new-refresh',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/api/v1/auth' }),
    );
  });

  it('refresh throws UnauthorizedException when cookie is absent', async () => {
    const req = { headers: {}, ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' } } as any;
    await expect(controller.refresh(req)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout clears cookies and calls authService.logout', async () => {
    authService.logout.mockResolvedValue(undefined);

    const req = {
      headers: { cookie: 'refresh_token=rt-to-revoke' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as any;
    const cookie = jest.fn();
    const res = { cookie } as any;

    const out = await controller.logout(req, res);

    expect(authService.logout).toHaveBeenCalledWith('rt-to-revoke');
    expect(out).toEqual({ message: 'Logged out successfully' });
    expect(cookie).toHaveBeenCalledWith('refresh_token', '', expect.objectContaining({ maxAge: 0 }));
    expect(cookie).toHaveBeenCalledWith('auth_present', '', expect.objectContaining({ maxAge: 0 }));
  });

  describe('getClientIp spoofing resistance', () => {
    it('ignores x-forwarded-for when TRUST_PROXY is false (default)', () => {
      controller = buildController(false);
      const req = {
        headers: { 'x-forwarded-for': '1.2.3.4' },
        ip: '192.168.1.1',
        socket: { remoteAddress: '192.168.1.1' },
      } as any;

      expect(controller.getClientIp(req)).toBe('192.168.1.1');
    });

    it('reads x-forwarded-for when TRUST_PROXY is true', () => {
      controller = buildController(true);
      const req = {
        headers: { 'x-forwarded-for': '203.0.113.50, 10.0.0.1' },
        ip: '10.0.0.1',
        socket: { remoteAddress: '10.0.0.1' },
      } as any;

      expect(controller.getClientIp(req)).toBe('203.0.113.50');
    });

    it('falls back to req.ip when TRUST_PROXY is true but no forwarded header', () => {
      controller = buildController(true);
      const req = {
        headers: {},
        ip: '10.0.0.5',
        socket: { remoteAddress: '10.0.0.5' },
      } as any;

      expect(controller.getClientIp(req)).toBe('10.0.0.5');
    });

    it('falls back to socket.remoteAddress when req.ip is undefined', () => {
      controller = buildController(false);
      const req = {
        headers: {},
        ip: undefined,
        socket: { remoteAddress: '172.16.0.1' },
      } as any;

      expect(controller.getClientIp(req)).toBe('172.16.0.1');
    });
  });
});
