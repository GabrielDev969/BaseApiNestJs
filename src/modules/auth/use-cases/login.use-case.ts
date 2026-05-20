import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { TokenService } from '../services/token.service';
import { CryptoUtil } from '@shared/utils/crypto.util';
import { CreateSessionUseCase } from '@modules/sessions/use-cases/create-session.use-case';
import { MetricsService } from '@shared/metrics/metrics.service';
import { AuditService } from '@modules/audit/services/audit.service';

interface LoginInput {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    private users: UsersRepository,
    private tokens: TokenService,
    private createSession: CreateSessionUseCase,
    private metrics: MetricsService,
    private audit: AuditService,
  ) {}

  async execute(input: LoginInput) {
    const user = await this.users.findByEmailIncludingDeleted(input.email);
    if (!user || !user.passwordHash) {
      this.metrics.incLoginAttempt('failure');
      await this.audit.log({
        userId: null,
        action: 'auth.login.failure',
        metadata: { reason: 'unknown_email', email: input.email },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await CryptoUtil.verifyPassword(
      user.passwordHash,
      input.password,
    );
    if (!valid) {
      this.metrics.incLoginAttempt('failure');
      await this.audit.log({
        userId: user.id,
        action: 'auth.login.failure',
        metadata: { reason: 'invalid_password', email: input.email },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.deletedAt) {
      await this.users.restore(user.id);
    }

    if (!user.emailVerifiedAt) {
      this.metrics.incLoginAttempt('failure');
      await this.audit.log({
        userId: user.id,
        action: 'auth.login.failure',
        metadata: { reason: 'email_not_verified' },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      throw new ForbiddenException(
        'Email not verified. Check your inbox for the verification link.',
      );
    }

    if (user.twoFactorEnabled) {
      this.metrics.incLoginAttempt('requires_2fa');
      const challenge = await this.tokens.signChallengeToken(user.id);
      return { requires2FA: true as const, challenge };
    }

    this.metrics.incLoginAttempt('success');
    return this.issueTokens(user.id, input.userAgent, input.ipAddress);
  }

  async issueTokens(userId: string, userAgent?: string, ipAddress?: string) {
    const refreshToken = CryptoUtil.generateToken(64);

    const session = await this.createSession.execute({
      userId,
      refreshToken,
      userAgent,
      ipAddress,
    });

    const accessToken = await this.tokens.signAccessToken({
      userId,
      sessionId: session.id,
    });

    return { accessToken, refreshToken };
  }
}
