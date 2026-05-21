import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { OAuthStateService } from './oauth-state.service';
import { JwtKeyResolverService } from '@modules/auth/services/jwt-key-resolver.service';

function decodeHeader(token: string): Record<string, unknown> {
  return JSON.parse(
    Buffer.from(token.split('.')[0], 'base64url').toString('utf8'),
  );
}

describe('OAuthStateService', () => {
  const jwt = new JwtService({});
  const resolver = new JwtKeyResolverService();
  const service = new OAuthStateService(jwt, resolver);

  it('round-trips a state token (kid set in header) and exposes the raw nonce', async () => {
    const { state, nonce } = await service.sign({
      provider: 'google',
      intent: 'login',
      redirectUri: 'http://app.example.com/callback',
    });

    expect(decodeHeader(state).kid).toBe(resolver.currentKid);

    const payload = await service.verify(state);

    expect(payload.provider).toBe('google');
    expect(payload.intent).toBe('login');
    expect(payload.redirectUri).toBe('http://app.example.com/callback');
    expect(payload.type).toBe('oauth-state');
    expect(payload.nonce).toBe(nonce);
    expect(nonce).toMatch(/^[0-9a-f]{32}$/);
  });

  it('emits a different nonce on each sign', async () => {
    const a = await service.sign({ provider: 'google', intent: 'login' });
    const b = await service.sign({ provider: 'google', intent: 'login' });

    expect(a.state).not.toBe(b.state);
    expect(a.nonce).not.toBe(b.nonce);
  });

  it('rejects a tampered token', async () => {
    const { state } = await service.sign({
      provider: 'google',
      intent: 'login',
    });
    const tampered = `${state}garbage`;

    await expect(service.verify(tampered)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a JWT with the wrong type marker', async () => {
    const token = await jwt.signAsync(
      {
        provider: 'google',
        intent: 'login',
        type: 'something-else',
        nonce: 'x',
      },
      {
        privateKey: resolver.currentPrivateKey,
        keyid: resolver.currentKid,
        expiresIn: '5m',
        algorithm: 'RS256',
      },
    );

    await expect(service.verify(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with an unknown kid', async () => {
    const token = await jwt.signAsync(
      {
        provider: 'google',
        intent: 'login',
        type: 'oauth-state',
        nonce: 'x',
      },
      {
        privateKey: resolver.currentPrivateKey,
        keyid: 'not-a-real-kid',
        expiresIn: '5m',
        algorithm: 'RS256',
      },
    );

    await expect(service.verify(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
