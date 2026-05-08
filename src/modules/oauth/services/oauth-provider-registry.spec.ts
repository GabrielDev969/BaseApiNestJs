import { NotFoundException } from '@nestjs/common';
import { OAuthProviderRegistry } from './oauth-provider-registry';
import { GoogleOAuthProvider } from '../providers/google-oauth.provider';
import { GitHubOAuthProvider } from '../providers/github-oauth.provider';

function makeProvider<T extends GoogleOAuthProvider | GitHubOAuthProvider>(
  isConfigured: boolean,
): T {
  return {
    isConfigured: () => isConfigured,
    getAuthorizationUrl: jest.fn(),
    exchangeCodeForProfile: jest.fn(),
  } as unknown as T;
}

describe('OAuthProviderRegistry', () => {
  it('returns the provider when it is configured', () => {
    const google = makeProvider<GoogleOAuthProvider>(true);
    const github = makeProvider<GitHubOAuthProvider>(false);

    const registry = new OAuthProviderRegistry(google, github);

    expect(registry.get('google')).toBe(google);
  });

  it('throws NotFound when the provider is not configured', () => {
    const google = makeProvider<GoogleOAuthProvider>(false);
    const github = makeProvider<GitHubOAuthProvider>(true);

    const registry = new OAuthProviderRegistry(google, github);

    expect(() => registry.get('google')).toThrow(NotFoundException);
    expect(() => registry.get('github')).not.toThrow();
  });
});
