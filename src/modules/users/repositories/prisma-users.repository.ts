import { Injectable } from '@nestjs/common';
import {
  IUsersRepository,
  CreateUserData,
  FindManyByWorkspaceParams,
  FindManyResult,
} from './users.repository.interface';
import { User } from '../entities/user.entity';
import { PrismaService } from '@shared/database/prisma.service';
import { User as PrismaUser } from '@prisma/client';

@Injectable()
export class PrismaUsersRepository implements IUsersRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<User> {
    const user = await this.prisma.user.create({ data });
    return this.toEntity(user);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    return user ? this.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    return user ? this.toEntity(user) : null;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.prisma.user.update({ where: { id }, data });
    return this.toEntity(user);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findByIdInWorkspace(
    id: string,
    workspaceId: string,
  ): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
        memberships: { some: { workspaceId } },
      },
    });
    return user ? this.toEntity(user) : null;
  }

  async findManyByWorkspace(
    params: FindManyByWorkspaceParams,
  ): Promise<FindManyResult> {
    const where = {
      deletedAt: null,
      memberships: { some: { workspaceId: params.workspaceId } },
      ...(params.search && {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' as const } },
          { email: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => this.toEntity(u)),
      total,
    };
  }

  private toEntity(raw: PrismaUser): User {
    return {
      id: raw.id,
      email: raw.email,
      name: raw.name,
      passwordHash: raw.passwordHash,
      twoFactorEnabled: raw.twoFactorEnabled,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    };
  }
}
