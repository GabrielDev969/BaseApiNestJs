import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().default(3000),
    APP_URL: z.string().url(),

    DATABASE_URL: z.string().url(),

    REDIS_HOST: z.string(),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional(),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    ENCRYPTION_KEY: z
      .string()
      .length(64, 'ENCRYPTION_KEY deve ter 64 caracteres (32 bytes em hex)')
      .regex(
        /^[0-9a-fA-F]+$/,
        'ENCRYPTION_KEY deve estar em formato hexadecimal',
      ),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CALLBACK_URL: z.string().url().optional(),

    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GITHUB_CALLBACK_URL: z.string().url().optional(),

    THROTTLE_TTL: z.coerce.number().default(60),
    THROTTLE_LIMIT: z.coerce.number().default(100),
  })
  .refine(
    (data) => {
      const hasGoogleId = !!data.GOOGLE_CLIENT_ID;
      const hasGoogleSecret = !!data.GOOGLE_CLIENT_SECRET;
      return hasGoogleId === hasGoogleSecret;
    },
    {
      message:
        'GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET devem ser fornecidos juntos',
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
        'GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET devem ser fornecidos juntos',
    },
  );

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env: Env = parsed.data;
