import { User } from '../entities/user.entity';

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash?: string;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
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

export interface IUsersRepository {
  create(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByIdInWorkspace(id: string, workspaceId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findManyByWorkspace(
    params: FindManyByWorkspaceParams,
  ): Promise<FindManyResult>;
  update(id: string, data: UpdateUserData): Promise<User>;
  softDelete(id: string): Promise<void>;
}

export const USERS_REPOSITORY = Symbol('IUsersRepository');
