import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginUseCase } from '@modules/auth/use-cases/login.use-case';
import { CreateWorkspaceUseCase } from '@modules/workspaces/use-cases/create-workspace.use-case';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { AuditService } from '@modules/audit/services/audit.service';
import { OAuthProviderName } from '../constants/providers';
import { OAuthAccountsRepository } from '../repositories/oauth-accounts.repository.interface';
import { OAuthProviderRegistry } from '../services/oauth-provider-registry';
import { OAuthStateService } from '../services/oauth-state.service';

interface HandleCallbackInput {
  provider: OAuthProviderName;
  code: string;
  state: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface OAuthLoginResult {
  intent: 'login';
  accessToken: string;
  refreshToken: string;
}

export interface OAuthLinkResult {
  intent: 'link';
  accountId: string;
  provider: OAuthProviderName;
}

@Injectable()
export class HandleOAuthCallbackUseCase {
  constructor(
    private registry: OAuthProviderRegistry,
    private stateService: OAuthStateService,
    private accounts: OAuthAccountsRepository,
    private users: UsersRepository,
    private loginUseCase: LoginUseCase,
    private createWorkspace: CreateWorkspaceUseCase,
    private audit: AuditService,
  ) {}

  async execute(
    input: HandleCallbackInput,
  ): Promise<OAuthLoginResult | OAuthLinkResult> {
    const state = await this.stateService.verify(input.state);
    if (state.provider !== input.provider) {
      throw new UnauthorizedException('OAuth state does not match provider');
    }

    const provider = this.registry.get(input.provider);
    const profile = await provider.exchangeCodeForProfile(input.code);

    if (state.intent === 'link') {
      if (!state.userId) {
        throw new BadRequestException('Missing user for link intent');
      }
      return this.linkToUser(state.userId, input.provider, profile);
    }

    return this.loginOrSignup(input, profile);
  }

  private async linkToUser(
    userId: string,
    provider: OAuthProviderName,
    profile: { providerId: string; email: string },
  ): Promise<OAuthLinkResult> {
    const existing = await this.accounts.findByProviderIdentity(
      provider,
      profile.providerId,
    );
    if (existing && existing.userId !== userId) {
      throw new ConflictException(
        'This OAuth account is already linked to another user',
      );
    }
    if (existing) {
      return { intent: 'link', accountId: existing.id, provider };
    }

    const account = await this.accounts.create({
      provider,
      providerId: profile.providerId,
      userId,
    });

    await this.audit.log({
      userId,
      action: 'oauth.account.linked',
      resource: 'OAuthAccount',
      resourceId: account.id,
      metadata: { provider },
    });

    return { intent: 'link', accountId: account.id, provider };
  }

  private async loginOrSignup(
    input: HandleCallbackInput,
    profile: { providerId: string; email: string; name: string },
  ): Promise<OAuthLoginResult> {
    const linked = await this.accounts.findByProviderIdentity(
      input.provider,
      profile.providerId,
    );

    if (linked) {
      const tokens = await this.loginUseCase.issueTokens(
        linked.userId,
        input.userAgent,
        input.ipAddress,
      );
      await this.audit.log({
        userId: linked.userId,
        action: 'oauth.login',
        metadata: { provider: input.provider },
      });
      return { intent: 'login', ...tokens };
    }

    const userByEmail = await this.users.findByEmail(profile.email);
    if (userByEmail) {
      throw new ConflictException(
        'An account with this email already exists. Sign in and link your OAuth account from settings.',
      );
    }

    const user = await this.users.create({
      email: profile.email,
      name: profile.name,
    });
    await this.createWorkspace.execute({
      userId: user.id,
      name: `${user.name}'s Workspace`,
      isPersonal: true,
    });
    await this.accounts.create({
      provider: input.provider,
      providerId: profile.providerId,
      userId: user.id,
    });

    await this.audit.log({
      userId: user.id,
      action: 'oauth.signup',
      metadata: { provider: input.provider },
    });

    const tokens = await this.loginUseCase.issueTokens(
      user.id,
      input.userAgent,
      input.ipAddress,
    );
    return { intent: 'login', ...tokens };
  }
}
