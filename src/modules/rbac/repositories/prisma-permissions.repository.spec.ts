import { createCache } from 'cache-manager';
import type { Cache } from '@nestjs/cache-manager';
import { PrismaService } from '@shared/database/prisma.service';
import { CacheService } from '@shared/cache/cache.service';
import { PrismaPermissionsRepository } from './prisma-permissions.repository';

type PermissionClient = {
  findMany: jest.Mock;
  findUnique: jest.Mock;
};

type PrismaMock = { permission: PermissionClient };

describe('PrismaPermissionsRepository', () => {
  let prisma: PrismaMock;
  let repo: PrismaPermissionsRepository;

  const baseRow = {
    id: 'p1',
    key: 'user:read',
    description: 'Read users',
    category: 'user',
  };

  beforeEach(() => {
    prisma = {
      permission: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    repo = new PrismaPermissionsRepository(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    (CacheService as unknown as { _instance: CacheService | null })._instance =
      null;
  });

  describe('with cache enabled — exercises @Cacheable key arrows', () => {
    it('findAll runs through the cache wrapper on first call and serves from cache on second', async () => {
      const cache = createCache();
      const svc = new CacheService(cache);
      svc.onModuleInit();

      prisma.permission.findMany.mockResolvedValue([baseRow]);
      await repo.findAll();
      await repo.findAll();
      expect(prisma.permission.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('returns mapped permissions ordered by category then key', async () => {
      prisma.permission.findMany.mockResolvedValue([baseRow]);

      const result = await repo.findAll();

      expect(prisma.permission.findMany).toHaveBeenCalledWith({
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
      });
      expect(result).toEqual([baseRow]);
    });

    it('returns empty array when no permissions', async () => {
      prisma.permission.findMany.mockResolvedValue([]);
      expect(await repo.findAll()).toEqual([]);
    });
  });

  describe('findByKey', () => {
    it('returns mapped entity', async () => {
      prisma.permission.findUnique.mockResolvedValue(baseRow);
      const result = await repo.findByKey('user:read');
      expect(prisma.permission.findUnique).toHaveBeenCalledWith({
        where: { key: 'user:read' },
      });
      expect(result?.key).toBe('user:read');
    });

    it('returns null when not found', async () => {
      prisma.permission.findUnique.mockResolvedValue(null);
      expect(await repo.findByKey('missing')).toBeNull();
    });
  });

  describe('findManyByKeys', () => {
    it('returns mapped permissions for given keys', async () => {
      prisma.permission.findMany.mockResolvedValue([baseRow]);
      const result = await repo.findManyByKeys(['user:read']);
      expect(prisma.permission.findMany).toHaveBeenCalledWith({
        where: { key: { in: ['user:read'] } },
      });
      expect(result).toHaveLength(1);
    });

    it('returns empty array when none match', async () => {
      prisma.permission.findMany.mockResolvedValue([]);
      expect(await repo.findManyByKeys(['nope'])).toEqual([]);
    });
  });

  describe('findByCategory', () => {
    it('returns mapped permissions filtered by category', async () => {
      prisma.permission.findMany.mockResolvedValue([baseRow]);
      const result = await repo.findByCategory('user');
      expect(prisma.permission.findMany).toHaveBeenCalledWith({
        where: { category: 'user' },
        orderBy: { key: 'asc' },
      });
      expect(result[0].category).toBe('user');
    });

    it('returns empty array when none match', async () => {
      prisma.permission.findMany.mockResolvedValue([]);
      expect(await repo.findByCategory('admin')).toEqual([]);
    });
  });
});
