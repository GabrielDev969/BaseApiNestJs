import { Injectable, UnauthorizedException } from '@nestjs/common';
import { env } from 'src/config/env.config';
import { OAuthProviderName } from '../constants/providers';
import { OAuthProfile, OAuthProvider } from './oauth-provider.interface';

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';
const EMAILS_URL = 'https://api.github.com/user/emails';

interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

@Injectable()
export class GitHubOAuthProvider extends OAuthProvider {
  readonly name: OAuthProviderName = 'github';

  isConfigured(): boolean {
    return !!(
      env.GITHUB_CLIENT_ID &&
      env.GITHUB_CLIENT_SECRET &&
      env.GITHUB_CALLBACK_URL
    );
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID!,
      redirect_uri: env.GITHUB_CALLBACK_URL!,
      scope: 'read:user user:email',
      state,
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCodeForProfile(code: string): Promise<OAuthProfile> {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        code,
        client_id: env.GITHUB_CLIENT_ID!,
        client_secret: env.GITHUB_CLIENT_SECRET!,
        redirect_uri: env.GITHUB_CALLBACK_URL!,
      }).toString(),
    });

    const tokenJson = (await tokenRes.json()) as GitHubTokenResponse;
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new UnauthorizedException('Failed to exchange GitHub code');
    }

    const headers = {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'workspace-api',
    };

    const [userRes, emailsRes] = await Promise.all([
      fetch(USER_URL, { headers }),
      fetch(EMAILS_URL, { headers }),
    ]);
    if (!userRes.ok || !emailsRes.ok) {
      throw new UnauthorizedException('Failed to fetch GitHub profile');
    }

    const user = (await userRes.json()) as GitHubUser;
    const emails = (await emailsRes.json()) as GitHubEmail[];
    const primary = emails.find((e) => e.primary && e.verified) ?? emails[0];
    if (!primary?.verified) {
      throw new UnauthorizedException('GitHub account has no verified email');
    }

    return {
      providerId: String(user.id),
      email: primary.email.toLowerCase(),
      name: user.name ?? user.login,
    };
  }
}
