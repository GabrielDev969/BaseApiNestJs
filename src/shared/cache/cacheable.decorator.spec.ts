import { createCache } from 'cache-manager';
import type { Cache } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { Cacheable } from './cacheable.decorator';
import { InvalidateCache } from './invalidate-cache.decorator';

class TestRepo {
  callCount = 0;

  @Cacheable({
    namespace: 'test',
    key: (id: string) => `id:${id}`,
    ttlMs: 60_000,
  })
  async findById(id: string): Promise<{ id: string; n: number }> {
    await Promise.resolve();
    this.callCount++;
    return { id, n: this.callCount };
  }

  @InvalidateCache('test')
  async update(): Promise<void> {
    await Promise.resolve();
  }
}

describe('Cacheable + InvalidateCache decorators', () => {
  let svc: CacheService;
  let repo: TestRepo;

  beforeEach(() => {
    const cache = createCache();
    svc = new CacheService(cache);
    svc.onModuleInit();
    repo = new TestRepo();
  });

  afterEach(() => {
    (CacheService as unknown as { _instance: CacheService | null })._instance =
      null;
  });

  it('cache miss invokes the underlying method', async () => {
    const result = await repo.findById('a');
    expect(result).toEqual({ id: 'a', n: 1 });
    expect(repo.callCount).toBe(1);
  });

  it('cache hit returns cached value without invoking the method again', async () => {
    await repo.findById('a');
    const cached = await repo.findById('a');
    expect(cached).toEqual({ id: 'a', n: 1 });
    expect(repo.callCount).toBe(1);
  });

  it('different args produce different cache keys', async () => {
    await repo.findById('a');
    await repo.findById('b');
    expect(repo.callCount).toBe(2);
  });

  it('InvalidateCache bumps the namespace and forces a refetch', async () => {
    await repo.findById('a');
    await repo.update();
    const refetched = await repo.findById('a');
    expect(refetched).toEqual({ id: 'a', n: 2 });
    expect(repo.callCount).toBe(2);
  });

  it('decorator is a no-op when CacheService is not initialized', async () => {
    (CacheService as unknown as { _instance: CacheService | null })._instance =
      null;
    const result = await repo.findById('a');
    const result2 = await repo.findById('a');
    expect(result.n).toBe(1);
    expect(result2.n).toBe(2);
  });
});
