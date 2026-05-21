import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { JwtKeyResolverService } from '../services/jwt-key-resolver.service';
import { SessionsRepository } from '@modules/sessions/repositories/sessions.repository.interface';
import { Session } from '@modules/sessions/entities/session.entity';

const baseSession = (overrides: Partial<Session> = {}): Session => ({
  id: 's1',
  userId: 'u1',
  refreshTokenHash: 'h',
  userAgent: null,
  ipAddress: null,
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null,
  lastUsedAt: new Date(),
  createdAt: new Date(),
  ...overrides,
});

describe('JwtStrategy', () => {
  let sessions: jest.Mocked<SessionsRepository>;
  let strategy: JwtStrategy;
  const resolver = new JwtKeyResolverService();

  beforeEach(() => {
    sessions = {
      create: jest.fn(),
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findActiveByUser: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
      deleteExpired: jest.fn(),
    };
    strategy = new JwtStrategy(sessions, resolver);
  });

  it('maps sub to id and forwards sessionId when session is active', async () => {
    sessions.findById.mockResolvedValue(baseSession());
    expect(await strategy.validate({ sub: 'u1', sessionId: 's1' })).toEqual({
      id: 'u1',
      sessionId: 's1',
    });
    expect(sessions.findById).toHaveBeenCalledWith('s1');
  });

  it('rejects when session does not exist', async () => {
    sessions.findById.mockResolvedValue(null);
    await expect(
      strategy.validate({ sub: 'u1', sessionId: 's-missing' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when session is revoked', async () => {
    sessions.findById.mockResolvedValue(baseSession({ revokedAt: new Date() }));
    await expect(
      strategy.validate({ sub: 'u1', sessionId: 's1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when session is expired', async () => {
    sessions.findById.mockResolvedValue(
      baseSession({ expiresAt: new Date(Date.now() - 60_000) }),
    );
    await expect(
      strategy.validate({ sub: 'u1', sessionId: 's1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
