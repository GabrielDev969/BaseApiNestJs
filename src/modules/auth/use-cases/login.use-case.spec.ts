import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { LoginUseCase } from './login.use-case';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { TokenService } from '../services/token.service';
import { CreateSessionUseCase } from '@modules/sessions/use-cases/create-session.use-case';
import { MetricsService } from '@shared/metrics/metrics.service';
import { CryptoUtil } from '@shared/utils/crypto.util';
import type { User } from '@modules/users/entities/user.entity';

describe('LoginUseCase', () => {
  let users: jest.Mocked<UsersRepository>;
  let tokens: jest.Mocked<TokenService>;
  let createSession: jest.Mocked<CreateSessionUseCase>;
  let metrics: jest.Mocked<MetricsService>;
  let useCase: LoginUseCase;

  const passwordHash = '$argon2id$mock';

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    tokens = {
      signAccessToken: jest.fn().mockResolvedValue('access-token'),
      signChallengeToken: jest.fn().mockResolvedValue('challenge-token'),
    } as unknown as jest.Mocked<TokenService>;
    createSession = {
      execute: jest.fn().mockResolvedValue({ id: 's1' }),
    } as unknown as jest.Mocked<CreateSessionUseCase>;
    metrics = {
      incLoginAttempt: jest.fn(),
    } as unknown as jest.Mocked<MetricsService>;
    useCase = new LoginUseCase(users, tokens, createSession, metrics);
  });

  it('rejects unknown email and counts as failure', async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(
      useCase.execute({ email: 'a@b.c', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(metrics.incLoginAttempt).toHaveBeenCalledWith('failure');
  });

  it('rejects users with no passwordHash (OAuth-only) as failure', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      passwordHash: null,
    } as User);
    await expect(
      useCase.execute({ email: 'a@b.c', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(metrics.incLoginAttempt).toHaveBeenCalledWith('failure');
  });

  it('rejects bad password and counts as failure', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'u1',
      passwordHash,
    } as User);
    jest.spyOn(CryptoUtil, 'verifyPassword').mockResolvedValueOnce(false);
    await expect(
      useCase.execute({ email: 'a@b.c', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(metrics.incLoginAttempt).toHaveBeenCalledWith('failure');
  });

  it('throws Forbidden when email is not verified', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'u1',
      passwordHash,
      twoFactorEnabled: false,
      emailVerifiedAt: null,
    } as User);
    jest.spyOn(CryptoUtil, 'verifyPassword').mockResolvedValueOnce(true);
    await expect(
      useCase.execute({ email: 'a@b.c', password: 'right' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(metrics.incLoginAttempt).toHaveBeenCalledWith('failure');
  });

  it('returns 2FA challenge and counts as requires_2fa when twoFactorEnabled', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'u1',
      passwordHash,
      twoFactorEnabled: true,
      emailVerifiedAt: new Date(),
    } as User);
    jest.spyOn(CryptoUtil, 'verifyPassword').mockResolvedValueOnce(true);
    const result = await useCase.execute({ email: 'a@b.c', password: 'right' });
    expect(result).toEqual({ requires2FA: true, challenge: 'challenge-token' });
    expect(metrics.incLoginAttempt).toHaveBeenCalledWith('requires_2fa');
  });

  it('issues tokens and counts as success on happy path', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'u1',
      passwordHash,
      twoFactorEnabled: false,
      emailVerifiedAt: new Date(),
    } as User);
    jest.spyOn(CryptoUtil, 'verifyPassword').mockResolvedValueOnce(true);
    const result = await useCase.execute({
      email: 'a@b.c',
      password: 'right',
      userAgent: 'ua',
      ipAddress: '10.0.0.1',
    });
    if ('requires2FA' in result) throw new Error('expected tokens, got 2FA');
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toMatch(/^[0-9a-f]{128}$/);
    expect(metrics.incLoginAttempt).toHaveBeenCalledWith('success');
    expect(createSession.execute).toHaveBeenCalledWith({
      userId: 'u1',
      refreshToken: result.refreshToken,
      userAgent: 'ua',
      ipAddress: '10.0.0.1',
    });
  });

  it('issueTokens persists session and returns an opaque refresh token', async () => {
    const result = await useCase.issueTokens('u1', 'ua', '10.0.0.1');
    expect(tokens.signAccessToken).toHaveBeenCalledWith({
      sub: 'u1',
      id: 'u1',
    });
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toMatch(/^[0-9a-f]{128}$/);
    expect(createSession.execute).toHaveBeenCalledWith({
      userId: 'u1',
      refreshToken: result.refreshToken,
      userAgent: 'ua',
      ipAddress: '10.0.0.1',
    });
  });
});
