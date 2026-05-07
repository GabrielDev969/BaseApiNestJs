import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@shared/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaHealthIndicator } from '../indicators/prisma.indicator';

@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
@Public()
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe — process is alive' })
  @ApiResponse({ status: 200, description: 'Application is running' })
  liveness(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — dependencies are reachable' })
  @ApiResponse({
    status: 200,
    description: 'Application is ready to serve traffic',
  })
  @ApiResponse({ status: 503, description: 'A dependency is down' })
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([() => this.prisma.pingCheck('database')]);
  }
}
