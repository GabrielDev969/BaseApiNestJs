import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { OAuthStateService } from './oauth-state.service';
import { env } from 'src/config/env.config';

describe('OAuthStateService', () => {
  const jwt = new JwtService({});
  const service = new OAuthStateService(jwt);

  it('round-trips a state token and verifies it', async () => {
    const token = await service.sign({
      provider: 'google',
      intent: 'login',
      redirectUri: 'http://app.example.com/callback',
    });

    const payload = await service.verify(token);

    expect(payload.provider).toBe('google');
    expect(payload.intent).toBe('login');
    expect(payload.redirectUri).toBe('http://app.example.com/callback');
    expect(payload.type).toBe('oauth-state');
    expect(payload.nonce).toEqual(expect.any(String));
  });

  it('emits a different nonce on each sign', async () => {
    const a = await service.sign({ provider: 'google', intent: 'login' });
    const b = await service.sign({ provider: 'google', intent: 'login' });

    expect(a).not.toBe(b);
    expect((await service.verify(a)).nonce).not.toBe(
      (await service.verify(b)).nonce,
    );
  });

  it('rejects a tampered token', async () => {
    const token = await service.sign({ provider: 'google', intent: 'login' });
    const tampered = `${token}garbage`;

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
