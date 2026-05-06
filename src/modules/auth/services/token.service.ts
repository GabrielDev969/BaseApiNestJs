import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { env } from 'src/config/env.config';

export interface AccessTokenPayload {
  id: string;
  sessionId?: string;
  email?: string;
  sub: string;
  workspaceId?: string;
}

@Injectable()
export class TokenService {
  constructor(private jwt: JwtService) {}

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    });
  }

  async signRefreshToken(userId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId },
      {
        secret: env.JWT_REFRESH_SECRET,
        expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      },
    );
  }

  verifyRefreshToken(token: string) {
    return this.jwt.verifyAsync(token, {
      secret: env.JWT_REFRESH_SECRET,
    });
  }

  signChallengeToken(userId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, type: '2fa-challenge' },
      { secret: env.JWT_ACCESS_SECRET, expiresIn: '5m' },
    );
  }

  async verifyChallengeToken(token: string): Promise<string> {
    const payload = await this.jwt.verifyAsync<{ sub: string; type: string }>(
      token,
      { secret: env.JWT_ACCESS_SECRET },
    );
    if (payload.type !== '2fa-challenge') {
      throw new Error('Invalid challenge token');
    }
    return payload.sub;
  }
}
