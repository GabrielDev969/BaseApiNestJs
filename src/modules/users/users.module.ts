import { Module } from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository.interface';
import { PrismaUsersRepository } from './repositories/prisma-users.repository';
import { ListUsersUseCase } from './use-cases/list-users.use-case';
import { GetUserByIdUseCase } from './use-cases/get-user-by-id.use-case';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { UpdateUserUseCase } from './use-cases/update-user.use-case';
import { DeleteUserUseCase } from './use-cases/delete-user.use-case';
import { AnonymizeExpiredUsersUseCase } from './use-cases/anonymize-expired-users.use-case';
import { MaintenanceProcessor } from './maintenance/maintenance.processor';
import { MaintenanceScheduler } from './maintenance/maintenance.scheduler';
import { UsersController } from './http/users.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { RbacModule } from '@modules/rbac/rbac.module';

@Module({
  imports: [WorkspacesModule, RbacModule],
  controllers: [UsersController],
  providers: [
    { provide: UsersRepository, useClass: PrismaUsersRepository },
    ListUsersUseCase,
    GetUserByIdUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    AnonymizeExpiredUsersUseCase,
    MaintenanceProcessor,
    MaintenanceScheduler,
  ],
  exports: [UsersRepository],
})
export class UsersModule {}
