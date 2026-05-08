export const OAUTH_PROVIDERS = ['google', 'github'] as const;

export type OAuthProviderName = (typeof OAUTH_PROVIDERS)[number];

export function isOAuthProviderName(value: string): value is OAuthProviderName {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}
