import { BadRequestException } from '@nestjs/common';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { PasswordResetTokensRepository } from '../repositories/password-reset-tokens.repository.interface';
import { SessionsRepository } from '@modules/sessions/repositories/sessions.repository.interface';
import { CryptoUtil } from '@shared/utils/crypto.util';

describe('ResetPasswordUseCase', () => {
  let users: jest.Mocked<UsersRepository>;
  let tokens: jest.Mocked<PasswordResetTokensRepository>;
  let sessions: jest.Mocked<SessionsRepository>;
  let useCase: ResetPasswordUseCase;

  beforeEach(() => {
    users = {
      update: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    tokens = {
      findByTokenHash: jest.fn(),
      markUsed: jest.fn(),
    } as unknown as jest.Mocked<PasswordResetTokensRepository>;
    sessions = {
      revokeAllForUser: jest.fn(),
    } as unknown as jest.Mocked<SessionsRepository>;
    useCase = new ResetPasswordUseCase(users, tokens, sessions);
  });

  it('throws BadRequest when token is unknown', async () => {
    tokens.findByTokenHash.mockResolvedValue(null);
    await expect(
      useCase.execute({ token: 'bad', newPassword: 'StrongPass@123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest when token has been used', async () => {
    tokens.findByTokenHash.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      tokenHash: 'h',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
      createdAt: new Date(),
    });
    await expect(
      useCase.execute({ token: 'used', newPassword: 'StrongPass@123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest when token expired', async () => {
    tokens.findByTokenHash.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      tokenHash: 'h',
      expiresAt: new Date(Date.now() - 1_000),
      usedAt: null,
      createdAt: new Date(),
    });
    await expect(
      useCase.execute({ token: 'old', newPassword: 'StrongPass@123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hashes new password, marks token used, revokes sessions', async () => {
    tokens.findByTokenHash.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      tokenHash: CryptoUtil.hashToken('raw'),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    });
    await useCase.execute({ token: 'raw', newPassword: 'StrongPass@123' });
    const updateArg = users.update.mock.calls[0][1];
    expect(updateArg.passwordHash).toBeDefined();
    await expect(
      CryptoUtil.verifyPassword(updateArg.passwordHash!, 'StrongPass@123'),
    ).resolves.toBe(true);
    expect(tokens.markUsed).toHaveBeenCalledWith('t1');
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith('u1');
  });
});
