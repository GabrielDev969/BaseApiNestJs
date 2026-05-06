import { Permission } from '../entities/permission.entity';

export abstract class PermissionsRepository {
  abstract findAll(): Promise<Permission[]>;
  abstract findByKey(key: string): Promise<Permission | null>;
  abstract findManyByKeys(keys: string[]): Promise<Permission[]>;
  abstract findByCategory(category: string): Promise<Permission[]>;
}
