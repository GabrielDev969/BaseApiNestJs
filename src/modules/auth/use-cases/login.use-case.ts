import { USERS_REPOSITORY } from '@modules/users/repositories/users.repository.interface';
import type { IUsersRepository } from '@modules/users/repositories/users.repository.interface';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../services/token.service';
import { CryptoUtil } from '@shared/utils/crypto.util';
import { CreateSessionUseCase } from '@modules/sessions/use-cases/create-session.use-case';

interface LoginInput {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private users: IUsersRepository,
    private tokens: TokenService,
    private createSession: CreateSessionUseCase,
  ) {}

  async execute(input: LoginInput) {
    const user = await this.users.findByEmail(input.email);
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await CryptoUtil.verifyPassword(
      user.passwordHash,
      input.password,
    );
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.twoFactorEnabled) {
      return { requires2FA: true, userId: user.id };
    }

    return this.issueTokens(user.id, input.userAgent, input.ipAddress);
  }

  async issueTokens(userId: string, userAgent?: string, ipAddress?: string) {
    const accessToken = await this.tokens.signAccessToken({ sub: userId });
    const refreshToken = await this.tokens.signRefreshToken(userId);

    await this.createSession.execute({
      userId,
      refreshToken,
      userAgent,
      ipAddress,
    });

    return { accessToken, refreshToken };
  }
}
