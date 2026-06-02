import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

/** Endpoints protegidos con `JwtAuthGuard`. */
export function ApiJwtAuth() {
  return applyDecorators(
    ApiBearerAuth('jwt'),
    ApiUnauthorizedResponse({ description: 'JWT ausente o inválido' }),
  );
}

/** Endpoints con `JwtAuthGuard` + `AdminGuard`. */
export function ApiAdminAuth() {
  return applyDecorators(
    ApiJwtAuth(),
    ApiForbiddenResponse({ description: 'Se requiere rol de administrador' }),
  );
}
