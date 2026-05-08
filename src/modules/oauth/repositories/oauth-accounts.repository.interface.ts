import { OAuthAccount } from '../entities/oauth-account.entity';

export interface CreateOAuthAccountData {
  provider: string;
  providerId: string;
  userId: string;
}

export abstract class OAuthAccountsRepository {
  abstract create(data: CreateOAuthAccountData): Promise<OAuthAccount>;
  abstract findByProviderIdentity(
    provider: string,
    providerId: string,
  ): Promise<OAuthAccount | null>;
  abstract findByUserId(userId: string): Promise<OAuthAccount[]>;
  abstract findByIdAndUser(
    id: string,
    userId: string,
  ): Promise<OAuthAccount | null>;
  abstract delete(id: string): Promise<void>;
}
