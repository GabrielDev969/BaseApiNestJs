import { Module } from '@nestjs/common';
import { SessionsController } from './http/sessions.controller';
import { SessionsRepository } from './repositories/sessions.repository.interface';
import { PrismaSessionsRepository } from './repositories/prisma-sessions.repository';
import { CreateSessionUseCase } from './use-cases/create-session.use-case';
import { ListSessionsUseCase } from './use-cases/list-sessions.use-case';
import { RevokeSessionUseCase } from './use-cases/revoke-session.use-case';
import { RevokeAllSessionsUseCase } from './use-cases/revoke-all-sessions.use-case';

@Module({
  controllers: [SessionsController],
  providers: [
    {
      provide: SessionsRepository,
      useClass: PrismaSessionsRepository,
    },
    CreateSessionUseCase,
    ListSessionsUseCase,
    RevokeSessionUseCase,
    RevokeAllSessionsUseCase,
  ],
  exports: [SessionsRepository, CreateSessionUseCase, RevokeSessionUseCase],
})
export class SessionsModule {}
