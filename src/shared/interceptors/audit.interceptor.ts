import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUDIT_KEY, AuditMetadata } from '../decorators/audit.decorator';
import { AuditService } from '@modules/audit/services/audit.service';
import { Request } from 'express';

type AuditRequest = Request & {
  user?: { id: string };
  workspace?: { id: string };
};

const SENSITIVE_FIELDS = [
  'password',
  'passwordhash',
  'refreshtoken',
  'accesstoken',
  'token',
  'secret',
  'twofactorsecret',
  'recoverycodes',
  'authorization',
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMetadata>(AUDIT_KEY, ctx.getHandler());
    if (!meta) return next.handle();

    const req = ctx.switchToHttp().getRequest<AuditRequest>();

    return next.handle().pipe(
      tap({
        next: (response: unknown) => {
          this.recordLog(meta, req, response).catch(() => undefined);
        },
      }),
    );
  }

  private async recordLog(
    meta: AuditMetadata,
    req: AuditRequest,
    response: unknown,
  ): Promise<void> {
    const resourceId = this.extractResourceId(meta, req, response);

    const route = req.route as { path?: string } | undefined;

    await this.audit.log({
      userId: req.user?.id ?? null,
      workspaceId: req.workspace?.id ?? null,
      action: meta.action,
      resource: meta.resource ?? null,
      resourceId,
      metadata: {
        method: req.method,
        path: route?.path ?? req.url,
        params: this.sanitize(req.params),
        query: this.sanitize(req.query),
        body: this.sanitize(req.body),
      },
      ipAddress: req.ip ?? null,
      userAgent: req.headers?.['user-agent'] ?? null,
    });
  }

  private extractResourceId(
    meta: AuditMetadata,
    req: AuditRequest,
    response: unknown,
  ): string | null {
    const field = meta.resourceIdField ?? 'id';
    const source = meta.resourceIdFrom ?? 'response';

    if (source === 'param') {
      const paramValue = req.params[field];
      if (Array.isArray(paramValue)) {
        return paramValue[0] ?? null;
      }
      return paramValue ?? null;
    }

    if (response && typeof response === 'object' && field in response) {
      const value = (response as Record<string, unknown>)[field];
      return typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : null;
    }

    return null;
  }

  private sanitize(value: unknown): unknown {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((v) => this.sanitize(v));

    const clone: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
        clone[key] = '[REDACTED]';
      } else if (val && typeof val === 'object') {
        clone[key] = this.sanitize(val);
      } else {
        clone[key] = val;
      }
    }
    return clone;
  }
}
