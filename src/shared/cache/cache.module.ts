import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';
import { env } from 'src/config/env.config';
import { CacheService } from './cache.service';

const redisUrl = (): string => {
  const auth = env.REDIS_PASSWORD ? `:${env.REDIS_PASSWORD}@` : '';
  return `redis://${auth}${env.REDIS_HOST}:${env.REDIS_PORT}`;
};

@Global()
@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      stores:
        env.NODE_ENV === 'test'
          ? undefined
          : [new Keyv({ store: new KeyvRedis(redisUrl()) })],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class AppCacheModule {}
