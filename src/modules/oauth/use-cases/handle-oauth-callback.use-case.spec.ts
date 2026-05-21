import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { HandleOAuthCallbackUseCase } from './handle-oauth-callback.use-case';
import { OAuthAccountsRepository } from '../repositories/oauth-accounts.repository.interface';
import { OAuthProviderRegistry } from '../services/oauth-provider-registry';
import { OAuthStateService } from '../services/oauth-state.service';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { LoginUseCase } from '@modules/auth/use-cases/login.use-case';
import { CreateWorkspaceUseCase } from '@modules/workspaces/use-cases/create-workspace.use-case';
import { AuditService } from '@modules/audit/services/audit.service';
import { User } from '@modules/users/entities/user.entity';
import { CryptoUtil } from '@shared/utils/crypto.util';

const validNonceHash = CryptoUtil.hashToken('n');

interface Mocks {
  registry: jest.Mocked<OAuthProviderRegistry>;
  state: jest.Mocked<OAuthStateService>;
  accounts: jest.Mocked<OAuthAccountsRepository>;
  users: jest.Mocked<UsersRepository>;
  login: jest.Mocked<LoginUseCase>;
  workspaces: jest.Mocked<CreateWorkspaceUseCase>;
  audit: jest.Mocked<AuditService>;
  exchange: jest.Mock;
}

