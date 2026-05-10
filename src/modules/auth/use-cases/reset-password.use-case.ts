import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { PasswordResetTokensRepository } from '../repositories/password-reset-tokens.repository.interface';
import { SessionsRepository } from '@modules/sessions/repositories/sessions.repository.interface';
import { CryptoUtil } from '@shared/utils/crypto.util';

interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private users: UsersRepository,
    private tokens: PasswordResetTokensRepository,
    private sessions: SessionsRepository,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    const tokenHash = CryptoUtil.hashToken(input.token);
    const record = await this.tokens.findByTokenHash(tokenHash);
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await CryptoUtil.hashPassword(input.newPassword);
    await this.users.update(record.userId, { passwordHash });
    await this.tokens.markUsed(record.id);
    await this.sessions.revokeAllForUser(record.userId);
  }
}
