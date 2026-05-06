import { Module } from '@nestjs/common';
import { AuditLogsRepository } from './repositories/audit-logs.repository.interface';
import { PrismaAuditLogsRepository } from './repositories/prisma-audit-logs.repository';
import { AuditService } from './services/audit.service';
import { ListAuditLogsUseCase } from './use-cases/list-audit-logs.use-case';
import { AuditController } from './http/audit.controller';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';

@Module({
  imports: [WorkspacesModule],
  controllers: [AuditController],
  providers: [
    { provide: AuditLogsRepository, useClass: PrismaAuditLogsRepository },
    AuditService,
    ListAuditLogsUseCase,
  ],
  exports: [AuditService],
})
export class AuditModule {}
