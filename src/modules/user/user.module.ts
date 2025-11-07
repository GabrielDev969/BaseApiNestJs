import { Module } from '@nestjs/common';
import { IUserRepository } from './domain/repositories/user.repository';
import { PrismaUserRepository } from './infrastructure/database/prisma/prisma-user.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [
        {
            provide: IUserRepository,
            useClass: PrismaUserRepository,
        }
    ],
    exports: [IUserRepository],
})
export class UserModule {}
