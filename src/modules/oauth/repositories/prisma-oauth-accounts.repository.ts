import { Injectable } from '@nestjs/common';
import { OAuthAccount as PrismaOAuthAccount } from '@prisma/client';
import { PrismaService } from '@shared/database/prisma.service';
import { OAuthAccount } from '../entities/oauth-account.entity';
import {
  CreateOAuthAccountData,
  OAuthAccountsRepository,
} from './oauth-accounts.repository.interface';

@Injectable()
export class PrismaOAuthAccountsRepository extends OAuthAccountsRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(data: CreateOAuthAccountData): Promise<OAuthAccount> {
    const account = await this.prisma.oAuthAccount.create({ data });
    return this.toEntity(account);
  }

  async findByProviderIdentity(
    provider: string,
    providerId: string,
  ): Promise<OAuthAccount | null> {
    const account = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider, providerId } },
    });
    return account ? this.toEntity(account) : null;
  }

  async findByUserId(userId: string): Promise<OAuthAccount[]> {
    const accounts = await this.prisma.oAuthAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return accounts.map((a) => this.toEntity(a));
  }

  async findByIdAndUser(
    id: string,
    userId: string,
  ): Promise<OAuthAccount | null> {
    const account = await this.prisma.oAuthAccount.findFirst({
      where: { id, userId },
    });
    return account ? this.toEntity(account) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.oAuthAccount.delete({ where: { id } });
  }

  private toEntity(raw: PrismaOAuthAccount): OAuthAccount {
    return {
      id: raw.id,
      provider: raw.provider,
      providerId: raw.providerId,
      userId: raw.userId,
      createdAt: raw.createdAt,
    };
  }
}
