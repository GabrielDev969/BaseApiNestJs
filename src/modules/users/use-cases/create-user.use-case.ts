import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { IUsersRepository } from '../repositories/users.repository.interface';
import { USERS_REPOSITORY } from '../repositories/users.repository.interface';

import { UserResponseDto } from '../http/dto/user-response.dto';
import { CryptoUtil } from '@shared/utils/crypto.util';
import { WORKSPACE_MEMBERS_REPOSITORY } from '@modules/workspaces/repositories/workspace-members.repository.interface';
import type { IWorkspaceMembersRepository } from '@modules/workspaces/repositories/workspace-members.repository.interface';
import { ROLES_REPOSITORY } from '@modules/rbac/repositories/roles.repository.interface';
import type { IRolesRepository } from '@modules/rbac/repositories/roles.repository.interface';

interface CreateUserInput {
  workspaceId: string;
  createdBy: string;
  email: string;
  name: string;
  password: string;
  roleId: string;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly users: IUsersRepository,
    @Inject(WORKSPACE_MEMBERS_REPOSITORY)
    private readonly members: IWorkspaceMembersRepository,
    @Inject(ROLES_REPOSITORY)
    private readonly roles: IRolesRepository,
  ) {}

  async execute(input: CreateUserInput): Promise<UserResponseDto> {
    // 1. Check email uniqueness globally (User is a global entity)
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictException('Email already in use');

    // 2. Validate the role belongs to the workspace
    const role = await this.roles.findByIdInWorkspace(
      input.roleId,
      input.workspaceId,
    );
    if (!role) throw new NotFoundException('Role not found in this workspace');

    // 3. Create the user
    const passwordHash = await CryptoUtil.hashPassword(input.password);
    const user = await this.users.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });

    // 4. Add as a member of the workspace with the given role
    await this.members.create({
      userId: user.id,
      workspaceId: input.workspaceId,
      roleId: input.roleId,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
