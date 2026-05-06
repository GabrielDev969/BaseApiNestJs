import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { TwoFactorService } from '../services/two-factor.service';

@Injectable()
export class EnableTwoFactorUseCase {
  constructor(
    private users: UsersRepository,
    private twoFactor: TwoFactorService,
  ) {}

  async execute(
    userId: string,
    code: string,
  ): Promise<{ recoveryCodes: string[] }> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.twoFactorEnabled)
      throw new BadRequestException('2FA is already enabled');
    if (!user.twoFactorSecret)
      throw new BadRequestException('Run setup before enabling');

    const secret = this.twoFactor.decryptSecret(user.twoFactorSecret);
    if (!this.twoFactor.verifyToken(secret, code))
      throw new UnauthorizedException('Invalid code');

    const recoveryCodes = this.twoFactor.generateRecoveryCodes();
    await this.users.update(userId, {
      twoFactorEnabled: true,
      recoveryCodes: this.twoFactor.hashRecoveryCodes(recoveryCodes),
    });

    return { recoveryCodes };
  }
}
