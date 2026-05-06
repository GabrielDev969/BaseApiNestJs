import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';

export interface CreateRoleData {
  name: string;
  description?: string;
  workspaceId: string;
  isSystem?: boolean;
  permissionKeys: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissionKeys?: string[];
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface IRolesRepository {
  create(data: CreateRoleData): Promise<RoleWithPermissions>;
  findById(id: string): Promise<RoleWithPermissions | null>;
  findByIdInWorkspace(
    id: string,
    workspaceId: string,
  ): Promise<RoleWithPermissions | null>;
  findManyByWorkspace(workspaceId: string): Promise<RoleWithPermissions[]>;
  findByNameInWorkspace(
    name: string,
    workspaceId: string,
  ): Promise<Role | null>;
  update(id: string, data: UpdateRoleData): Promise<RoleWithPermissions>;
  delete(id: string): Promise<void>;
  countMembersUsingRole(roleId: string): Promise<number>;
}

export const ROLES_REPOSITORY = Symbol('IRolesRepository');
