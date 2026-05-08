import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { env } from './config/env.config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '@shared/database/prisma.module';
import { Request, Response } from 'express';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import { AllExceptionsFilter } from '@shared/filters/all-exceptions.filter';
import { AuditModule } from '@modules/audit/audit.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { RbacModule } from '@modules/rbac/rbac.module';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { InvitationsModule } from '@modules/invitations/invitations.module';
import { HealthModule } from '@modules/health/health.module';
import { OAuthModule } from '@modules/oauth/oauth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        serializers: {
          req: (req: Request & { id?: string }) => ({
            method: req.method,
            url: req.url,
            id: req.id,
          }),
          res: (res: Response) => ({
            statusCode: res.statusCode,
          }),
        },
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: env.THROTTLE_TTL * 1000,
          limit: env.THROTTLE_LIMIT,
        },
      ],
      skipIf: () => env.NODE_ENV === 'test',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    RbacModule,
    SessionsModule,
    InvitationsModule,
    AuditModule,
    HealthModule,
    OAuthModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
