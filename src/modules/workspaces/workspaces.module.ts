import { Module } from '@nestjs/common';
import { WORKSPACES_REPOSITORY } from './repositories/workspaces.repository.interface';
import { PrismaWorkspacesRepository } from './repositories/prisma-workspaces.repository';
import { CreateWorkspaceUseCase } from './use-cases/create-workspace.use-case';
import { PrismaWorkspaceMembersRepository } from './repositories/prisma-workspace-members.repository';
import { WORKSPACE_MEMBERS_REPOSITORY } from './repositories/workspace-members.repository.interface';

@Module({
  providers: [
    { provide: WORKSPACES_REPOSITORY, useClass: PrismaWorkspacesRepository },
    {
      provide: WORKSPACE_MEMBERS_REPOSITORY,
      useClass: PrismaWorkspaceMembersRepository,
    },
    CreateWorkspaceUseCase,
  ],
  exports: [
    WORKSPACES_REPOSITORY,
    WORKSPACE_MEMBERS_REPOSITORY,
    CreateWorkspaceUseCase,
  ],
})
export class WorkspacesModule {}
