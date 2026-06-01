/**
 * Evita bucles: /login?returnUrl=/login?returnUrl=… y rutas de auth como destino tras login.
 */
export function sanitizePostLoginReturnUrl(raw: string | null | undefined): string {
  const fallback = '/';
  if (raw == null || raw === '') return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;

  let decoded = trimmed;
  try {
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return fallback;
  }

  const path = decoded.split('?')[0].split('#')[0];
  if (isAuthRoutePath(path)) return fallback;

  const lower = decoded.toLowerCase();
  if (
    lower.includes('returnurl=%2flogin') ||
    lower.includes('returnurl=/login') ||
    lower.includes('returnurl=%2fregister')
  ) {
    return fallback;
  }

  return trimmed;
}

/** Tras sesión expirada: no guardar como returnUrl la propia página de login ni variantes. */
export function sanitizeSessionExpiredReturnUrl(routerUrl: string): string | null {
  const noHash = routerUrl.split('#')[0];
  const path = noHash.split('?')[0];
  if (isAuthRoutePath(path)) return null;
  return noHash;
}

function isAuthRoutePath(path: string): boolean {
  return (
    path === '/login' ||
    path === '/register' ||
    path === '/verificar-email' ||
    path === '/olvidar-contrasena' ||
    path === '/restablecer-contrasena' ||
    path === '/festivall-admin'
  );
}
