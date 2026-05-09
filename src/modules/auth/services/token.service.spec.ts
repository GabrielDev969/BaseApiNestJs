import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { env } from 'src/config/env.config';

describe('TokenService', () => {
  const jwt = new JwtService({});
  const service = new TokenService(jwt);

  it('signs an access token with the access secret and embedded payload', async () => {
    const token = await service.signAccessToken({
      id: 'u1',
      sub: 'u1',
      email: 'jane@example.com',
      sessionId: 's1',
      workspaceId: 'w1',
    });

    const payload = await jwt.verifyAsync<{
      id: string;
      sub: string;
      email: string;
      sessionId: string;
      workspaceId: string;
    }>(token, { secret: env.JWT_ACCESS_SECRET });

    expect(payload.id).toBe('u1');
    expect(payload.sub).toBe('u1');
    expect(payload.email).toBe('jane@example.com');
    expect(payload.sessionId).toBe('s1');
    expect(payload.workspaceId).toBe('w1');

    await expect(
      jwt.verifyAsync(token, { secret: env.JWT_REFRESH_SECRET }),
    ).rejects.toBeDefined();
  });

  it('signs and verifies a refresh token with a unique jti per call', async () => {
    const a = await service.signRefreshToken('u1');
    const b = await service.signRefreshToken('u1');

    expect(a).not.toBe(b);

    const payloadA = await service.verifyRefreshToken(a);
    const payloadB = await service.verifyRefreshToken(b);

    expect(payloadA.sub).toBe('u1');
    expect(payloadB.sub).toBe('u1');
    expect(payloadA.jti).toEqual(expect.any(String));
    expect(payloadA.jti).not.toBe(payloadB.jti);
  });

  it('round-trips a 2FA challenge token and rejects tokens with the wrong type marker', async () => {
    const token = await service.signChallengeToken('u1');

    await expect(service.verifyChallengeToken(token)).resolves.toBe('u1');

    const wrongType = await jwt.signAsync(
      { sub: 'u1', type: 'access' },
      { secret: env.JWT_ACCESS_SECRET, expiresIn: '5m' },
    );

    await expect(service.verifyChallengeToken(wrongType)).rejects.toThrow(
      'Invalid challenge token',
    );
  });
});
