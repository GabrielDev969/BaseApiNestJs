import { UnauthorizedException } from '@nestjs/common';
import { GoogleOAuthProvider } from './google-oauth.provider';
import { env } from 'src/config/env.config';

const mockResponse = (ok: boolean, body: unknown): Response =>
  ({
    ok,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

describe('GoogleOAuthProvider', () => {
  let provider: GoogleOAuthProvider;
  const fetchMock = jest.fn();

  beforeEach(() => {
    provider = new GoogleOAuthProvider();
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });

  describe('isConfigured', () => {
    it('returns false when GOOGLE_* env vars are missing', () => {
      const originals = {
        id: env.GOOGLE_CLIENT_ID,
        secret: env.GOOGLE_CLIENT_SECRET,
        callback: env.GOOGLE_CALLBACK_URL,
      };
      Object.assign(env, {
        GOOGLE_CLIENT_ID: '',
        GOOGLE_CLIENT_SECRET: '',
        GOOGLE_CALLBACK_URL: '',
      });
      expect(provider.isConfigured()).toBe(false);
      Object.assign(env, {
        GOOGLE_CLIENT_ID: originals.id,
        GOOGLE_CLIENT_SECRET: originals.secret,
        GOOGLE_CALLBACK_URL: originals.callback,
      });
    });

    it('returns true when all are set', () => {
      const originals = {
        id: env.GOOGLE_CLIENT_ID,
        secret: env.GOOGLE_CLIENT_SECRET,
        callback: env.GOOGLE_CALLBACK_URL,
      };
      Object.assign(env, {
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret',
        GOOGLE_CALLBACK_URL: 'http://x/cb',
      });
      expect(provider.isConfigured()).toBe(true);
      Object.assign(env, {
        GOOGLE_CLIENT_ID: originals.id,
        GOOGLE_CLIENT_SECRET: originals.secret,
        GOOGLE_CALLBACK_URL: originals.callback,
      });
    });
  });

  describe('getAuthorizationUrl', () => {
    it('builds the Google authorize URL with offline access + state', () => {
      Object.assign(env, {
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CALLBACK_URL: 'http://x/cb',
      });
      const url = provider.getAuthorizationUrl('state-1');
      expect(url).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
      expect(url).toContain('state=state-1');
    });
  });

  describe('exchangeCodeForProfile', () => {
    beforeEach(() => {
      Object.assign(env, {
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret',
        GOOGLE_CALLBACK_URL: 'http://x/cb',
      });
    });

    it('throws when token endpoint returns no access_token', async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(false, { error: 'bad' }));
      await expect(
        provider.exchangeCodeForProfile('code'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when userinfo endpoint returns non-ok', async () => {
      fetchMock
        .mockResolvedValueOnce(mockResponse(true, { access_token: 'tok' }))
        .mockResolvedValueOnce(mockResponse(false, {}));
      await expect(
        provider.exchangeCodeForProfile('code'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when email is unverified or missing', async () => {
      fetchMock
        .mockResolvedValueOnce(mockResponse(true, { access_token: 'tok' }))
        .mockResolvedValueOnce(
          mockResponse(true, {
            sub: '1',
            email: 'x@y.z',
            email_verified: false,
          }),
        );
      await expect(
        provider.exchangeCodeForProfile('code'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns mapped profile, prefering name', async () => {
      fetchMock
        .mockResolvedValueOnce(mockResponse(true, { access_token: 'tok' }))
        .mockResolvedValueOnce(
          mockResponse(true, {
            sub: 'g-1',
            email: 'JANE@x.com',
            email_verified: true,
            name: 'Jane Doe',
          }),
        );
      const profile = await provider.exchangeCodeForProfile('code');
      expect(profile).toEqual({
        providerId: 'g-1',
        email: 'jane@x.com',
        name: 'Jane Doe',
      });
    });

    it('falls back to given+family name then email local-part when name is missing', async () => {
      fetchMock
        .mockResolvedValueOnce(mockResponse(true, { access_token: 'tok' }))
        .mockResolvedValueOnce(
          mockResponse(true, {
            sub: 'g-1',
            email: 'jane@x.com',
            email_verified: true,
            given_name: 'Jane',
            family_name: 'Doe',
          }),
        );
      const profile = await provider.exchangeCodeForProfile('code');
      expect(profile.name).toBe('Jane Doe');
    });
  });
});
