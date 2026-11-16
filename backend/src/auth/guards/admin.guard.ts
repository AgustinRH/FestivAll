import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RolUsuario } from '../../entities/usuario.entity';
import { tieneAccesoAdmin } from '../roles.util';

type RequestUser = { rol: RolUsuario };

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    if (!user || !tieneAccesoAdmin(user.rol)) {
      throw new ForbiddenException('Acceso solo para administradores');
    }
    return true;
  }
}
