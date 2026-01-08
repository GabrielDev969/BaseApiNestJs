import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { tap } from 'rxjs/operators';
  import { MetricsService } from '../../modules/monitoring/metrics.service';
  
  @Injectable()
  export class MetricsInterceptor implements NestInterceptor {
    private readonly logger = new Logger('API');
  
    constructor(private metricsService: MetricsService) {}
  
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const req = context.switchToHttp().getRequest();
      const route = `${req.method} ${req.route?.path || req.url}`;
      const start = Date.now();
  
      return next.handle().pipe(
        tap({
          next: () => {
            const res = context.switchToHttp().getResponse();
            const duration = Date.now() - start;
            const { statusCode } = res;
            
            this.metricsService.recordRequest(route, duration, statusCode, false);
            
            if (duration > 1000) {
              this.logger.warn(`⚠️ Rota lenta: ${route} - ${duration}ms`);
            }
          },
          error: (error) => {
            const duration = Date.now() - start;
            const statusCode = error.status || 500;
            
            this.metricsService.recordRequest(route, duration, statusCode, true);
            this.logger.error(`❌ Erro em ${route}: ${error.message}`);
          },
        })
      );
    }
  }