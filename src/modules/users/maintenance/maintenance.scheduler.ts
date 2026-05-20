import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE } from '@shared/queues/queue-names';
import { ANONYMIZE_EXPIRED_USERS_JOB } from './maintenance.jobs';

const DAILY_AT_3AM = '0 3 * * *';

@Injectable()
export class MaintenanceScheduler implements OnModuleInit {
  private readonly logger = new Logger('MaintenanceScheduler');

  constructor(@InjectQueue(QUEUE.maintenance) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      ANONYMIZE_EXPIRED_USERS_JOB,
      {},
      {
        repeat: { pattern: DAILY_AT_3AM },
        jobId: `repeat:${ANONYMIZE_EXPIRED_USERS_JOB}`,
      },
    );
    this.logger.log({
      msg: 'Scheduled repeatable job',
      name: ANONYMIZE_EXPIRED_USERS_JOB,
      cron: DAILY_AT_3AM,
    });
  }
}
