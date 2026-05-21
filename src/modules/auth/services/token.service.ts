import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { env } from 'src/config/env.config';
import { JwtKeyResolverService } from './jwt-key-resolver.service';

export interface AccessTokenPayload {
  id: string;
  sessionId: string;
}

@Injectable()
export class TokenService {
  constructor(
    private jwt: JwtService,
    private resolver: JwtKeyResolverService,
  ) {}

  signAccessToken(input: {
    userId: string;
    sessionId: string;
  }): Promise<string> {
    return this.jwt.signAsync(
      { sub: input.userId, sessionId: input.sessionId },
      {
        privateKey: this.resolver.currentPrivateKey,
        keyid: this.resolver.currentKid,
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        algorithm: 'RS256',
      },
    );
  }

  signChallengeToken(userId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, type: '2fa-challenge' },
      {
        privateKey: this.resolver.currentPrivateKey,
        keyid: this.resolver.currentKid,
        expiresIn: '5m',
        algorithm: 'RS256',
      },
    );
  }

  async verifyChallengeToken(token: string): Promise<string> {
    const publicKey = this.resolver.publicKeyFor(
      this.resolver.kidFromToken(token),
    );
    const payload = await this.jwt.verifyAsync<{ sub: string; type: string }>(
      token,
      {
        publicKey,
        algorithms: ['RS256'],
      },
    );
    if (payload.type !== '2fa-challenge') {
      throw new Error('Invalid challenge token');
    }
    return payload.sub;
  }
}
