import { RolUsuario } from '../entities/usuario.entity';

export function tieneAccesoAdmin(rol: RolUsuario): boolean {
  return rol === RolUsuario.ADMIN || rol === RolUsuario.OWNER;
}

export function esPropietario(rol: RolUsuario): boolean {
  return rol === RolUsuario.OWNER;
}
