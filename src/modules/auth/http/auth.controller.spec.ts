import type { Request } from 'express';
import { AuthController } from './auth.controller';
import { RegisterUseCase } from '../use-cases/register.use-case';
import { LoginUseCase } from '../use-cases/login.use-case';
import { RefreshTokenUseCase } from '../use-cases/refresh-token.use-case';
import { GetMeUseCase } from '../use-cases/get-me.use-case';
import { SetupTwoFactorUseCase } from '../use-cases/setup-2fa.use-case';
import { EnableTwoFactorUseCase } from '../use-cases/enable-2fa.use-case';
import { DisableTwoFactorUseCase } from '../use-cases/disable-2fa.use-case';
import { VerifyTwoFactorUseCase } from '../use-cases/verify-2fa.use-case';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

describe('AuthController', () => {
  let register: jest.Mocked<RegisterUseCase>;
  let login: jest.Mocked<LoginUseCase>;
  let refresh: jest.Mocked<RefreshTokenUseCase>;
  let getMe: jest.Mocked<GetMeUseCase>;
  let setup2fa: jest.Mocked<SetupTwoFactorUseCase>;
  let enable2fa: jest.Mocked<EnableTwoFactorUseCase>;
  let disable2fa: jest.Mocked<DisableTwoFactorUseCase>;
  let verify2fa: jest.Mocked<VerifyTwoFactorUseCase>;
  let controller: AuthController;

  beforeEach(() => {
    register = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RegisterUseCase>;
    login = { execute: jest.fn() } as unknown as jest.Mocked<LoginUseCase>;
    refresh = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RefreshTokenUseCase>;
    getMe = { execute: jest.fn() } as unknown as jest.Mocked<GetMeUseCase>;
    setup2fa = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<SetupTwoFactorUseCase>;
    enable2fa = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<EnableTwoFactorUseCase>;
    disable2fa = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DisableTwoFactorUseCase>;
    verify2fa = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<VerifyTwoFactorUseCase>;
    controller = new AuthController(
      register,
      login,
      refresh,
      getMe,
      setup2fa,
      enable2fa,
      disable2fa,
      verify2fa,
    );
  });

  it('registerEndpoint forwards the DTO to RegisterUseCase', async () => {
    const dto: RegisterDto = {
      email: 'jane@example.com',
      name: 'Jane',
      password: 'StrongPass@1234',
    };
    register.execute.mockResolvedValue({
      id: 'u1',
      email: dto.email,
      name: dto.name,
    });

    const result = await controller.registerEndpoint(dto);

    expect(register.execute).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'u1', email: dto.email, name: dto.name });
  });

  it('loginEndpoint forwards user-agent and IP from the request', async () => {
    const dto: LoginDto = {
      email: 'jane@example.com',
      password: 'StrongPass@1234',
    };
    const req = {
      headers: { 'user-agent': 'jest-runner' },
      ip: '10.0.0.1',
    } as unknown as Request;
    login.execute.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
    });

    await controller.loginEndpoint(dto, req);

    expect(login.execute).toHaveBeenCalledWith({
      ...dto,
      userAgent: 'jest-runner',
      ipAddress: '10.0.0.1',
    });
  });

  it('refreshEndpoint passes only the refresh token string to RefreshTokenUseCase', async () => {
    const dto: RefreshDto = { refreshToken: 'rt-1' };
    refresh.execute.mockResolvedValue({
      accessToken: 'a2',
      refreshToken: 'r2',
    });

    await controller.refreshEndpoint(dto);

    expect(refresh.execute).toHaveBeenCalledWith('rt-1');
  });

  it('meEndpoint forwards the user id', async () => {
    getMe.execute.mockResolvedValue({ id: 'u1' } as never);
    await controller.meEndpoint({ id: 'u1', sub: 'u1' });
    expect(getMe.execute).toHaveBeenCalledWith('u1');
  });

  it('setup2faEndpoint forwards the user id', async () => {
    setup2fa.execute.mockResolvedValue({
      secret: 'S',
      otpauthUrl: 'otpauth://x',
    });
    const result = await controller.setup2faEndpoint({ id: 'u1', sub: 'u1' });
    expect(setup2fa.execute).toHaveBeenCalledWith('u1');
    expect(result.secret).toBe('S');
  });

  it('enable2faEndpoint forwards user id and code', async () => {
    enable2fa.execute.mockResolvedValue({ recoveryCodes: ['code-1'] });
    await controller.enable2faEndpoint(
      { id: 'u1', sub: 'u1' },
      { code: '123456' },
    );
    expect(enable2fa.execute).toHaveBeenCalledWith('u1', '123456');
  });

  it('disable2faEndpoint forwards user id, password, and code', async () => {
    disable2fa.execute.mockResolvedValue(undefined);
    await controller.disable2faEndpoint(
      { id: 'u1', sub: 'u1' },
      { password: 'pw', code: '654321' },
    );
    expect(disable2fa.execute).toHaveBeenCalledWith('u1', 'pw', '654321');
  });

  it('verify2faEndpoint forwards challenge, code, ua and ip', async () => {
    verify2fa.execute.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
    });
    const req = {
      headers: { 'user-agent': 'jest' },
      ip: '10.0.0.1',
    } as unknown as Request;
    await controller.verify2faEndpoint(
      { challenge: 'ch', code: '111111' },
      req,
    );
    expect(verify2fa.execute).toHaveBeenCalledWith({
      challenge: 'ch',
      code: '111111',
      userAgent: 'jest',
      ipAddress: '10.0.0.1',
    });
  });
});
