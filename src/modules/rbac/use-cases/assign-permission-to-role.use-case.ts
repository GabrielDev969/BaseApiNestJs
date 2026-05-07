import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { RolesRepository } from '../repositories/roles.repository.interface';
import { PermissionsRepository } from '../repositories/permissions.repository.interface';
import { RoleResponseDto, toRoleDto } from '../http/dto/role-response.dto';

interface AssignPermissionInput {
  roleId: string;
  workspaceId: string;
  permissionKey: string;
}

@Injectable()
export class AssignPermissionToRoleUseCase {
  constructor(
    private roles: RolesRepository,
    private permissions: PermissionsRepository,
  ) {}

  async execute(input: AssignPermissionInput): Promise<RoleResponseDto> {
    const role = await this.roles.findByIdInWorkspace(
      input.roleId,
      input.workspaceId,
    );
    if (!role) throw new NotFoundException('Role not found in this workspace');
    if (role.isSystem)
      throw new ForbiddenException('System roles cannot be modified');

    const permission = await this.permissions.findByKey(input.permissionKey);
    if (!permission)
      throw new NotFoundException(
        `Permission "${input.permissionKey}" does not exist`,
      );

    if (role.permissions.some((p) => p.key === input.permissionKey)) {
      return toRoleDto(role);
    }

    const updated = await this.roles.update(input.roleId, {
      permissionKeys: [
        ...role.permissions.map((p) => p.key),
        input.permissionKey,
      ],
    });

    return toRoleDto(updated);
  }
}
