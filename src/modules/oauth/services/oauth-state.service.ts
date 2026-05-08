import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { env } from 'src/config/env.config';
import { OAuthProviderName } from '../constants/providers';

export type OAuthIntent = 'login' | 'link';

export interface OAuthStatePayload {
  type: 'oauth-state';
  provider: OAuthProviderName;
  intent: OAuthIntent;
  userId?: string;
  redirectUri?: string;
  nonce: string;
}

@Injectable()
export class OAuthStateService {
  constructor(private jwt: JwtService) {}

  sign(payload: Omit<OAuthStatePayload, 'type' | 'nonce'>): Promise<string> {
    return this.jwt.signAsync(
      {
        ...payload,
        type: 'oauth-state' as const,
        nonce: crypto.randomBytes(16).toString('hex'),
      },
      { secret: env.JWT_ACCESS_SECRET, expiresIn: '5m' },
    );
  }

  async verify(token: string): Promise<OAuthStatePayload> {
    try {
      const payload = await this.jwt.verifyAsync<OAuthStatePayload>(token, {
        secret: env.JWT_ACCESS_SECRET,
      });
      if (payload.type !== 'oauth-state') {
        throw new UnauthorizedException('Invalid OAuth state');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }
  }
}
