import { UnauthorizedException } from '@nestjs/common';
import { GitHubOAuthProvider } from './github-oauth.provider';
import { env } from 'src/config/env.config';

const mockResponse = (ok: boolean, body: unknown): Response =>
  ({
    ok,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

describe('GitHubOAuthProvider', () => {
  let provider: GitHubOAuthProvider;
  const fetchMock = jest.fn();

  beforeEach(() => {
    provider = new GitHubOAuthProvider();
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });

  describe('isConfigured', () => {
    it('returns false when any GITHUB_* env var is missing', () => {
      const originals = {
        id: env.GITHUB_CLIENT_ID,
        secret: env.GITHUB_CLIENT_SECRET,
        callback: env.GITHUB_CALLBACK_URL,
      };
      Object.assign(env, {
        GITHUB_CLIENT_ID: '',
        GITHUB_CLIENT_SECRET: '',
        GITHUB_CALLBACK_URL: '',
      });
      expect(provider.isConfigured()).toBe(false);
      Object.assign(env, {
        GITHUB_CLIENT_ID: originals.id,
        GITHUB_CLIENT_SECRET: originals.secret,
        GITHUB_CALLBACK_URL: originals.callback,
      });
    });

    it('returns true when all GITHUB_* vars are set', () => {
      const originals = {
        id: env.GITHUB_CLIENT_ID,
        secret: env.GITHUB_CLIENT_SECRET,
        callback: env.GITHUB_CALLBACK_URL,
      };
      Object.assign(env, {
        GITHUB_CLIENT_ID: 'id',
        GITHUB_CLIENT_SECRET: 'secret',
        GITHUB_CALLBACK_URL: 'http://x/cb',
      });
      expect(provider.isConfigured()).toBe(true);
      Object.assign(env, {
        GITHUB_CLIENT_ID: originals.id,
        GITHUB_CLIENT_SECRET: originals.secret,
        GITHUB_CALLBACK_URL: originals.callback,
      });
    });
  });

  describe('getAuthorizationUrl', () => {
    it('builds the GitHub authorize URL with required params and state', () => {
      Object.assign(env, {
        GITHUB_CLIENT_ID: 'id',
        GITHUB_CALLBACK_URL: 'http://x/cb',
      });
      const url = provider.getAuthorizationUrl('state-abc');
      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=id');
      expect(url).toContain('state=state-abc');
      expect(url).toContain('scope=read%3Auser+user%3Aemail');
    });
  });

  describe('exchangeCodeForProfile', () => {
    beforeEach(() => {
      Object.assign(env, {
        GITHUB_CLIENT_ID: 'id',
        GITHUB_CLIENT_SECRET: 'secret',
        GITHUB_CALLBACK_URL: 'http://x/cb',
      });
    });

    it('throws when token endpoint returns no access_token', async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(false, { error: 'bad' }));
      await expect(
        provider.exchangeCodeForProfile('code'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when user or emails endpoint returns non-ok', async () => {
      fetchMock
        .mockResolvedValueOnce(mockResponse(true, { access_token: 'tok' }))
        .mockResolvedValueOnce(mockResponse(false, {}))
        .mockResolvedValueOnce(mockResponse(true, []));
      await expect(
        provider.exchangeCodeForProfile('code'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when no verified email is found', async () => {
      fetchMock
        .mockResolvedValueOnce(mockResponse(true, { access_token: 'tok' }))
        .mockResolvedValueOnce(
          mockResponse(true, { id: 1, login: 'u', name: 'N', email: null }),
        )
        .mockResolvedValueOnce(
          mockResponse(true, [
            { email: 'a@b.c', primary: true, verified: false },
          ]),
        );
      await expect(
        provider.exchangeCodeForProfile('code'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns mapped profile when token + user + verified email are returned', async () => {
      fetchMock
        .mockResolvedValueOnce(mockResponse(true, { access_token: 'tok' }))
        .mockResolvedValueOnce(
          mockResponse(true, {
            id: 42,
            login: 'jane',
            name: 'Jane',
            email: null,
          }),
        )
        .mockResolvedValueOnce(
          mockResponse(true, [
            { email: 'jane@x.com', primary: true, verified: true },
          ]),
        );
      const profile = await provider.exchangeCodeForProfile('code');
      expect(profile).toEqual({
        providerId: '42',
        email: 'jane@x.com',
        name: 'Jane',
      });
    });

    it('falls back to login when name is null', async () => {
      fetchMock
        .mockResolvedValueOnce(mockResponse(true, { access_token: 'tok' }))
        .mockResolvedValueOnce(
          mockResponse(true, { id: 1, login: 'jane', name: null, email: null }),
        )
        .mockResolvedValueOnce(
          mockResponse(true, [
            { email: 'jane@x.com', primary: true, verified: true },
          ]),
        );
      const profile = await provider.exchangeCodeForProfile('code');
      expect(profile.name).toBe('jane');
    });
  });
});
