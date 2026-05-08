import { Injectable, NotFoundException } from '@nestjs/common';
import { OAuthProviderName } from '../constants/providers';
import { GitHubOAuthProvider } from '../providers/github-oauth.provider';
import { GoogleOAuthProvider } from '../providers/google-oauth.provider';
import { OAuthProvider } from '../providers/oauth-provider.interface';

@Injectable()
export class OAuthProviderRegistry {
  private readonly providers: Map<OAuthProviderName, OAuthProvider>;

  constructor(google: GoogleOAuthProvider, github: GitHubOAuthProvider) {
    this.providers = new Map<OAuthProviderName, OAuthProvider>([
      ['google', google],
      ['github', github],
    ]);
  }

  get(name: OAuthProviderName): OAuthProvider {
    const provider = this.providers.get(name);
    if (!provider || !provider.isConfigured()) {
      throw new NotFoundException(`OAuth provider "${name}" is not configured`);
    }
    return provider;
  }
}
