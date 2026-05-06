import { Module } from '@nestjs/common';
import { ROLES_REPOSITORY } from './repositories/roles.repository.interface';
import { PERMISSIONS_REPOSITORY } from './repositories/permissions.repository.interface';
import { PrismaRolesRepository } from './repositories/prisma-roles.repository';
import { PrismaPermissionsRepository } from './repositories/prisma-permissions.repository';

@Module({
  providers: [
    { provide: ROLES_REPOSITORY, useClass: PrismaRolesRepository },
    { provide: PERMISSIONS_REPOSITORY, useClass: PrismaPermissionsRepository },
  ],
  exports: [ROLES_REPOSITORY, PERMISSIONS_REPOSITORY],
})
export class RbacModule {}
