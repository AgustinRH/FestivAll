import { RolUsuario } from '../entities/usuario.entity';

/** Indica si el rol puede acceder al panel `/festivall-admin`. */
export function tieneAccesoAdmin(rol: RolUsuario): boolean {
  return rol === RolUsuario.ADMIN || rol === RolUsuario.OWNER;
}

/** Rol con permisos máximos (gestión de otros admins). */
export function esPropietario(rol: RolUsuario): boolean {
  return rol === RolUsuario.OWNER;
}
