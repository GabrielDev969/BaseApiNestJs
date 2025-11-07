import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { IUserRepository } from "src/modules/user/domain/repositories/user.repository";
import { LoginResultDto } from "../../dtos/login-result.dto";

@Injectable()
export class RefreshUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly jwt: JwtService,
  ) {}

  async execute(req: Request): Promise<LoginResultDto> {
    const token = req.cookies?.refreshToken;
    if (!token) throw new UnauthorizedException('Missing refresh token');

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload?.type !== 'refresh' || !payload?.sub || !payload?.email) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // (Opcional) aqui você pode validar versão/jti do refresh no banco de dados
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    // Gera novos tokens (rotacionar refresh é uma boa prática para segurança)
    const accessPayload  = { sub: user.id, email: user.email, role: user.role, type: 'access'  };
    const refreshPayload = { sub: user.id, email: user.email, role: user.role, type: 'refresh' };

    const accessToken = await this.jwt.signAsync(accessPayload as object, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: 60 * 60 * 3, // 3h
    });

    const refreshToken = await this.jwt.signAsync(refreshPayload as object, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: 60 * 60 * 24 * 7, // 7d
    });

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
