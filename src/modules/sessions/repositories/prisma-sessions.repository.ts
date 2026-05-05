import { Injectable } from '@nestjs/common';
import {
  ISessionsRepository,
  CreateSessionData,
} from './sessions.repository.interface';
import { Session } from '../entities/session.entity';
import { PrismaService } from '@shared/database/prisma.service';
import { Session as SessionPrisma } from '@prisma/client';

@Injectable()
export class PrismaSessionsRepository implements ISessionsRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateSessionData): Promise<Session> {
    const session = await this.prisma.session.create({ data });
    return this.toEntity(session);
  }

  async findById(id: string): Promise<Session | null> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    return session ? this.toEntity(session) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
    });
    return session ? this.toEntity(session) : null;
  }

  async findActiveByUser(userId: string): Promise<Session[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
    });
    return sessions.map((s) => this.toEntity(s));
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(
    userId: string,
    exceptSessionId?: string,
  ): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId && { id: { not: exceptSessionId } }),
      },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: cutoff } },
    });
    return result.count;
  }

  private toEntity(raw: SessionPrisma): Session {
    return {
      id: raw.id,
      userId: raw.userId,
      refreshTokenHash: raw.refreshTokenHash,
      userAgent: raw.userAgent,
      ipAddress: raw.ipAddress,
      expiresAt: raw.expiresAt,
      revokedAt: raw.revokedAt,
      lastUsedAt: raw.lastUsedAt,
      createdAt: raw.createdAt,
    };
  }
}
