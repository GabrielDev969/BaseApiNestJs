import { Pool } from 'pg';
import { env } from 'src/config/env.config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { MetricsService, DbOperation } from '@shared/metrics/metrics.service';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 50000,
});

const adapter = new PrismaPg(pool);

@Injectable()
export class PrismaService
  extends PrismaClient<{
    adapter: typeof adapter;
    log: [
      { level: 'query'; emit: 'event' },
      { level: 'warn'; emit: 'event' },
      { level: 'error'; emit: 'event' },
    ];
  }>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly metrics: MetricsService) {
    super({
      adapter,
      log: [
        { level: 'query', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    this.$on('query', (event: Prisma.QueryEvent) => {
      const op = (event.query.trim().split(' ')[0] || 'OTHER').toUpperCase();
      const operation: DbOperation = (
        ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const
      ).includes(op as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE')
        ? (op as DbOperation)
        : 'OTHER';
      this.metrics.observeQuery(operation, event.duration / 1000);

      if (event.duration >= env.LOG_SLOW_QUERY_MS) {
        this.logger.warn({
          msg: 'Slow query',
          durationMs: event.duration,
          thresholdMs: env.LOG_SLOW_QUERY_MS,
          query: event.query,
          params: event.params,
        });
      }
    });
    this.$on('warn', (event: Prisma.LogEvent) => this.logger.warn(event));
    this.$on('error', (event: Prisma.LogEvent) => this.logger.error(event));

    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await pool.end();
  }
}
