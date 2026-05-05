import { Injectable, Inject } from '@nestjs/common';
import { SESSIONS_REPOSITORY } from '../repositories/sessions.repository.interface';
import type { ISessionsRepository } from '../repositories/sessions.repository.interface';

@Injectable()
export class RevokeAllSessionsUseCase {
  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private sessions: ISessionsRepository,
  ) {}

  async execute(userId: string, exceptSessionId?: string) {
    await this.sessions.revokeAllForUser(userId, exceptSessionId);
  }
}
