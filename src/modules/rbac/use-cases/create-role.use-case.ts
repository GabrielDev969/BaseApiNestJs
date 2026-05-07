import { Injectable, ConflictException } from '@nestjs/common';
import { RolesRepository } from '../repositories/roles.repository.interface';
import { RoleResponseDto, toRoleDto } from '../http/dto/role-response.dto';

interface CreateRoleInput {
  workspaceId: string;
  name: string;
  description?: string;
  permissionKeys: string[];
}

@Injectable()
export class CreateRoleUseCase {
  constructor(private roles: RolesRepository) {}

  async execute(input: CreateRoleInput): Promise<RoleResponseDto> {
    const existing = await this.roles.findByNameInWorkspace(
      input.name,
      input.workspaceId,
    );
    if (existing)
      throw new ConflictException(`Role "${input.name}" already exists`);

    const role = await this.roles.create({
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      permissionKeys: input.permissionKeys,
      isSystem: false,
    });

    return toRoleDto(role);
  }
}
