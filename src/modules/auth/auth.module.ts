import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './http/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './services/token.service';
import { RegisterUseCase } from './use-cases/register.use-case';
import { LoginUseCase } from './use-cases/login.use-case';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { env } from 'src/config/env.config';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: env.JWT_ACCESS_SECRET,
    }),
    UsersModule,
    SessionsModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    TokenService,
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
  ],
})
export class AuthModule {}
