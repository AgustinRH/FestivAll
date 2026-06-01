import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

function isAuthLoginRequest(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/admin/login') ||
    url.includes('/auth/register')
  );
}

function shouldTreat401AsSessionExpired(req: { url: string; headers: { has: (n: string) => boolean } }): boolean {
  if (isAuthLoginRequest(req.url)) return false;
  return req.headers.has('Authorization');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && shouldTreat401AsSessionExpired(req)) {
        auth.handleSessionExpiredFromApi();
      }
      return throwError(() => err);
    }),
  );
};
