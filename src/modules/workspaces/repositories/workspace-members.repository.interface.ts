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
    permissions: string[];
  };
}

export abstract class WorkspaceMembersRepository {
  abstract create(data: CreateWorkspaceMemberData): Promise<WorkspaceMember>;
  abstract findById(id: string): Promise<WorkspaceMember | null>;
  abstract findByUserAndWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceMemberWithRelations | null>;
  abstract findSuperAdminMembership(
    userId: string,
  ): Promise<WorkspaceMemberWithRelations | null>;
  abstract findManyByWorkspace(workspaceId: string): Promise<WorkspaceMember[]>;
  abstract updateRole(id: string, roleId: string): Promise<WorkspaceMember>;
  abstract delete(id: string): Promise<void>;
  abstract countByWorkspace(workspaceId: string): Promise<number>;
}
