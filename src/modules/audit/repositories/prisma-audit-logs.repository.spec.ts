import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/database/prisma.service';
import { PrismaAuditLogsRepository } from './prisma-audit-logs.repository';

type AuditLogClient = {
  create: jest.Mock;
  findMany: jest.Mock;
  count: jest.Mock;
  deleteMany: jest.Mock;
};

type PrismaMock = { auditLog: AuditLogClient };

describe('PrismaAuditLogsRepository', () => {
  let prisma: PrismaMock;
  let repo: PrismaAuditLogsRepository;

  const baseRow = {
    id: 'log1',
    userId: 'u1',
    workspaceId: 'w1',
    action: 'user.login',
    resource: 'user',
    resourceId: 'u1',
    metadata: { ip: '1.2.3.4' },
    ipAddress: '1.2.3.4',
    userAgent: 'jest',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    repo = new PrismaAuditLogsRepository(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('persists the log with metadata as-is', async () => {
      prisma.auditLog.create.mockResolvedValue(baseRow);

      const result = await repo.create({
        userId: 'u1',
        workspaceId: 'w1',
        action: 'user.login',
        resource: 'user',
        resourceId: 'u1',
        metadata: { ip: '1.2.3.4' },
        ipAddress: '1.2.3.4',
        userAgent: 'jest',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'user.login',
          metadata: { ip: '1.2.3.4' },
        }),
      });
      expect(result).toEqual({
        id: 'log1',
        userId: 'u1',
        workspaceId: 'w1',
        action: 'user.login',
        resource: 'user',
        resourceId: 'u1',
        metadata: { ip: '1.2.3.4' },
        ipAddress: '1.2.3.4',
        userAgent: 'jest',
        createdAt: baseRow.createdAt,
      });
    });

    it('coerces missing metadata to Prisma.JsonNull', async () => {
      prisma.auditLog.create.mockResolvedValue({
        ...baseRow,
        metadata: null,
      });

      await repo.create({ action: 'user.login' });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ metadata: Prisma.JsonNull }),
      });
    });
  });

  describe('findMany', () => {
    it('returns paginated items with mapping and base where clause', async () => {
      prisma.auditLog.findMany.mockResolvedValue([baseRow]);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await repo.findMany({
        workspaceId: 'w1',
        page: 1,
        limit: 10,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 'w1' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: { workspaceId: 'w1' },
      });
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('log1');
    });

    it('applies userId, date range and exact action filters with paging', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      const from = new Date('2026-01-01');
      const to = new Date('2026-02-01');
      await repo.findMany({
        workspaceId: 'w1',
        userId: 'u1',
        action: 'user.login',
        from,
        to,
        page: 3,
        limit: 5,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: 'w1',
          userId: 'u1',
          createdAt: { gte: from, lte: to },
          action: 'user.login',
        },
        skip: 10,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('uses startsWith filter when action ends with wildcard', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await repo.findMany({
        workspaceId: 'w1',
        action: 'user.*',
        page: 1,
        limit: 10,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { startsWith: 'user.' },
          }),
        }),
      );
    });

    it('only sets the gte clause when only from is provided', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      const from = new Date('2026-03-01');
      await repo.findMany({
        workspaceId: 'w1',
        from,
        page: 1,
        limit: 10,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: from },
          }),
        }),
      );
    });

    it('only sets the lte clause when only to is provided', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      const to = new Date('2026-04-01');
      await repo.findMany({
        workspaceId: 'w1',
        to,
        page: 1,
        limit: 10,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lte: to },
          }),
        }),
      );
    });
  });

  describe('deleteOlderThan', () => {
    it('deletes rows older than cutoff and returns the count', async () => {
      prisma.auditLog.deleteMany.mockResolvedValue({ count: 12 });
      const cutoff = new Date('2025-05-20');
      const deleted = await repo.deleteOlderThan(cutoff);
      expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: { createdAt: { lt: cutoff } },
      });
      expect(deleted).toBe(12);
    });
  });
});
