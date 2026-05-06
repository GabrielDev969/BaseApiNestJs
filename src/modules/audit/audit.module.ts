import { Module } from '@nestjs/common';
import { AUDIT_LOGS_REPOSITORY } from './repositories/audit-logs.repository.interface';
import { PrismaAuditLogsRepository } from './repositories/prisma-audit-logs.repository';
import { AuditService } from './services/audit.service';
import { ListAuditLogsUseCase } from './use-cases/list-audit-logs.use-case';
import { AuditController } from './http/audit.controller';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';

@Module({
  imports: [WorkspacesModule],
  controllers: [AuditController],
  providers: [
    { provide: AUDIT_LOGS_REPOSITORY, useClass: PrismaAuditLogsRepository },
    AuditService,
    ListAuditLogsUseCase,
  ],
  exports: [AuditService],
})
export class AuditModule {}
