import 'dotenv/config';
import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
import { env } from 'prisma/config';

const { Pool } = pkg;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pool: InstanceType<typeof Pool>;

  constructor(){
    const pool = new Pool({
      connectionString: env('DATABASE_URL'),
    });
    const adapter = new PrismaPg(pool);
    super({
      adapter,
    });
    this.pool = pool;
  }
  
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
