import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ListAuditLogsUseCase } from '../use-cases/list-audit-logs.use-case';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { WorkspaceGuard } from '@shared/guards/workspace.guard';
import { PermissionsGuard } from '@shared/guards/permissions.guard';
import { RequirePermissions } from '@shared/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@modules/rbac/constants/permissions';
import { PaginatedResponseDto } from '@shared/dto/paginated-response.dto';
import type { WorkspaceContext } from '@shared/types/workspace-context.type';
import { CurrentWorkspace } from '@shared/decorators/current-workspace.decorator';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller({ path: 'audit-logs', version: '1' })
@UseGuards(WorkspaceGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly listAuditLogs: ListAuditLogsUseCase) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT.READ)
  @ApiOperation({ summary: 'List audit logs in the workspace' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto<AuditLogResponseDto> })
  async list(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<PaginatedResponseDto<AuditLogResponseDto>> {
    return this.listAuditLogs.execute({
      workspaceId: workspace.id,
      userId: query.userId,
      action: query.action,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      limit: query.limit,
    });
  }
}
