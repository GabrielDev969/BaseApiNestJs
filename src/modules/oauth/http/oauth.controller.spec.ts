import type { Request, Response } from 'express';
import { OAuthController } from './oauth.controller';
import { StartOAuthUseCase } from '../use-cases/start-oauth.use-case';
import { HandleOAuthCallbackUseCase } from '../use-cases/handle-oauth-callback.use-case';
import { ListOAuthAccountsUseCase } from '../use-cases/list-oauth-accounts.use-case';
import { UnlinkOAuthAccountUseCase } from '../use-cases/unlink-oauth-account.use-case';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { StartOAuthDto } from './dto/start-oauth.dto';
import { CryptoUtil } from '@shared/utils/crypto.util';

function mockRes(): Response {
  return { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;
}

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

  it('loginStart calls StartOAuthUseCase, sets oauth_state cookie with nonce hash, omits nonce from response', async () => {
    const query: StartOAuthDto = { redirectUri: 'http://app/cb' };
    startOAuth.execute.mockResolvedValue({
      authorizationUrl: 'https://accounts.google.com/auth',
      nonce: 'n-raw',
    });
    const res = mockRes();

    const result = await controller.loginStart('google', query, res);

    expect(startOAuth.execute).toHaveBeenCalledWith({
      provider: 'google',
      intent: 'login',
      redirectUri: 'http://app/cb',
    });
    expect(res.cookie).toHaveBeenCalledWith(
      'oauth_state',
      CryptoUtil.hashToken('n-raw'),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/v1/auth/oauth',
      }),
    );
    expect(result).toEqual({
      authorizationUrl: 'https://accounts.google.com/auth',
    });
  });

  it('loginStart throws BadRequestException for unknown provider', async () => {
    await expect(
      controller.loginStart(
        'myspace',
        { redirectUri: 'http://app' },
        mockRes(),
      ),
    ).rejects.toThrow('Unsupported OAuth provider "myspace"');
  });

  it('linkStart attaches the user id, link intent, and sets cookie', async () => {
    startOAuth.execute.mockResolvedValue({
      authorizationUrl: 'https://github.com/auth',
      nonce: 'n-link',
    });
    const res = mockRes();
    await controller.linkStart(
      'github',
      { redirectUri: 'http://app/cb' },
      { id: 'u1', sessionId: 's1' },
      res,
    );
    expect(startOAuth.execute).toHaveBeenCalledWith({
      provider: 'github',
      intent: 'link',
      userId: 'u1',
      redirectUri: 'http://app/cb',
    });
    expect(res.cookie).toHaveBeenCalledWith(
      'oauth_state',
      CryptoUtil.hashToken('n-link'),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
    );
  });

  it('list forwards user id', async () => {
    listAccounts.execute.mockResolvedValue([] as never);
    await controller.list({ id: 'u1', sessionId: 's1' });
    expect(listAccounts.execute).toHaveBeenCalledWith('u1');
  });

  it('unlink forwards user id and account id', async () => {
    unlinkAccount.execute.mockResolvedValue(undefined);
    await controller.unlink({ id: 'u1', sessionId: 's1' }, 'oa-1');
    expect(unlinkAccount.execute).toHaveBeenCalledWith('u1', 'oa-1');
  });

  it('callback forwards request data + cookie hash, sets refresh cookie on login, clears oauth_state', async () => {
    const dto: OAuthCallbackDto = { code: 'auth-code', state: 'signed-state' };
    const req = {
      headers: { 'user-agent': 'jest-runner' },
      ip: '10.0.0.1',
      cookies: { oauth_state: 'stored-hash' },
    } as unknown as Request;
    const res = mockRes();
    handleCallback.execute.mockResolvedValue({
      intent: 'login',
      accessToken: 'a',
      refreshToken: 'r',
    });

    const result = await controller.callback('github', dto, req, res);

    expect(handleCallback.execute).toHaveBeenCalledWith({
      provider: 'github',
      code: 'auth-code',
      state: 'signed-state',
      expectedNonceHash: 'stored-hash',
      userAgent: 'jest-runner',
      ipAddress: '10.0.0.1',
    });
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'r',
      expect.any(Object),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      'oauth_state',
      expect.objectContaining({ path: '/api/v1/auth/oauth' }),
    );
    expect(result).toEqual({ intent: 'login', accessToken: 'a' });
  });

  it('callback passes link results through and still clears oauth_state', async () => {
    const dto: OAuthCallbackDto = { code: 'auth-code', state: 'signed-state' };
    const req = {
      headers: {},
      ip: '10.0.0.1',
      cookies: { oauth_state: 'stored-hash' },
    } as unknown as Request;
    const res = mockRes();
    handleCallback.execute.mockResolvedValue({
      intent: 'link',
      accountId: 'oa-9',
      provider: 'github',
    });

    const result = await controller.callback('github', dto, req, res);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith(
      'oauth_state',
      expect.objectContaining({ path: '/api/v1/auth/oauth' }),
    );
    expect(result).toEqual({
      intent: 'link',
      accountId: 'oa-9',
      provider: 'github',
    });
  });

  it('callback clears oauth_state cookie even when the use case throws', async () => {
    const dto: OAuthCallbackDto = { code: 'auth-code', state: 'signed-state' };
    const req = {
      headers: {},
      ip: '10.0.0.1',
      cookies: { oauth_state: 'stored-hash' },
    } as unknown as Request;
    const res = mockRes();
    handleCallback.execute.mockRejectedValue(new Error('boom'));

    await expect(controller.callback('github', dto, req, res)).rejects.toThrow(
      'boom',
    );

    expect(res.clearCookie).toHaveBeenCalledWith(
      'oauth_state',
      expect.objectContaining({ path: '/api/v1/auth/oauth' }),
    );
  });
});
