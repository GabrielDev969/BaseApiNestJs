import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { CryptoUtil } from '@shared/utils/crypto.util';
import { TwoFactorService } from '../services/two-factor.service';

@Injectable()
export class DisableTwoFactorUseCase {
  constructor(
    private users: UsersRepository,
    private twoFactor: TwoFactorService,
  ) {}

  async execute(userId: string, password: string, code: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (!user.twoFactorEnabled || !user.twoFactorSecret)
      throw new BadRequestException('2FA is not enabled');

    if (
      !user.passwordHash ||
      !(await CryptoUtil.verifyPassword(user.passwordHash, password))
    )
      throw new UnauthorizedException('Invalid password');

    const secret = this.twoFactor.decryptSecret(user.twoFactorSecret);
    if (!this.twoFactor.verifyToken(secret, code))
      throw new UnauthorizedException('Invalid code');

    await this.users.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      recoveryCodes: null,
    });
  }
}
