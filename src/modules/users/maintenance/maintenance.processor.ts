import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE } from '@shared/queues/queue-names';
import { AnonymizeExpiredUsersUseCase } from '../use-cases/anonymize-expired-users.use-case';
import { ANONYMIZE_EXPIRED_USERS_JOB } from './maintenance.jobs';

@Processor(QUEUE.maintenance)
export class MaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger('Worker:Maintenance');

  constructor(private readonly anonymize: AnonymizeExpiredUsersUseCase) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== ANONYMIZE_EXPIRED_USERS_JOB) {
      this.logger.warn({ msg: 'Unknown maintenance job', name: job.name });
      return;
    }
    await this.anonymize.execute();
  }
}
