process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.APP_URL = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.ENCRYPTION_KEY = '0'.repeat(64);
if (!process.env.REDIS_HOST) process.env.REDIS_HOST = 'localhost';
if (!process.env.REDIS_PORT) process.env.REDIS_PORT = '6379';
process.env.THROTTLE_TTL = '60';
process.env.THROTTLE_LIMIT = '100';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/workspace_test?schema=public';
}
