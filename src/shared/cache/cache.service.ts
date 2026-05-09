import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class CacheService implements OnModuleInit {
  private static _instance: CacheService | null = null;

  static get instance(): CacheService | null {
    return CacheService._instance;
  }

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  onModuleInit(): void {
    CacheService._instance = this;
  }

  async get<T>(key: string): Promise<T | null> {
    return (await this.cache.get<T>(key)) ?? null;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.cache.set(key, value, ttlMs);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }

  async wrap<T>(key: string, fn: () => Promise<T>, ttlMs: number): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== null && cached !== undefined) return cached;
    const value = await fn();
    await this.cache.set(key, value, ttlMs);
    return value;
  }

  async getNamespaceVersion(namespace: string): Promise<number> {
    const v = await this.cache.get<number>(this.versionKey(namespace));
    return typeof v === 'number' ? v : 1;
  }

  async bumpNamespace(namespace: string): Promise<void> {
    const next = (await this.getNamespaceVersion(namespace)) + 1;
    await this.cache.set(this.versionKey(namespace), next);
  }

  async buildKey(namespace: string, suffix: string): Promise<string> {
    const version = await this.getNamespaceVersion(namespace);
    return `${namespace}:v${version}:${suffix}`;
  }

  private versionKey(namespace: string): string {
    return `__nsver__:${namespace}`;
  }
}
