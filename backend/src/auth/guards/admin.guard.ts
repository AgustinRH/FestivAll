import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { tieneAccesoAdmin } from '../roles.util';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user || !tieneAccesoAdmin(user.rol)) {
      throw new ForbiddenException('Acceso solo para administradores');
    }
    return true;
  }
}
