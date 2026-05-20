import type { Request, Response } from 'express';
import { env } from 'src/config/env.config';

export const OAUTH_STATE_COOKIE_NAME = 'oauth_state';
export const OAUTH_STATE_COOKIE_PATH = '/api/v1/auth/oauth';
const MAX_AGE_MS = 10 * 60 * 1000;

export function setOAuthStateCookie(res: Response, hash: string): void {
  res.cookie(OAUTH_STATE_COOKIE_NAME, hash, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: OAUTH_STATE_COOKIE_PATH,
    maxAge: MAX_AGE_MS,
  });
}

export function readOAuthStateCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[OAUTH_STATE_COOKIE_NAME];
}

export function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, { path: OAUTH_STATE_COOKIE_PATH });
}
