const PLACEHOLDER = 'https://via.placeholder.com/400x250?text=Evento';

/** URL lista para usar en img/src (rutas locales o absolutas externas). */
export function resolveEventoImageUrl(url: string | null | undefined): string {
  const trimmed = url?.trim();
  if (!trimmed) return PLACEHOLDER;
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
