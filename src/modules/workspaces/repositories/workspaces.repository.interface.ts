import { Workspace } from '../entities/workspace.entity';

export interface CreateWorkspaceWithDefaultsData {
  name: string;
  slug: string;
  isPersonal: boolean;
  ownerId: string;
  defaultRoles: Array<{
    name: string;
    description?: string;
    isSystem: boolean;
    permissionKeys: string[];
  }>;
  ownerRoleName: string;
}

export interface CreateWorkspaceResult {
  workspace: Workspace;
  ownerRoleId: string;
}

export interface IWorkspacesRepository {
  createWithDefaults(
    data: CreateWorkspaceWithDefaultsData,
  ): Promise<CreateWorkspaceResult>;
  findById(id: string): Promise<Workspace | null>;
  findBySlug(slug: string): Promise<Workspace | null>;
  findByUserId(userId: string): Promise<Workspace[]>;
  update(id: string, data: Partial<Workspace>): Promise<Workspace>;
  softDelete(id: string): Promise<void>;
}

export const WORKSPACES_REPOSITORY = Symbol('IWorkspacesRepository');
