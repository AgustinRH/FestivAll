import { HttpErrorResponse } from '@angular/common/http';

export function getHttpErrorMessage(err: HttpErrorResponse, fallback: string): string {
  if (err.status === 0) {
    return 'No se puede conectar al servidor. ¿Está el backend en marcha? (cd backend && npm run start:dev)';
  }
  const msg = err.error?.message;
  if (Array.isArray(msg)) {
    return msg.join('. ');
  }
  if (typeof msg === 'string') {
    return msg;
  }
  return fallback;
}
