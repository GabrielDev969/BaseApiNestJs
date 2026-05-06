import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { USERS_REPOSITORY } from '../repositories/users.repository.interface';
import type { IUsersRepository } from '../repositories/users.repository.interface';
import { WORKSPACES_REPOSITORY } from '@modules/workspaces/repositories/workspaces.repository.interface';
import type { IWorkspacesRepository } from '@modules/workspaces/repositories/workspaces.repository.interface';

interface DeleteUserInput {
  id: string;
  workspaceId: string;
}

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly users: IUsersRepository,
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspaces: IWorkspacesRepository,
  ) {}

  async execute(input: DeleteUserInput): Promise<void> {
    const user = await this.users.findByIdInWorkspace(
      input.id,
      input.workspaceId,
    );
    if (!user) throw new NotFoundException('User not found');

    // Cannot delete the workspace owner
    const workspace = await this.workspaces.findById(input.workspaceId);
    if (workspace?.ownerId === input.id) {
      throw new ForbiddenException('Cannot delete the workspace owner');
    }

    await this.users.softDelete(input.id);
  }
}
