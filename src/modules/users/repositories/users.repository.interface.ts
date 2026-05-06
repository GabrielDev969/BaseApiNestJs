import { User } from '../entities/user.entity';

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash?: string;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  recoveryCodes?: string | null;
}

export interface FindManyByWorkspaceParams {
  workspaceId: string;
  page: number;
  limit: number;
  search?: string;
}

export interface FindManyResult {
  items: User[];
  total: number;
}

export abstract class UsersRepository {
  abstract create(data: CreateUserData): Promise<User>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByIdInWorkspace(
    id: string,
    workspaceId: string,
  ): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findManyByWorkspace(
    params: FindManyByWorkspaceParams,
  ): Promise<FindManyResult>;
  abstract update(id: string, data: UpdateUserData): Promise<User>;
  abstract softDelete(id: string): Promise<void>;
}
