import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { sanitizeSessionExpiredReturnUrl } from '../utils/safe-return-url';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  const returnUrl = sanitizeSessionExpiredReturnUrl(state.url);
  void router.navigate(['/login'], {
    queryParams: returnUrl ? { returnUrl } : {},
  });
  return false;
};
