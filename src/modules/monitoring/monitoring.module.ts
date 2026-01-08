import { Module, Global } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MonitoringController } from './monitoring.controller';

@Global()
@Module({
  providers: [MetricsService],
  controllers: [MonitoringController],
  exports: [MetricsService],
})
export class MonitoringModule {}