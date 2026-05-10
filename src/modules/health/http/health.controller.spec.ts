import { HealthController } from './health.controller';
import { HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';
import { PrismaHealthIndicator } from '../indicators/prisma.indicator';

describe('HealthController', () => {
  let health: jest.Mocked<HealthCheckService>;
  let prismaIndicator: jest.Mocked<PrismaHealthIndicator>;
  let controller: HealthController;

  const okResult: HealthCheckResult = {
    status: 'ok',
    info: {},
    error: {},
    details: {},
  };

  beforeEach(() => {
    health = {
      check: jest.fn().mockResolvedValue(okResult),
    } as unknown as jest.Mocked<HealthCheckService>;
    prismaIndicator = {
      pingCheck: jest.fn(),
    } as unknown as jest.Mocked<PrismaHealthIndicator>;
    controller = new HealthController(health, prismaIndicator);
  });

  it('liveness returns the result of an empty check', async () => {
    const result = await controller.liveness();
    expect(health.check).toHaveBeenCalledWith([]);
    expect(result).toEqual(okResult);
  });

  it('readiness wires the prisma ping check into terminus', async () => {
    await controller.readiness();
    const arg = health.check.mock.calls[0][0];
    expect(arg).toHaveLength(1);
    await arg[0]();
    expect(prismaIndicator.pingCheck).toHaveBeenCalledWith('database');
  });
});
