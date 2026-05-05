import { Injectable, Inject } from '@nestjs/common';
import { SESSIONS_REPOSITORY } from '../repositories/sessions.repository.interface';
import type { ISessionsRepository } from '../repositories/sessions.repository.interface';

@Injectable()
export class ListSessionsUseCase {
  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private sessions: ISessionsRepository,
  ) {}

  async execute(userId: string, currentSessionId?: string) {
    const sessions = await this.sessions.findActiveByUser(userId);
    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      lastUsedAt: s.lastUsedAt,
      createdAt: s.createdAt,
      isCurrent: s.id === currentSessionId,
    }));
  }
}
