import { Injectable } from '@nestjs/common';
import {
  AuditLogsRepository,
  CreateAuditLogData,
  FindAuditLogsParams,
  FindAuditLogsResult,
} from './audit-logs.repository.interface';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditLog as PrismaAuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '@shared/database/prisma.service';

@Injectable()
export class PrismaAuditLogsRepository extends AuditLogsRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(data: CreateAuditLogData): Promise<AuditLog> {
    const log = await this.prisma.auditLog.create({
      data: {
        ...data,
        metadata: data.metadata ?? Prisma.JsonNull,
      },
    });
    return this.toEntity(log);
  }

  async findMany(params: FindAuditLogsParams): Promise<FindAuditLogsResult> {
    const where: Prisma.AuditLogWhereInput = {
      workspaceId: params.workspaceId,
    };

    if (params.userId) where.userId = params.userId;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from)
        (where.createdAt as Prisma.DateTimeFilter).gte = params.from;
      if (params.to) (where.createdAt as Prisma.DateTimeFilter).lte = params.to;
    }
    if (params.action) {
      if (params.action.endsWith('*')) {
        where.action = { startsWith: params.action.slice(0, -1) };
      } else {
        where.action = params.action;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((l) => this.toEntity(l)),
      total,
    };
  }

  async deleteOlderThan(cutoff: Date): Promise<number> {
    const result = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  }

  private toEntity(raw: PrismaAuditLog): AuditLog {
    return {
      id: raw.id,
      userId: raw.userId,
      workspaceId: raw.workspaceId,
      action: raw.action,
      resource: raw.resource,
      resourceId: raw.resourceId,
      metadata: raw.metadata as Record<string, unknown> | null,
      ipAddress: raw.ipAddress,
      userAgent: raw.userAgent,
      createdAt: raw.createdAt,
    };
  }
}
