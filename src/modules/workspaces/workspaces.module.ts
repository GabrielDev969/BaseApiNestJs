import { Module } from '@nestjs/common';
import { WORKSPACES_REPOSITORY } from './repositories/workspaces.repository.interface';
import { PrismaWorkspacesRepository } from './repositories/prisma-workspaces.repository';
import { CreateWorkspaceUseCase } from './use-cases/create-workspace.use-case';

@Module({
  providers: [
    { provide: WORKSPACES_REPOSITORY, useClass: PrismaWorkspacesRepository },
    CreateWorkspaceUseCase,
  ],
  exports: [WORKSPACES_REPOSITORY, CreateWorkspaceUseCase],
})
export class WorkspacesModule {}
