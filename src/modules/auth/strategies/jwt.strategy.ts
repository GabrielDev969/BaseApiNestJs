import { Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { env } from 'src/config/env.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_ACCESS_PUBLIC_KEY,
      algorithms: ['RS256'],
    });
  }

  validate(payload: { sub: string; workspaceId?: string }) {
    return { id: payload.sub, workspaceId: payload.workspaceId };
  }
}
