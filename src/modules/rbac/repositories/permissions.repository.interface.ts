import { Permission } from '../entities/permission.entity';

export interface IPermissionsRepository {
  findAll(): Promise<Permission[]>;
  findByKey(key: string): Promise<Permission | null>;
  findManyByKeys(keys: string[]): Promise<Permission[]>;
  findByCategory(category: string): Promise<Permission[]>;
}

export const PERMISSIONS_REPOSITORY = Symbol('IPermissionsRepository');
