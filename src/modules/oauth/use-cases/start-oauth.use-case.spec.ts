import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { StartOAuthUseCase } from './start-oauth.use-case';
import { OAuthProviderRegistry } from '../services/oauth-provider-registry';
import { OAuthStateService } from '../services/oauth-state.service';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { CryptoUtil } from '@shared/utils/crypto.util';
import type { User } from '@modules/users/entities/user.entity';

function setup(opts?: { signNonce?: string }) {
  const provider = {
    getAuthorizationUrl: jest.fn().mockReturnValue('https://provider/auth'),
  };
  const registry = {
    get: jest.fn().mockReturnValue(provider),
  } as unknown as jest.Mocked<OAuthProviderRegistry>;
  const state = {
    sign: jest
      .fn()
      .mockResolvedValue({ state: 'signed', nonce: opts?.signNonce ?? 'n' }),
  } as unknown as jest.Mocked<OAuthStateService>;
  const users = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;
  const useCase = new StartOAuthUseCase(registry, state, users);
  return { useCase, provider, registry, state, users };
}

describe('StartOAuthUseCase', () => {
  describe('login intent', () => {
    it('signs state and returns authorization URL plus nonce, without touching users', async () => {
      const { useCase, state, users } = setup({ signNonce: 'n-1' });

      const result = await useCase.execute({
        provider: 'google',
        intent: 'login',
        redirectUri: 'http://app/cb',
      });

      expect(state.sign).toHaveBeenCalledWith({
        provider: 'google',
        intent: 'login',
        userId: undefined,
        redirectUri: 'http://app/cb',
      });
      expect(users.findById).not.toHaveBeenCalled();
      expect(result).toEqual({
        authorizationUrl: 'https://provider/auth',
        nonce: 'n-1',
      });
    });
  });

  describe('link intent', () => {
    const userRow = { id: 'u1', passwordHash: 'hash' } as User;

    it('verifies password, then signs state and forwards userId', async () => {
      const { useCase, state, users } = setup();
      users.findById.mockResolvedValue(userRow);
      jest.spyOn(CryptoUtil, 'verifyPassword').mockResolvedValueOnce(true);

      await useCase.execute({
        provider: 'github',
        intent: 'link',
        userId: 'u1',
        password: 'right',
      });

      expect(users.findById).toHaveBeenCalledWith('u1');
      expect(state.sign).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'link', userId: 'u1' }),
      );
    });

    it('throws BadRequest when password is missing', async () => {
      const { useCase, state } = setup();
      await expect(
        useCase.execute({ provider: 'github', intent: 'link', userId: 'u1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(state.sign).not.toHaveBeenCalled();
    });

    it('throws BadRequest when userId is missing', async () => {
      const { useCase, state } = setup();
      await expect(
        useCase.execute({
          provider: 'github',
          intent: 'link',
          password: 'right',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(state.sign).not.toHaveBeenCalled();
    });

    it('throws Unauthorized when user is not found', async () => {
      const { useCase, state, users } = setup();
      users.findById.mockResolvedValue(null);
      await expect(
        useCase.execute({
          provider: 'github',
          intent: 'link',
          userId: 'gone',
          password: 'right',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(state.sign).not.toHaveBeenCalled();
    });

    it('throws Unauthorized when user has no passwordHash (OAuth-only account)', async () => {
      const { useCase, state, users } = setup();
      users.findById.mockResolvedValue({
        id: 'u1',
        passwordHash: null,
      } as User);
      await expect(
        useCase.execute({
          provider: 'github',
          intent: 'link',
          userId: 'u1',
          password: 'right',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(state.sign).not.toHaveBeenCalled();
    });

    it('throws Unauthorized when password does not match', async () => {
      const { useCase, state, users } = setup();
      users.findById.mockResolvedValue(userRow);
      jest.spyOn(CryptoUtil, 'verifyPassword').mockResolvedValueOnce(false);
      await expect(
        useCase.execute({
          provider: 'github',
          intent: 'link',
          userId: 'u1',
          password: 'wrong',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(state.sign).not.toHaveBeenCalled();
    });
  });
});
