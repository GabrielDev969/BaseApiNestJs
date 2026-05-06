import { Module } from '@nestjs/common';
import { WorkspacesRepository } from './repositories/workspaces.repository.interface';
import { PrismaWorkspacesRepository } from './repositories/prisma-workspaces.repository';
import { CreateWorkspaceUseCase } from './use-cases/create-workspace.use-case';
import { PrismaWorkspaceMembersRepository } from './repositories/prisma-workspace-members.repository';
import { WorkspaceMembersRepository } from './repositories/workspace-members.repository.interface';

@Module({
  providers: [
    { provide: WorkspacesRepository, useClass: PrismaWorkspacesRepository },
    {
      provide: WorkspaceMembersRepository,
      useClass: PrismaWorkspaceMembersRepository,
    },
    CreateWorkspaceUseCase,
  ],
  exports: [
    WorkspacesRepository,
    WorkspaceMembersRepository,
    CreateWorkspaceUseCase,
  ],
})
export class WorkspacesModule {}