function setup(): {
  useCase: HandleOAuthCallbackUseCase;
  mocks: Mocks;
} {
  const exchange = jest.fn();
  const registry = {
    get: jest.fn().mockReturnValue({ exchangeCodeForProfile: exchange }),
  } as unknown as jest.Mocked<OAuthProviderRegistry>;
  const state = {
    verify: jest.fn(),
  } as unknown as jest.Mocked<OAuthStateService>;
  const accounts = {
    findByProviderIdentity: jest.fn(),
    create: jest.fn(),
    findByUserId: jest.fn(),
    findByIdAndUser: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<OAuthAccountsRepository>;
  const users = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdInWorkspace: jest.fn(),
    findManyByWorkspace: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;
  const login = {
    issueTokens: jest.fn(),
  } as unknown as jest.Mocked<LoginUseCase>;
  const workspaces = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<CreateWorkspaceUseCase>;
  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AuditService>;

  const useCase = new HandleOAuthCallbackUseCase(
    registry,
    state,
    accounts,
    users,
    login,
    workspaces,
    audit,
  );

  return {
    useCase,
    mocks: {
      registry,
      state,
      accounts,
      users,
      login,
      workspaces,
      audit,
      exchange,
    },
  };
}

const profile = {
  providerId: 'gid-1',
  email: 'jane@example.com',
  name: 'Jane',
};

describe('HandleOAuthCallbackUseCase', () => {
  it('rejects when expectedNonceHash is missing (cookie absent)', async () => {
    const { useCase, mocks } = setup();
    mocks.state.verify.mockResolvedValue({
      type: 'oauth-state',
      provider: 'google',
      intent: 'login',
      nonce: 'n',
    });

    await expect(
      useCase.execute({ provider: 'google', code: 'c', state: 's' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(mocks.exchange).not.toHaveBeenCalled();
  });

  it('rejects when cookie hash does not match state.nonce', async () => {
    const { useCase, mocks } = setup();
    mocks.state.verify.mockResolvedValue({
      type: 'oauth-state',
      provider: 'google',
      intent: 'login',
      nonce: 'n',
    });

    await expect(
      useCase.execute({
        provider: 'google',
        code: 'c',
        state: 's',
        expectedNonceHash: CryptoUtil.hashToken('different-nonce'),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(mocks.exchange).not.toHaveBeenCalled();
  });

  it('rejects when state.provider does not match the URL provider', async () => {
    const { useCase, mocks } = setup();
    mocks.state.verify.mockResolvedValue({
      type: 'oauth-state',
      provider: 'github',
      intent: 'login',
      nonce: 'n',
    });

    await expect(
      useCase.execute({
        provider: 'google',
        code: 'c',
        state: 's',
        expectedNonceHash: validNonceHash,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(mocks.exchange).not.toHaveBeenCalled();
  });

  describe('link intent', () => {
    it('throws BadRequest when userId is missing', async () => {
      const { useCase, mocks } = setup();
      mocks.state.verify.mockResolvedValue({
        type: 'oauth-state',
        provider: 'google',
        intent: 'link',
        nonce: 'n',
      });
      mocks.exchange.mockResolvedValue(profile);

      await expect(
        useCase.execute({
          provider: 'google',
          code: 'c',
          state: 's',
          expectedNonceHash: validNonceHash,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws Conflict when the provider account belongs to another user', async () => {
      const { useCase, mocks } = setup();
      mocks.state.verify.mockResolvedValue({
        type: 'oauth-state',
        provider: 'google',
        intent: 'link',
        userId: 'u1',
        nonce: 'n',
      });
      mocks.exchange.mockResolvedValue(profile);
      mocks.accounts.findByProviderIdentity.mockResolvedValue({
        id: 'a1',
        provider: 'google',
        providerId: 'gid-1',
        userId: 'u2',
        createdAt: new Date(),
      });

      await expect(
        useCase.execute({
          provider: 'google',
          code: 'c',
          state: 's',
          expectedNonceHash: validNonceHash,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(mocks.accounts.create).not.toHaveBeenCalled();
    });

    it('returns the existing account when already linked to the same user (idempotent)', async () => {
      const { useCase, mocks } = setup();
      mocks.state.verify.mockResolvedValue({
        type: 'oauth-state',
        provider: 'google',
        intent: 'link',
        userId: 'u1',
        nonce: 'n',
      });
      mocks.exchange.mockResolvedValue(profile);
      mocks.accounts.findByProviderIdentity.mockResolvedValue({
        id: 'a1',
        provider: 'google',
        providerId: 'gid-1',
        userId: 'u1',
        createdAt: new Date(),
      });

      const result = await useCase.execute({
        provider: 'google',
        code: 'c',
        state: 's',
        expectedNonceHash: validNonceHash,
      });

      expect(result).toEqual({
        intent: 'link',
        accountId: 'a1',
        provider: 'google',
      });
      expect(mocks.accounts.create).not.toHaveBeenCalled();
      expect(mocks.audit.log).not.toHaveBeenCalled();
    });

    it('creates a new OAuthAccount and audits the link', async () => {
      const { useCase, mocks } = setup();
      mocks.state.verify.mockResolvedValue({
        type: 'oauth-state',
        provider: 'google',
        intent: 'link',
        userId: 'u1',
        nonce: 'n',
      });
      mocks.exchange.mockResolvedValue(profile);
      mocks.accounts.findByProviderIdentity.mockResolvedValue(null);
      mocks.accounts.create.mockResolvedValue({
        id: 'a-new',
        provider: 'google',
        providerId: 'gid-1',
        userId: 'u1',
        createdAt: new Date(),
      });

      const result = await useCase.execute({
        provider: 'google',
        code: 'c',
        state: 's',
        expectedNonceHash: validNonceHash,
      });

      expect(mocks.accounts.create).toHaveBeenCalledWith({
        provider: 'google',
        providerId: 'gid-1',
        userId: 'u1',
      });
      expect(mocks.audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          action: 'oauth.account.linked',
          resourceId: 'a-new',
        }),
      );
      expect(result).toEqual({
        intent: 'link',
        accountId: 'a-new',
        provider: 'google',
      });
    });
  });

  describe('login intent', () => {
    function loginState() {
      return {
        type: 'oauth-state' as const,
        provider: 'google' as const,
        intent: 'login' as const,
        nonce: 'n',
      };
    }

    it('issues tokens when the OAuth account is already linked', async () => {
      const { useCase, mocks } = setup();
      mocks.state.verify.mockResolvedValue(loginState());
      mocks.exchange.mockResolvedValue(profile);
      mocks.accounts.findByProviderIdentity.mockResolvedValue({
        id: 'a1',
        provider: 'google',
        providerId: 'gid-1',
        userId: 'u1',
        createdAt: new Date(),
      });
      mocks.login.issueTokens.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
      });

      const result = await useCase.execute({
        provider: 'google',
        code: 'c',
        state: 's',
        expectedNonceHash: validNonceHash,
        userAgent: 'ua',
        ipAddress: '1.1.1.1',
      });

      expect(mocks.login.issueTokens).toHaveBeenCalledWith(
        'u1',
        'ua',
        '1.1.1.1',
      );
      expect(mocks.audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', action: 'oauth.login' }),
      );
      expect(result).toEqual({
        intent: 'login',
        accessToken: 'at',
        refreshToken: 'rt',
      });
      expect(mocks.users.create).not.toHaveBeenCalled();
    });

    it('rejects with Conflict when the email already exists but is not linked', async () => {
      const { useCase, mocks } = setup();
      mocks.state.verify.mockResolvedValue(loginState());
      mocks.exchange.mockResolvedValue(profile);
      mocks.accounts.findByProviderIdentity.mockResolvedValue(null);
      mocks.users.findByEmail.mockResolvedValue({ id: 'existing' } as User);

      await expect(
        useCase.execute({
          provider: 'google',
          code: 'c',
          state: 's',
          expectedNonceHash: validNonceHash,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(mocks.users.create).not.toHaveBeenCalled();
      expect(mocks.accounts.create).not.toHaveBeenCalled();
    });

    it('signs up: creates user, personal workspace, OAuth link, audits, and issues tokens', async () => {
      const { useCase, mocks } = setup();
      mocks.state.verify.mockResolvedValue(loginState());
      mocks.exchange.mockResolvedValue(profile);
      mocks.accounts.findByProviderIdentity.mockResolvedValue(null);
      mocks.users.findByEmail.mockResolvedValue(null);
      mocks.users.create.mockResolvedValue({
        id: 'u-new',
        email: 'jane@example.com',
        name: 'Jane',
      } as User);
      mocks.login.issueTokens.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
      });

      const result = await useCase.execute({
        provider: 'google',
        code: 'c',
        state: 's',
        expectedNonceHash: validNonceHash,
      });

      expect(mocks.users.create).toHaveBeenCalledWith({
        email: 'jane@example.com',
        name: 'Jane',
        emailVerifiedAt: expect.any(Date),
      });
      expect(mocks.workspaces.execute).toHaveBeenCalledWith({
        userId: 'u-new',
        name: "Jane's Workspace",
        isPersonal: true,
      });
      expect(mocks.accounts.create).toHaveBeenCalledWith({
        provider: 'google',
        providerId: 'gid-1',
        userId: 'u-new',
      });
      expect(mocks.audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u-new', action: 'oauth.signup' }),
      );
      expect(result).toEqual({
        intent: 'login',
        accessToken: 'at',
        refreshToken: 'rt',
      });
    });
  });
});
