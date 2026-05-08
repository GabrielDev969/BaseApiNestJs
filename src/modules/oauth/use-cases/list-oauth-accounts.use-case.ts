import { Injectable } from '@nestjs/common';
import { OAuthAccountsRepository } from '../repositories/oauth-accounts.repository.interface';

@Injectable()
export class ListOAuthAccountsUseCase {
  constructor(private accounts: OAuthAccountsRepository) {}

  async execute(userId: string) {
    const accounts = await this.accounts.findByUserId(userId);
    return accounts.map((a) => ({
      id: a.id,
      provider: a.provider,
      createdAt: a.createdAt,
    }));
  }
}
