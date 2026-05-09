import { Injectable } from '@nestjs/common';
import { PermissionsRepository } from './permissions.repository.interface';
import { Permission } from '../entities/permission.entity';
import { PrismaService } from '@shared/database/prisma.service';
import { Permission as PermissionPrisma } from '@prisma/client';
import { Cacheable } from '@shared/cache/cacheable.decorator';
import { CACHE_NS, CACHE_TTL } from '@shared/cache/cache.constants';

@Injectable()
export class PrismaPermissionsRepository extends PermissionsRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  @Cacheable({
    namespace: CACHE_NS.permissions,
    key: () => 'all',
    ttlMs: CACHE_TTL.oneDay,
  })
  async findAll(): Promise<Permission[]> {
    const perms = await this.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
    return perms.map((p) => this.toEntity(p));
  }

  async findByKey(key: string): Promise<Permission | null> {
    const perm = await this.prisma.permission.findUnique({ where: { key } });
    return perm ? this.toEntity(perm) : null;
  }

  async findManyByKeys(keys: string[]): Promise<Permission[]> {
    const perms = await this.prisma.permission.findMany({
      where: { key: { in: keys } },
    });
    return perms.map((p) => this.toEntity(p));
  }

  async findByCategory(category: string): Promise<Permission[]> {
    const perms = await this.prisma.permission.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });
    return perms.map((p) => this.toEntity(p));
  }

  private toEntity(raw: PermissionPrisma): Permission {
    return {
      id: raw.id,
      key: raw.key,
      description: raw.description,
      category: raw.category,
    };
  }
}
