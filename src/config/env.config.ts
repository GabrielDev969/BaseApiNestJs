import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().default(3000),
    APP_URL: z.string().url(),
    CORS_ORIGINS: z
      .string()
      .optional()
      .transform((val) =>
        val
          ? val
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      ),

    DATABASE_URL: z.string().url(),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    DB_POOL_IDLE_MS: z.coerce.number().int().nonnegative().default(30_000),
    DB_POOL_CONN_TIMEOUT_MS: z.coerce.number().int().positive().default(50_000),

    REDIS_HOST: z.string(),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional(),

    TRUST_PROXY: z
      .string()
      .optional()
      .transform((val): boolean | number => {
        if (!val || val === 'false') return false;
        if (val === 'true') return true;
        const n = Number(val);
        return Number.isInteger(n) && n >= 0 ? n : true;
      }),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z
      .string()
      .default('15m')
      .transform((val) => val as `${number}${'s' | 'm' | 'h' | 'd'}`),
    JWT_REFRESH_EXPIRES_IN: z
      .string()
      .default('7d')
      .transform((val) => val as `${number}${'s' | 'm' | 'h' | 'd'}`),

    ENCRYPTION_KEY: z
      .string()
      .length(64, 'ENCRYPTION_KEY must be 64 characters (32 bytes in hex)')
      .regex(/^[0-9a-fA-F]+$/, 'ENCRYPTION_KEY must be in hexadecimal format'),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CALLBACK_URL: z.string().url().optional(),

    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GITHUB_CALLBACK_URL: z.string().url().optional(),

    THROTTLE_TTL: z.coerce.number().default(60),
    THROTTLE_LIMIT: z.coerce.number().default(100),

    METRICS_ALLOWED_IPS: z
      .string()
      .optional()
      .transform((val) =>
        val
          ? val
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      ),

    EMAIL_PROVIDER: z.enum(['resend', 'log']).default('log'),
    EMAIL_FROM: z.string().default('Workspace API <noreply@example.com>'),
    RESEND_API_KEY: z.string().optional(),
    APP_PUBLIC_URL: z.string().url().optional(),

    ALERT_DISCORD_WEBHOOK_URL: z.string().url().optional(),

    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .optional(),
    LOG_PRETTY: z.coerce.boolean().optional(),
    LOG_SLOW_REQUEST_MS: z.coerce.number().int().positive().default(1000),
    LOG_SLOW_QUERY_MS: z.coerce.number().int().positive().default(100),
  })
  .refine(
    (data) => {
      const hasGoogleId = !!data.GOOGLE_CLIENT_ID;
      const hasGoogleSecret = !!data.GOOGLE_CLIENT_SECRET;
      return hasGoogleId === hasGoogleSecret;
    },
    {
      message:
        'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be provided together',
    },
  )
  .refine(
    (data) => {
      const hasGitHubId = !!data.GITHUB_CLIENT_ID;
      const hasGitHubSecret = !!data.GITHUB_CLIENT_SECRET;
      return hasGitHubId === hasGitHubSecret;
    },
    {
      message:
        'GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be provided together',
    },
  )
  .refine(
    (data) =>
      data.NODE_ENV !== 'production' ||
      (data.CORS_ORIGINS !== undefined && data.CORS_ORIGINS.length > 0),
    {
      message: 'CORS_ORIGINS must be set (non-empty) when NODE_ENV=production',
    },
  )
  .refine((data) => data.EMAIL_PROVIDER !== 'resend' || !!data.RESEND_API_KEY, {
    message: 'RESEND_API_KEY must be set when EMAIL_PROVIDER=resend',
  });

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env: Env = parsed.data;
