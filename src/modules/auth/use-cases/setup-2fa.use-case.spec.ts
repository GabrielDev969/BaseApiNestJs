import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SetupTwoFactorUseCase } from './setup-2fa.use-case';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { TwoFactorService } from '../services/two-factor.service';
import type { User } from '@modules/users/entities/user.entity';

describe('SetupTwoFactorUseCase', () => {
  let users: jest.Mocked<UsersRepository>;
  let twoFactor: jest.Mocked<TwoFactorService>;
  let useCase: SetupTwoFactorUseCase;

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    twoFactor = {
      generateSecret: jest.fn().mockReturnValue('SECRET'),
      encryptSecret: jest.fn().mockReturnValue('encrypted-secret'),
      buildOtpAuthUrl: jest.fn().mockReturnValue('otpauth://...'),
    } as unknown as jest.Mocked<TwoFactorService>;
    useCase = new SetupTwoFactorUseCase(users, twoFactor);
  });

  it('throws NotFoundException when the user does not exist', async () => {
    users.findById.mockResolvedValue(null);
    await expect(useCase.execute('u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws BadRequestException when 2FA is already enabled', async () => {
    users.findById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      twoFactorEnabled: true,
    } as User);
    await expect(useCase.execute('u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('generates an encrypted secret and returns the otpauth url', async () => {
    users.findById.mockResolvedValue({
      id: 'u1',
      email: 'jane@example.com',
      twoFactorEnabled: false,
    } as User);

    const result = await useCase.execute('u1');

    expect(twoFactor.generateSecret).toHaveBeenCalled();
    expect(twoFactor.encryptSecret).toHaveBeenCalledWith('SECRET');
    expect(users.update).toHaveBeenCalledWith('u1', {
      twoFactorSecret: 'encrypted-secret',
    });
    expect(twoFactor.buildOtpAuthUrl).toHaveBeenCalledWith(
      'jane@example.com',
      'SECRET',
    );
    expect(result).toEqual({ secret: 'SECRET', otpauthUrl: 'otpauth://...' });
  });
});
