import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { tap } from 'rxjs/operators';
  
  @Injectable()
  export class PerformanceInterceptor implements NestInterceptor {
    private readonly logger = new Logger('Performance');
  
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const req = context.switchToHttp().getRequest();
      const { method, url, ip } = req;
      const userAgent = req.get('user-agent') || '';
      const start = Date.now();
  
      return next.handle().pipe(
        tap({
          next: () => {
            const res = context.switchToHttp().getResponse();
            const duration = Date.now() - start;
            const { statusCode } = res;
  
            // Log formatado
            this.logger.log(
              `${method} ${url} ${statusCode} - ${duration}ms - ${ip} - ${userAgent}`
            );
  
            // Alerta para requisições lentas (> 1000ms)
            if (duration > 1000) {
              this.logger.warn(
                `⚠️  SLOW REQUEST: ${method} ${url} took ${duration}ms`
              );
            }
  
            // Alerta para requisições muito lentas (> 3000ms)
            if (duration > 3000) {
              this.logger.error(
                `🔴 VERY SLOW REQUEST: ${method} ${url} took ${duration}ms`
              );
            }
          },
          error: (error) => {
            const duration = Date.now() - start;
            this.logger.error(
              `${method} ${url} ERROR - ${duration}ms - ${error.message}`
            );
          },
        })
      );
    }
  }