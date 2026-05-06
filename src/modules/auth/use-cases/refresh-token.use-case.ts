import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { TokenService } from '../services/token.service';

import { CryptoUtil } from '@shared/utils/crypto.util';
import { CreateSessionUseCase } from '@modules/sessions/use-cases/create-session.use-case';
import type { ISessionsRepository } from '@modules/sessions/repositories/sessions.repository.interface';
import { SESSIONS_REPOSITORY } from '@modules/sessions/repositories/sessions.repository.interface';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private tokens: TokenService,
    @Inject(SESSIONS_REPOSITORY)
    private sessions: ISessionsRepository,
    private createSession: CreateSessionUseCase,
  ) {}

  async execute(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = (await this.tokens.verifyRefreshToken(refreshToken)) as {
        sub: string;
      };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const tokenHash = CryptoUtil.hashToken(refreshToken);
    const session = await this.sessions.findByTokenHash(tokenHash);

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      if (session?.userId) {
        await this.sessions.revokeAllForUser(session.userId);
      }
      throw new UnauthorizedException('Invalid session');
    }

    await this.sessions.revoke(session.id);

    const newAccess = await this.tokens.signAccessToken({
      sub: payload.sub,
      id: payload.sub,
    });
    const newRefresh = await this.tokens.signRefreshToken(payload.sub);

    await this.createSession.execute({
      userId: payload.sub,
      refreshToken: newRefresh,
      userAgent: session.userAgent ?? undefined,
      ipAddress: session.ipAddress ?? undefined,
    });

    return { accessToken: newAccess, refreshToken: newRefresh };
  }
}
