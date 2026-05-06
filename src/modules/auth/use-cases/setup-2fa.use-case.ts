import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { TwoFactorService } from '../services/two-factor.service';

export interface SetupTwoFactorResult {
  secret: string;
  otpauthUrl: string;
}

@Injectable()
export class SetupTwoFactorUseCase {
  constructor(
    private users: UsersRepository,
    private twoFactor: TwoFactorService,
  ) {}

  async execute(userId: string): Promise<SetupTwoFactorResult> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.twoFactorEnabled)
      throw new BadRequestException('2FA is already enabled');

    const secret = this.twoFactor.generateSecret();
    await this.users.update(userId, {
      twoFactorSecret: this.twoFactor.encryptSecret(secret),
    });

    return {
      secret,
      otpauthUrl: this.twoFactor.buildOtpAuthUrl(user.email, secret),
    };
  }
}
