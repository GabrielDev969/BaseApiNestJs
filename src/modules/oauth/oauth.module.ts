import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '@modules/auth/auth.module';
import { JwtKeyResolverModule } from '@modules/auth/jwt-key-resolver.module';
import { UsersModule } from '@modules/users/users.module';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { AuditModule } from '@modules/audit/audit.module';
import { OAuthController } from './http/oauth.controller';
import { OAuthAccountsRepository } from './repositories/oauth-accounts.repository.interface';
import { PrismaOAuthAccountsRepository } from './repositories/prisma-oauth-accounts.repository';
import { GoogleOAuthProvider } from './providers/google-oauth.provider';
import { GitHubOAuthProvider } from './providers/github-oauth.provider';
import { OAuthProviderRegistry } from './services/oauth-provider-registry';
import { OAuthStateService } from './services/oauth-state.service';
import { StartOAuthUseCase } from './use-cases/start-oauth.use-case';
import { HandleOAuthCallbackUseCase } from './use-cases/handle-oauth-callback.use-case';
import { ListOAuthAccountsUseCase } from './use-cases/list-oauth-accounts.use-case';
import { UnlinkOAuthAccountUseCase } from './use-cases/unlink-oauth-account.use-case';

@Module({
  imports: [
    JwtModule.register({}),
    JwtKeyResolverModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    AuditModule,
  ],
  controllers: [OAuthController],
  providers: [
    {
      provide: OAuthAccountsRepository,
      useClass: PrismaOAuthAccountsRepository,
    },
    GoogleOAuthProvider,
    GitHubOAuthProvider,
    OAuthProviderRegistry,
    OAuthStateService,
    StartOAuthUseCase,
    HandleOAuthCallbackUseCase,
    ListOAuthAccountsUseCase,
    UnlinkOAuthAccountUseCase,
  ],
})
export class OAuthModule {}
