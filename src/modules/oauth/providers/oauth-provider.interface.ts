import { OAuthProviderName } from '../constants/providers';

export interface OAuthProfile {
  providerId: string;
  email: string;
  name: string;
}

export abstract class OAuthProvider {
  abstract readonly name: OAuthProviderName;
  abstract isConfigured(): boolean;
  abstract getAuthorizationUrl(state: string): string;
  abstract exchangeCodeForProfile(code: string): Promise<OAuthProfile>;
}
