import { ApiProperty } from '@nestjs/swagger';
import { RoleWithPermissions } from '../../repositories/roles.repository.interface';

export class RolePermissionDto {
  @ApiProperty()
  key: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  category: string;
}

export class RoleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  isSystem: boolean;

  @ApiProperty({ type: [RolePermissionDto] })
  permissions: RolePermissionDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export function toRoleDto(role: RoleWithPermissions): RoleResponseDto {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions: role.permissions.map((p) => ({
      key: p.key,
      description: p.description,
      category: p.category,
    })),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}
