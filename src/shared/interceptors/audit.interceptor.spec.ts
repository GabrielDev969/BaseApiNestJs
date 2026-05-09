import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from '@modules/audit/services/audit.service';
import { AUDIT_KEY, AuditMetadata } from '../decorators/audit.decorator';

describe('AuditInterceptor', () => {
  let reflector: Reflector;
  let audit: jest.Mocked<Pick<AuditService, 'log'>>;
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    reflector = new Reflector();
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    interceptor = new AuditInterceptor(
      reflector,
      audit as unknown as AuditService,
    );
  });

  function buildContext(
    meta: AuditMetadata | undefined,
    req: Record<string, unknown>,
  ): ExecutionContext {
    const handler = () => undefined;
    if (meta) Reflect.defineMetadata(AUDIT_KEY, meta, handler);

    return {
      getHandler: () => handler,
      getClass: () => class C {},
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
        getNext: () => undefined,
      }),
      getType: () => 'http',
    } as unknown as ExecutionContext;
  }

  it('skips logging when the handler has no @Audit metadata', async () => {
    const ctx = buildContext(undefined, { method: 'GET' });
    const next: CallHandler = { handle: () => of({ id: 'r1' }) };

    await firstValueFrom(interceptor.intercept(ctx, next));

    expect(audit.log).not.toHaveBeenCalled();
  });

  it('records request metadata, sanitizes secrets and resolves resourceId from response', async () => {
    const ctx = buildContext(
      { action: 'user.update', resource: 'user' },
      {
        method: 'PATCH',
        url: '/api/v1/users/u1',
        route: { path: '/users/:id' },
        params: { id: 'u1' },
        query: {},
        body: { name: 'Jane', password: 'secret', token: 'abc' },
        headers: { 'user-agent': 'jest' },
        ip: '127.0.0.1',
        user: { id: 'caller-id' },
        workspace: { id: 'w1' },
      },
    );
    const next: CallHandler = {
      handle: () => of({ id: 'u1', name: 'Jane' }),
    };

    await firstValueFrom(interceptor.intercept(ctx, next));
    await new Promise((r) => setImmediate(r));

    expect(audit.log).toHaveBeenCalledTimes(1);
    const payload = audit.log.mock.calls[0][0];
    expect(payload).toMatchObject({
      userId: 'caller-id',
      workspaceId: 'w1',
      action: 'user.update',
      resource: 'user',
      resourceId: 'u1',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });
    expect(payload.metadata).toMatchObject({
      method: 'PATCH',
      path: '/users/:id',
      body: { name: 'Jane', password: '[REDACTED]', token: '[REDACTED]' },
    });
  });

  it('reads resourceId from params when configured with resourceIdFrom: param', async () => {
    const ctx = buildContext(
      {
        action: 'user.delete',
        resource: 'user',
        resourceIdFrom: 'param',
        resourceIdField: 'id',
      },
      {
        method: 'DELETE',
        url: '/api/v1/users/u1',
        params: { id: 'u1' },
        query: {},
        body: {},
        headers: {},
      },
    );
    const next: CallHandler = { handle: () => of(undefined) };

    await firstValueFrom(interceptor.intercept(ctx, next));
    await new Promise((r) => setImmediate(r));

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'u1' }),
    );
  });
});
