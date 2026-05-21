import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { SessionsRepository } from '@modules/sessions/repositories/sessions.repository.interface';
import type { AccessTokenPayload } from '../services/token.service';
import { JwtKeyResolverService } from '../services/jwt-key-resolver.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private sessions: SessionsRepository,
    resolver: JwtKeyResolverService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKeyProvider: (
        _request: unknown,
        rawJwtToken: string,
        done: (err: Error | null, secret?: string) => void,
      ) => {
        try {
          const pem = resolver.publicKeyFor(resolver.kidFromToken(rawJwtToken));
          done(null, pem);
        } catch (err) {
          done(err as Error);
        }
      },
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
