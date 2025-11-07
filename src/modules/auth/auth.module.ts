import { Module } from '@nestjs/common';
import { SignupUseCase } from './application/use-cases/signup.use-case';
import { UserModule } from '../user/user.module';
import { AuthController } from './http/auth.controller';
import { LoginUseCase } from './application/use-cases/login.usecase';
import { MeUseCase } from './application/use-cases/me.usecase';
import { RefreshUseCase } from './application/use-cases/refresh.use-case';

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    SignupUseCase,
    LoginUseCase,
    MeUseCase,
    RefreshUseCase,
  ]
})
export class AuthModule {}
