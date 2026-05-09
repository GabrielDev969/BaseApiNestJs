import { createCache } from 'cache-manager';
import type { Cache } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let svc: CacheService;

  beforeEach(() => {
    const cache = createCache();
    svc = new CacheService(cache);
    svc.onModuleInit();
  });

  afterEach(() => {
    (CacheService as unknown as { _instance: CacheService | null })._instance =
      null;
  });

  it('set/get round-trips a value', async () => {
    await svc.set('k', { v: 1 });
    expect(await svc.get<{ v: number }>('k')).toEqual({ v: 1 });
  });

  it('get returns null for missing keys', async () => {
    expect(await svc.get('missing')).toBeNull();
  });

  it('del removes a value', async () => {
    await svc.set('k', 1);
    await svc.del('k');
    expect(await svc.get('k')).toBeNull();
  });

  it('wrap returns cached value on second call without invoking fn', async () => {
    const fn = jest.fn().mockResolvedValue('value');
    expect(await svc.wrap('k', fn, 60_000)).toBe('value');
    expect(await svc.wrap('k', fn, 60_000)).toBe('value');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('wrap re-invokes fn when cached value is null', async () => {
    const fn = jest.fn().mockResolvedValue(null);
    await svc.wrap('k', fn, 60_000);
    await svc.wrap('k', fn, 60_000);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('getNamespaceVersion defaults to 1 when unset', async () => {
    expect(await svc.getNamespaceVersion('users')).toBe(1);
  });

  it('bumpNamespace increments the version', async () => {
    await svc.bumpNamespace('users');
    expect(await svc.getNamespaceVersion('users')).toBe(2);
    await svc.bumpNamespace('users');
    expect(await svc.getNamespaceVersion('users')).toBe(3);
  });

  it('buildKey embeds the current namespace version', async () => {
    expect(await svc.buildKey('users', 'id:123')).toBe('users:v1:id:123');
    await svc.bumpNamespace('users');
    expect(await svc.buildKey('users', 'id:123')).toBe('users:v2:id:123');
  });

  it('static instance points to the initialized service', () => {
    expect(CacheService.instance).toBe(svc);
  });
});
