import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { JwtKeyResolverService } from '@modules/auth/services/jwt-key-resolver.service';
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
  constructor(
    private jwt: JwtService,
    private resolver: JwtKeyResolverService,
  ) {}

  async sign(
    payload: Omit<OAuthStatePayload, 'type' | 'nonce'>,
  ): Promise<{ state: string; nonce: string }> {
    const nonce = crypto.randomBytes(16).toString('hex');
    const state = await this.jwt.signAsync(
      {
        ...payload,
        type: 'oauth-state' as const,
        nonce,
      },
      {
        privateKey: this.resolver.currentPrivateKey,
        keyid: this.resolver.currentKid,
        expiresIn: '5m',
        algorithm: 'RS256',
      },
    );
    return { state, nonce };
  }

  async verify(token: string): Promise<OAuthStatePayload> {
    try {
      const publicKey = this.resolver.publicKeyFor(
        this.resolver.kidFromToken(token),
      );
      const payload = await this.jwt.verifyAsync<OAuthStatePayload>(token, {
        publicKey,
        algorithms: ['RS256'],
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
