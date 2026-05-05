import { Module } from '@nestjs/common';
import { USERS_REPOSITORY } from './repositories/users.repository.interface';
import { PrismaUsersRepository } from './repositories/prisma-users.repository';

@Module({
  providers: [{ provide: USERS_REPOSITORY, useClass: PrismaUsersRepository }],
  exports: [USERS_REPOSITORY],
})
export class UsersModule {}
