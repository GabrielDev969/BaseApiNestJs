import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('maps payload.sub to id and forwards workspaceId', () => {
    const strategy = new JwtStrategy();
    expect(strategy.validate({ sub: 'u1', workspaceId: 'w1' })).toEqual({
      id: 'u1',
      workspaceId: 'w1',
    });
  });

  it('returns id with undefined workspaceId when not present', () => {
    const strategy = new JwtStrategy();
    expect(strategy.validate({ sub: 'u1' })).toEqual({
      id: 'u1',
      workspaceId: undefined,
    });
  });
});
