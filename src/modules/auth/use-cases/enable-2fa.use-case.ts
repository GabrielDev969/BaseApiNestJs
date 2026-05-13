import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { CryptoUtil } from '@shared/utils/crypto.util';
import { TwoFactorService } from '../services/two-factor.service';
import { MetricsService } from '@shared/metrics/metrics.service';

@Injectable()
export class EnableTwoFactorUseCase {
  constructor(
    private users: UsersRepository,
    private twoFactor: TwoFactorService,
    private metrics: MetricsService,
  ) {}

  async execute(
    userId: string,
    password: string,
    code: string,
  ): Promise<{ recoveryCodes: string[] }> {
    const user = await this.users.findById(userId);
    if (!user) {
      this.metrics.incTwoFactorEnable('not_found');
      throw new NotFoundException('User not found');
    }
    if (user.twoFactorEnabled)
      throw new BadRequestException('2FA is already enabled');
    if (!user.twoFactorSecret)
      throw new BadRequestException('Run setup before enabling');

    if (
      !user.passwordHash ||
      !(await CryptoUtil.verifyPassword(user.passwordHash, password))
    ) {
      this.metrics.incTwoFactorEnable('invalid_password');
      throw new UnauthorizedException('Invalid password');
    }

    const secret = this.twoFactor.decryptSecret(user.twoFactorSecret);
    if (!this.twoFactor.verifyToken(secret, code)) {
      this.metrics.incTwoFactorEnable('invalid_code');
      throw new UnauthorizedException('Invalid code');
    }

    const recoveryCodes = this.twoFactor.generateRecoveryCodes();
    await this.users.update(userId, {
      twoFactorEnabled: true,
      recoveryCodes: this.twoFactor.hashRecoveryCodes(recoveryCodes),
    });

    this.metrics.incTwoFactorEnable('success');
    return { recoveryCodes };
  }
}
