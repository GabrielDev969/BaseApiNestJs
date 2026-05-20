import type { Queue } from 'bullmq';
import { MaintenanceScheduler } from './maintenance.scheduler';
import { ANONYMIZE_EXPIRED_USERS_JOB } from './maintenance.jobs';

describe('MaintenanceScheduler', () => {
  it('schedules a daily repeatable job on bootstrap with a stable jobId', async () => {
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const scheduler = new MaintenanceScheduler(queue as unknown as Queue);

    await scheduler.onModuleInit();

    expect(queue.add).toHaveBeenCalledWith(
      ANONYMIZE_EXPIRED_USERS_JOB,
      {},
      expect.objectContaining({
        repeat: { pattern: '0 3 * * *' },
        jobId: `repeat:${ANONYMIZE_EXPIRED_USERS_JOB}`,
      }),
    );
  });
});
