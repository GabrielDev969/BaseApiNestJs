import { Injectable, Inject } from '@nestjs/common';
import { SESSIONS_REPOSITORY } from '../repositories/sessions.repository.interface';
import type { ISessionsRepository } from '../repositories/sessions.repository.interface';
import { CryptoUtil } from '@shared/utils/crypto.util';

interface CreateSessionInput {
  userId: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class CreateSessionUseCase {
  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private sessions: ISessionsRepository,
  ) {}

  async execute(input: CreateSessionInput) {
    const refreshTokenHash = CryptoUtil.hashToken(input.refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return this.sessions.create({
      userId: input.userId,
      refreshTokenHash,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      expiresAt,
    });
  }
}
