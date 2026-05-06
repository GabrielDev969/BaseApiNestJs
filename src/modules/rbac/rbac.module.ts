import { Module } from '@nestjs/common';
import { RolesRepository } from './repositories/roles.repository.interface';
import { PermissionsRepository } from './repositories/permissions.repository.interface';
import { PrismaRolesRepository } from './repositories/prisma-roles.repository';
import { PrismaPermissionsRepository } from './repositories/prisma-permissions.repository';

@Module({
  providers: [
    { provide: RolesRepository, useClass: PrismaRolesRepository },
    { provide: PermissionsRepository, useClass: PrismaPermissionsRepository },
  ],
  exports: [RolesRepository, PermissionsRepository],
})
export class RbacModule {}
