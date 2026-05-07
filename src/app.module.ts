import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { env } from './config/env.config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '@shared/database/prisma.module';
import { Request, Response } from 'express';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import { AuditModule } from '@modules/audit/audit.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { RbacModule } from '@modules/rbac/rbac.module';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { InvitationsModule } from '@modules/invitations/invitations.module';

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
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    RbacModule,
    SessionsModule,
    InvitationsModule,
    AuditModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
