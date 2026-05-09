import type { Request } from 'express';
import { OAuthController } from './oauth.controller';
import { StartOAuthUseCase } from '../use-cases/start-oauth.use-case';
import { HandleOAuthCallbackUseCase } from '../use-cases/handle-oauth-callback.use-case';
import { ListOAuthAccountsUseCase } from '../use-cases/list-oauth-accounts.use-case';
import { UnlinkOAuthAccountUseCase } from '../use-cases/unlink-oauth-account.use-case';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { StartOAuthDto } from './dto/start-oauth.dto';

describe('OAuthController', () => {
  let startOAuth: jest.Mocked<StartOAuthUseCase>;
  let handleCallback: jest.Mocked<HandleOAuthCallbackUseCase>;
  let listAccounts: jest.Mocked<ListOAuthAccountsUseCase>;
  let unlinkAccount: jest.Mocked<UnlinkOAuthAccountUseCase>;
  let controller: OAuthController;

  beforeEach(() => {
    startOAuth = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<StartOAuthUseCase>;
    handleCallback = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<HandleOAuthCallbackUseCase>;
    listAccounts = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ListOAuthAccountsUseCase>;
    unlinkAccount = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UnlinkOAuthAccountUseCase>;
    controller = new OAuthController(
      startOAuth,
      handleCallback,
      listAccounts,
      unlinkAccount,
    );
  });

  it('loginStart calls StartOAuthUseCase with parsed provider and login intent', async () => {
    const query: StartOAuthDto = { redirectUri: 'http://app/cb' };
    startOAuth.execute.mockResolvedValue({
      authorizationUrl: 'https://accounts.google.com/auth',
    });

    const result = await controller.loginStart('google', query);

    expect(startOAuth.execute).toHaveBeenCalledWith({
      provider: 'google',
      intent: 'login',
      redirectUri: 'http://app/cb',
    });
    expect(result).toEqual({
      authorizationUrl: 'https://accounts.google.com/auth',
    });
  });

  it('callback forwards code, state, user-agent and IP to HandleOAuthCallbackUseCase', async () => {
    const dto: OAuthCallbackDto = { code: 'auth-code', state: 'signed-state' };
    const req = {
      headers: { 'user-agent': 'jest-runner' },
      ip: '10.0.0.1',
    } as unknown as Request;
    handleCallback.execute.mockResolvedValue({
      intent: 'login',
      accessToken: 'a',
      refreshToken: 'r',
    });

    await controller.callback('github', dto, req);

    expect(handleCallback.execute).toHaveBeenCalledWith({
      provider: 'github',
      code: 'auth-code',
      state: 'signed-state',
      userAgent: 'jest-runner',
      ipAddress: '10.0.0.1',
    });
  });
});
