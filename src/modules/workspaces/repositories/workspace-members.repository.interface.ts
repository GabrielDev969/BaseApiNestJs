import { WorkspaceMember } from '../entities/workspace-member.entity';

export interface CreateWorkspaceMemberData {
  userId: string;
  workspaceId: string;
  roleId: string;
}

export interface WorkspaceMemberWithRelations extends WorkspaceMember {
  role: {
    id: string;
    name: string;
    isSystem: boolean;
    permissions: string[]; // permission keys
  };
}

export interface IWorkspaceMembersRepository {
  create(data: CreateWorkspaceMemberData): Promise<WorkspaceMember>;
  findById(id: string): Promise<WorkspaceMember | null>;
  findByUserAndWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceMemberWithRelations | null>;
  findSuperAdminMembership(
    userId: string,
  ): Promise<WorkspaceMemberWithRelations | null>;
  findManyByWorkspace(workspaceId: string): Promise<WorkspaceMember[]>;
  updateRole(id: string, roleId: string): Promise<WorkspaceMember>;
  delete(id: string): Promise<void>;
  countByWorkspace(workspaceId: string): Promise<number>;
}

export const WORKSPACE_MEMBERS_REPOSITORY = Symbol(
  'IWorkspaceMembersRepository',
);
