import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { TokenService } from '../services/token.service';
import { TwoFactorService } from '../services/two-factor.service';
import { LoginUseCase } from './login.use-case';

interface VerifyInput {
  challenge: string;
  code: string;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class VerifyTwoFactorUseCase {
  constructor(
    private users: UsersRepository,
    private tokens: TokenService,
    private twoFactor: TwoFactorService,
    private loginUseCase: LoginUseCase,
  ) {}

  async execute(input: VerifyInput) {
    let userId: string;
    try {
      userId = await this.tokens.verifyChallengeToken(input.challenge);
    } catch {
      throw new UnauthorizedException('Invalid or expired challenge');
    }

    const user = await this.users.findById(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret)
      throw new BadRequestException('2FA is not enabled for this user');

    const secret = this.twoFactor.decryptSecret(user.twoFactorSecret);
    const totpOk = this.twoFactor.verifyToken(secret, input.code);

    if (!totpOk) {
      const remaining = this.twoFactor.consumeRecoveryCode(
        user.recoveryCodes,
        input.code,
      );
      if (!remaining) throw new UnauthorizedException('Invalid code');
      await this.users.update(userId, { recoveryCodes: remaining });
    }

    return this.loginUseCase.issueTokens(
      userId,
      input.userAgent,
      input.ipAddress,
    );
  }
}
