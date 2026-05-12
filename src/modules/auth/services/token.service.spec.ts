import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { env } from 'src/config/env.config';

describe('TokenService', () => {
  const jwt = new JwtService({});
  const service = new TokenService(jwt);

  it('signs an access token (RS256) with sub and sessionId, verifiable with the public key', async () => {
    const token = await service.signAccessToken({
      userId: 'u1',
      sessionId: 's1',
    });

    const payload = await jwt.verifyAsync<{ sub: string; sessionId: string }>(
      token,
      {
        publicKey: env.JWT_ACCESS_PUBLIC_KEY,
        algorithms: ['RS256'],
      },
    );

    expect(payload.sub).toBe('u1');
    expect(payload.sessionId).toBe('s1');
  });

  it('round-trips a 2FA challenge token and rejects tokens with the wrong type marker', async () => {
    const token = await service.signChallengeToken('u1');

    await expect(service.verifyChallengeToken(token)).resolves.toBe('u1');

    const wrongType = await jwt.signAsync(
      { sub: 'u1', type: 'access' },
      {
        privateKey: env.JWT_ACCESS_PRIVATE_KEY,
        expiresIn: '5m',
        algorithm: 'RS256',
      },
    );

    await expect(service.verifyChallengeToken(wrongType)).rejects.toThrow(
      'Invalid challenge token',
    );
  });
});
