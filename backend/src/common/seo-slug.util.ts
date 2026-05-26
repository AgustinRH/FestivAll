/** Slug URL-safe para localidades, categorías, etc. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const EVENTO_SLUG_MAX_SUFFIX = 120;

/** Ruta pública: `{id}-{titulo-localidad}` (p. ej. 100-concierto-alejandro-sanz-almeria). */
export function buildEventoSlug(
  id: number,
  titulo: string,
  localidad?: string | null,
): string {
  const parts = [slugify(titulo)];
  if (localidad?.trim()) parts.push(slugify(localidad));
  let suffix = parts.filter(Boolean).join('-') || 'evento';
  if (suffix.length > EVENTO_SLUG_MAX_SUFFIX) {
    suffix = suffix.slice(0, EVENTO_SLUG_MAX_SUFFIX).replace(/-+$/, '');
  }
  return `${id}-${suffix}`;
}

/** Extrae el ID numérico del inicio del parámetro de ruta (slug o id solo). */
export function parseEventoIdFromSlug(param: string | number): number | null {
  const m = String(param ?? '')
    .trim()
    .match(/^(\d+)/);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}
