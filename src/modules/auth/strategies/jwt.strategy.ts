import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { env } from 'src/config/env.config';
import { SessionsRepository } from '@modules/sessions/repositories/sessions.repository.interface';
import type { AccessTokenPayload } from '../services/token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private sessions: SessionsRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_ACCESS_PUBLIC_KEY,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: {
    sub: string;
    sessionId: string;
  }): Promise<AccessTokenPayload> {
    const session = await this.sessions.findById(payload.sessionId);
    if (
      !session ||
      session.revokedAt ||
      new Date(session.expiresAt).getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Session is no longer active');
    }
    return { id: payload.sub, sessionId: payload.sessionId };
  }
}
