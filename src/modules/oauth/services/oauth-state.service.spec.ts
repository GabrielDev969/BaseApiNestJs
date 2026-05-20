import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { OAuthStateService } from './oauth-state.service';
import { env } from 'src/config/env.config';

describe('OAuthStateService', () => {
  const jwt = new JwtService({});
  const service = new OAuthStateService(jwt);

  it('round-trips a state token and exposes the raw nonce', async () => {
    const { state, nonce } = await service.sign({
      provider: 'google',
      intent: 'login',
      redirectUri: 'http://app.example.com/callback',
    });

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
        privateKey: env.JWT_ACCESS_PRIVATE_KEY,
        expiresIn: '5m',
        algorithm: 'RS256',
      },
    );

    await expect(service.verify(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
