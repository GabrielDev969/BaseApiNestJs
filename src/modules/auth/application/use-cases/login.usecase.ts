import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { IUserRepository } from "src/modules/user/domain/repositories/user.repository";
import { LoginDto } from "../../dtos/auth.dto";
import { User } from "src/modules/user/domain/entities/user.entity";
import { compare } from "bcryptjs";
import { LoginResultDto } from "../../dtos/login-result.dto";

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly jwt: JwtService,
  ) {}

  async execute(dto: LoginDto): Promise<LoginResultDto> {
    const user: User | null = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const accessPayload = { sub: user.id, email: user.email, role: user.role, type: 'access' };
    const refreshPayload = { sub: user.id, email: user.email, role: user.role, type: 'refresh' };

    const accessToken = await this.jwt.signAsync(accessPayload as object, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: 60 * 60 * 3 });

    const refreshToken = await this.jwt.signAsync(refreshPayload as object, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: 60 * 60 * 24 * 7 });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
      refreshToken,
    };
  }
}