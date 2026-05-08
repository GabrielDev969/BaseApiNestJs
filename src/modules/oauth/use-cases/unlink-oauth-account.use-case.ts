import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { AuditService } from '@modules/audit/services/audit.service';
import { OAuthAccountsRepository } from '../repositories/oauth-accounts.repository.interface';

@Injectable()
export class UnlinkOAuthAccountUseCase {
  constructor(
    private accounts: OAuthAccountsRepository,
    private users: UsersRepository,
    private audit: AuditService,
  ) {}

  async execute(userId: string, accountId: string): Promise<void> {
    const account = await this.accounts.findByIdAndUser(accountId, userId);
    if (!account) throw new NotFoundException('OAuth account not found');

    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const remaining = await this.accounts.findByUserId(userId);
    const isLastCredential = !user.passwordHash && remaining.length <= 1;
    if (isLastCredential) {
      throw new BadRequestException(
        'Cannot unlink the only sign-in method. Set a password first.',
      );
    }

    await this.accounts.delete(accountId);
    await this.audit.log({
      userId,
      action: 'oauth.account.unlinked',
      resource: 'OAuthAccount',
      resourceId: accountId,
      metadata: { provider: account.provider },
    });
  }
}
