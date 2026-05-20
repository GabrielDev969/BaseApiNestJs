import { Job } from 'bullmq';
import { MaintenanceProcessor } from './maintenance.processor';
import { ANONYMIZE_EXPIRED_USERS_JOB } from './maintenance.jobs';
import { AnonymizeExpiredUsersUseCase } from '../use-cases/anonymize-expired-users.use-case';

describe('MaintenanceProcessor', () => {
  let anonymize: jest.Mocked<AnonymizeExpiredUsersUseCase>;
  let processor: MaintenanceProcessor;

  beforeEach(() => {
    anonymize = {
      execute: jest.fn().mockResolvedValue({ anonymized: 0 }),
    } as unknown as jest.Mocked<AnonymizeExpiredUsersUseCase>;
    processor = new MaintenanceProcessor(anonymize);
  });

  it('runs the anonymize use case for the known job', async () => {
    await processor.process({ name: ANONYMIZE_EXPIRED_USERS_JOB } as Job);
    expect(anonymize.execute).toHaveBeenCalled();
  });

  it('ignores unknown jobs without throwing', async () => {
    await expect(
      processor.process({ name: 'other' } as Job),
    ).resolves.toBeUndefined();
    expect(anonymize.execute).not.toHaveBeenCalled();
  });
});
