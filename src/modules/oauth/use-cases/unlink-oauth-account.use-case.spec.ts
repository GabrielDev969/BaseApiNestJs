import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UnlinkOAuthAccountUseCase } from './unlink-oauth-account.use-case';
import { OAuthAccountsRepository } from '../repositories/oauth-accounts.repository.interface';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { AuditService } from '@modules/audit/services/audit.service';
import { User } from '@modules/users/entities/user.entity';
import { OAuthAccount } from '../entities/oauth-account.entity';

function setup() {
  const accounts = {
    findByIdAndUser: jest.fn(),
    findByUserId: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    findByProviderIdentity: jest.fn(),
    create: jest.fn(),
  } as unknown as jest.Mocked<OAuthAccountsRepository>;
  const users = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    findByIdInWorkspace: jest.fn(),
    findManyByWorkspace: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;
  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AuditService>;

  return {
    useCase: new UnlinkOAuthAccountUseCase(accounts, users, audit),
    accounts,
    users,
    audit,
  };
}

const acc = (id: string): OAuthAccount => ({
  id,
  provider: 'google',
  providerId: 'gid',
  userId: 'u1',
  createdAt: new Date(),
});

describe('UnlinkOAuthAccountUseCase', () => {
  it('throws NotFound when the account does not belong to the user', async () => {
    const { useCase, accounts } = setup();
    accounts.findByIdAndUser.mockResolvedValue(null);

    await expect(useCase.execute('u1', 'a1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses to unlink the last credential when the user has no password', async () => {
    const { useCase, accounts, users, audit } = setup();
    accounts.findByIdAndUser.mockResolvedValue(acc('a1'));
    users.findById.mockResolvedValue({
      id: 'u1',
      passwordHash: null,
    } as User);
    accounts.findByUserId.mockResolvedValue([acc('a1')]);

    await expect(useCase.execute('u1', 'a1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(accounts.delete).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('unlinks when the user has a password (even if it is the only OAuth account)', async () => {
    const { useCase, accounts, users, audit } = setup();
    accounts.findByIdAndUser.mockResolvedValue(acc('a1'));
    users.findById.mockResolvedValue({
      id: 'u1',
      passwordHash: 'hashed',
    } as User);
    accounts.findByUserId.mockResolvedValue([acc('a1')]);

    await useCase.execute('u1', 'a1');

    expect(accounts.delete).toHaveBeenCalledWith('a1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        action: 'oauth.account.unlinked',
        resourceId: 'a1',
      }),
    );
  });

  it('unlinks when another OAuth account remains (even with no password)', async () => {
    const { useCase, accounts, users } = setup();
    accounts.findByIdAndUser.mockResolvedValue(acc('a1'));
    users.findById.mockResolvedValue({
      id: 'u1',
      passwordHash: null,
    } as User);
    accounts.findByUserId.mockResolvedValue([acc('a1'), acc('a2')]);

    await useCase.execute('u1', 'a1');

    expect(accounts.delete).toHaveBeenCalledWith('a1');
  });
});
