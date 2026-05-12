import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './http/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './services/token.service';
import { TwoFactorService } from './services/two-factor.service';
import { RegisterUseCase } from './use-cases/register.use-case';
import { LoginUseCase } from './use-cases/login.use-case';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { GetMeUseCase } from './use-cases/get-me.use-case';
import { SetupTwoFactorUseCase } from './use-cases/setup-2fa.use-case';
import { EnableTwoFactorUseCase } from './use-cases/enable-2fa.use-case';
import { DisableTwoFactorUseCase } from './use-cases/disable-2fa.use-case';
import { VerifyTwoFactorUseCase } from './use-cases/verify-2fa.use-case';
import { RequestEmailVerificationUseCase } from './use-cases/request-email-verification.use-case';
import { VerifyEmailUseCase } from './use-cases/verify-email.use-case';
import { ForgotPasswordUseCase } from './use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { EmailVerifyTokensRepository } from './repositories/email-verify-tokens.repository.interface';
import { PrismaEmailVerifyTokensRepository } from './repositories/prisma-email-verify-tokens.repository';
import { PasswordResetTokensRepository } from './repositories/password-reset-tokens.repository.interface';
import { PrismaPasswordResetTokensRepository } from './repositories/prisma-password-reset-tokens.repository';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    UsersModule,
    SessionsModule,
    WorkspacesModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    TokenService,
    TwoFactorService,
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    GetMeUseCase,
    SetupTwoFactorUseCase,
    EnableTwoFactorUseCase,
    DisableTwoFactorUseCase,
    VerifyTwoFactorUseCase,
    RequestEmailVerificationUseCase,
    VerifyEmailUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    {
      provide: EmailVerifyTokensRepository,
      useClass: PrismaEmailVerifyTokensRepository,
    },
    {
      provide: PasswordResetTokensRepository,
      useClass: PrismaPasswordResetTokensRepository,
    },
  ],
  exports: [LoginUseCase, TokenService],
})
export class AuthModule {}
