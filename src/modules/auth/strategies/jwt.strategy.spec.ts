import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('maps payload.sub to id and forwards sessionId', () => {
    const strategy = new JwtStrategy();
    expect(strategy.validate({ sub: 'u1', sessionId: 's1' })).toEqual({
      id: 'u1',
      sessionId: 's1',
    });
  });
});
