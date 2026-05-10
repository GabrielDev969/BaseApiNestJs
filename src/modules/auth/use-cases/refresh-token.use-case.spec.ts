import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { TokenService } from '../services/token.service';
import { SessionsRepository } from '@modules/sessions/repositories/sessions.repository.interface';
import { CreateSessionUseCase } from '@modules/sessions/use-cases/create-session.use-case';
import { CryptoUtil } from '@shared/utils/crypto.util';

describe('RefreshTokenUseCase', () => {
  let tokens: jest.Mocked<TokenService>;
  let sessions: jest.Mocked<SessionsRepository>;
  let createSession: jest.Mocked<CreateSessionUseCase>;
  let useCase: RefreshTokenUseCase;

  beforeEach(() => {
    tokens = {
      verifyRefreshToken: jest.fn(),
      signAccessToken: jest.fn().mockResolvedValue('new-access'),
      signRefreshToken: jest.fn().mockResolvedValue('new-refresh'),
    } as unknown as jest.Mocked<TokenService>;
    sessions = {
      findByTokenHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    } as unknown as jest.Mocked<SessionsRepository>;
    createSession = {
      execute: jest.fn().mockResolvedValue({ id: 's2' }),
    } as unknown as jest.Mocked<CreateSessionUseCase>;
    useCase = new RefreshTokenUseCase(tokens, sessions, createSession);
  });

  it('throws Unauthorized when token verification fails', async () => {
    tokens.verifyRefreshToken.mockRejectedValue(new Error('bad'));
    await expect(useCase.execute('rt')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('revokes all user sessions and throws when session is missing', async () => {
    tokens.verifyRefreshToken.mockResolvedValue({ sub: 'u1' });
    sessions.findByTokenHash.mockResolvedValue(null);
    await expect(useCase.execute('rt')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    // session is null so revokeAllForUser is NOT called
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('revokes all sessions for the user when token reuse is detected (revoked session)', async () => {
    tokens.verifyRefreshToken.mockResolvedValue({ sub: 'u1' });
    sessions.findByTokenHash.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000),
      userAgent: null,
      ipAddress: null,
    } as never);
    await expect(useCase.execute('rt')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith('u1');
  });

  it('revokes all sessions when the session is expired', async () => {
    tokens.verifyRefreshToken.mockResolvedValue({ sub: 'u1' });
    sessions.findByTokenHash.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      userAgent: null,
      ipAddress: null,
    } as never);
    await expect(useCase.execute('rt')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith('u1');
  });

  it('rotates tokens, revokes the old session and creates a new one', async () => {
    tokens.verifyRefreshToken.mockResolvedValue({ sub: 'u1' });
    sessions.findByTokenHash.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      userAgent: 'ua',
      ipAddress: '10.0.0.1',
    } as never);

    const result = await useCase.execute('rt-old');
    expect(sessions.findByTokenHash).toHaveBeenCalledWith(
      CryptoUtil.hashToken('rt-old'),
    );
    expect(sessions.revoke).toHaveBeenCalledWith('s1');
    expect(createSession.execute).toHaveBeenCalledWith({
      userId: 'u1',
      refreshToken: 'new-refresh',
      userAgent: 'ua',
      ipAddress: '10.0.0.1',
    });
    expect(result).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
  });
});
