import { Injectable, UnauthorizedException } from '@nestjs/common';
import { env } from 'src/config/env.config';
import { OAuthProviderName } from '../constants/providers';
import { OAuthProfile, OAuthProvider } from './oauth-provider.interface';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
}

@Injectable()
export class GoogleOAuthProvider extends OAuthProvider {
  readonly name: OAuthProviderName = 'google';

  isConfigured(): boolean {
    return !!(
      env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET &&
      env.GOOGLE_CALLBACK_URL
    );
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: env.GOOGLE_CALLBACK_URL!,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCodeForProfile(code: string): Promise<OAuthProfile> {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: env.GOOGLE_CALLBACK_URL!,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new UnauthorizedException('Failed to exchange Google code');
    }

    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userRes.ok) {
      throw new UnauthorizedException('Failed to fetch Google profile');
    }

    const user = (await userRes.json()) as GoogleUserInfo;
    if (!user.email || !user.email_verified) {
      throw new UnauthorizedException('Google account email is not verified');
    }

    return {
      providerId: user.sub,
      email: user.email.toLowerCase(),
      name:
        user.name ??
        [user.given_name, user.family_name].filter(Boolean).join(' ') ??
        user.email.split('@')[0],
    };
  }
}
