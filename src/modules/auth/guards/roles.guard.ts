import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from 'src/modules/user/domain/enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // se a rota não exige role, libera (mas ainda precisa estar autenticado pelo AuthCookieGuard)
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) throw new UnauthorizedException('Unauthenticated');

    // suporte a role única ou múltiplas
    if (!required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
