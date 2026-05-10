import { PrismaService } from '@shared/database/prisma.service';
import { PrismaOAuthAccountsRepository } from './prisma-oauth-accounts.repository';

type OAuthAccountClient = {
  create: jest.Mock;
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  delete: jest.Mock;
};

type PrismaMock = { oAuthAccount: OAuthAccountClient };

describe('PrismaOAuthAccountsRepository', () => {
  let prisma: PrismaMock;
  let repo: PrismaOAuthAccountsRepository;

  const baseRow = {
    id: 'oa1',
    provider: 'google',
    providerId: 'g-123',
    userId: 'u1',
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    prisma = {
      oAuthAccount: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
    };
    repo = new PrismaOAuthAccountsRepository(
      prisma as unknown as PrismaService,
    );
  });

  describe('create', () => {
    it('persists and returns mapped entity', async () => {
      prisma.oAuthAccount.create.mockResolvedValue(baseRow);
      const result = await repo.create({
        provider: 'google',
        providerId: 'g-123',
        userId: 'u1',
      });
      expect(prisma.oAuthAccount.create).toHaveBeenCalledWith({
        data: { provider: 'google', providerId: 'g-123', userId: 'u1' },
      });
      expect(result).toEqual({
        id: 'oa1',
        provider: 'google',
        providerId: 'g-123',
        userId: 'u1',
        createdAt: baseRow.createdAt,
      });
    });
  });

  describe('findByProviderIdentity', () => {
    it('looks up by composite unique key', async () => {
      prisma.oAuthAccount.findUnique.mockResolvedValue(baseRow);
      const result = await repo.findByProviderIdentity('google', 'g-123');
      expect(prisma.oAuthAccount.findUnique).toHaveBeenCalledWith({
        where: {
          provider_providerId: { provider: 'google', providerId: 'g-123' },
        },
      });
      expect(result?.id).toBe('oa1');
    });

    it('returns null when not found', async () => {
      prisma.oAuthAccount.findUnique.mockResolvedValue(null);
      expect(await repo.findByProviderIdentity('google', 'missing')).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('returns mapped accounts ordered by createdAt desc', async () => {
      prisma.oAuthAccount.findMany.mockResolvedValue([baseRow]);
      const result = await repo.findByUserId('u1');
      expect(prisma.oAuthAccount.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });

    it('returns empty array when none', async () => {
      prisma.oAuthAccount.findMany.mockResolvedValue([]);
      expect(await repo.findByUserId('u1')).toEqual([]);
    });
  });

  describe('findByIdAndUser', () => {
    it('filters by id and userId', async () => {
      prisma.oAuthAccount.findFirst.mockResolvedValue(baseRow);
      const result = await repo.findByIdAndUser('oa1', 'u1');
      expect(prisma.oAuthAccount.findFirst).toHaveBeenCalledWith({
        where: { id: 'oa1', userId: 'u1' },
      });
      expect(result?.id).toBe('oa1');
    });

    it('returns null when not found', async () => {
      prisma.oAuthAccount.findFirst.mockResolvedValue(null);
      expect(await repo.findByIdAndUser('oa1', 'u1')).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes by id', async () => {
      prisma.oAuthAccount.delete.mockResolvedValue(baseRow);
      await repo.delete('oa1');
      expect(prisma.oAuthAccount.delete).toHaveBeenCalledWith({
        where: { id: 'oa1' },
      });
    });
  });
});
