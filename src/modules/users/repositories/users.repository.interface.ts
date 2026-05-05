import { User } from '../entities/user.entity';

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash?: string;
}

export interface IUsersRepository {
  create(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<User>;
  softDelete(id: string): Promise<void>;
}

export const USERS_REPOSITORY = Symbol('IUsersRepository');
