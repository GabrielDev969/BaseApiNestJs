import { PERMISSIONS } from '@modules/rbac/constants/permissions';
import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { CurrentWorkspace } from '@shared/decorators/current-workspace.decorator';
import { RequirePermissions } from '@shared/decorators/require-permissions.decorator';
import { Audit } from '@shared/decorators/audit.decorator';
import { PermissionsGuard } from '@shared/guards/permissions.guard';
import { WorkspaceGuard } from '@shared/guards/workspace.guard';
import type { AuthenticatedUser } from '@shared/types/authenticated-user.type';
import type { WorkspaceContext } from '@shared/types/workspace-context.type';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceResponseDto } from './dto/workspace-response.dto';
import { GetWorkspaceUseCase } from '../use-cases/get-workspace.use-case';
import { ListWorkspacesUseCase } from '../use-cases/list-workspaces.use-case';
import { UpdateWorkspaceUseCase } from '../use-cases/update-workspace.use-case';
import { DeleteWorkspaceUseCase } from '../use-cases/delete-workspace.use-case';

@ApiTags('Workspaces')
@ApiBearerAuth()
@Controller({ path: 'workspaces', version: '1' })
export class WorkspacesController {
  constructor(
    private readonly getWorkspace: GetWorkspaceUseCase,
    private readonly listWorkspaces: ListWorkspacesUseCase,
    private readonly updateWorkspace: UpdateWorkspaceUseCase,
    private readonly deleteWorkspace: DeleteWorkspaceUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List workspaces the current user belongs to' })
  @ApiResponse({ status: 200, type: [WorkspaceResponseDto] })
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkspaceResponseDto[]> {
    return this.listWorkspaces.execute(user.id);
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.WORKSPACE.READ)
  @ApiOperation({ summary: 'Get a workspace by ID' })
  @ApiParam({ name: 'workspaceId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: WorkspaceResponseDto })
  @ApiResponse({ status: 403, description: 'Not a member of this workspace' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async findOne(
    @CurrentWorkspace() workspace: WorkspaceContext,
  ): Promise<WorkspaceResponseDto> {
    return this.getWorkspace.execute(workspace.id);
  }

  @Patch(':workspaceId')
  @UseGuards(WorkspaceGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.WORKSPACE.UPDATE)
  @Audit({ action: 'workspace.updated', resource: 'Workspace' })
  @ApiOperation({ summary: 'Update a workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: WorkspaceResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (admin workspace or missing permission)',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async update(
    @Body() dto: UpdateWorkspaceDto,
    @CurrentWorkspace() workspace: WorkspaceContext,
  ): Promise<WorkspaceResponseDto> {
    return this.updateWorkspace.execute({ id: workspace.id, name: dto.name });
  }

  @Delete(':workspaceId')
  @UseGuards(WorkspaceGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.WORKSPACE.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit({ action: 'workspace.deleted', resource: 'Workspace' })
  @ApiOperation({ summary: 'Soft delete a workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Workspace deleted' })
  @ApiResponse({
    status: 403,
    description: 'Cannot delete admin or personal workspace',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async remove(@CurrentWorkspace() workspace: WorkspaceContext): Promise<void> {
    await this.deleteWorkspace.execute(workspace.id);
  }
}
