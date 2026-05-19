import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { RolUsuario } from '../../entities/usuario.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user || user.rol !== RolUsuario.ADMIN) {
      throw new ForbiddenException('Acceso solo para administradores');
    }
    return true;
  }
}
