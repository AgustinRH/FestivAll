import { Evento } from '../models';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const MAX_SUFFIX = 120;

export function buildEventoSlug(
  id: number,
  titulo: string,
  localidad?: string | null,
): string {
  const parts = [slugify(titulo)];
  if (localidad?.trim()) parts.push(slugify(localidad));
  let suffix = parts.filter(Boolean).join('-') || 'evento';
  if (suffix.length > MAX_SUFFIX) {
    suffix = suffix.slice(0, MAX_SUFFIX).replace(/-+$/, '');
  }
  return `${id}-${suffix}`;
}

export function parseEventoIdFromSlug(param: string | number): number | null {
  const m = String(param ?? '')
    .trim()
    .match(/^(\d+)/);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function getEventoSlugSegment(
  evento: Pick<Evento, 'id' | 'slug' | 'titulo'> & { ubicacion?: { localidad?: string } | null },
): string {
  if (evento.slug) return evento.slug;
  return buildEventoSlug(evento.id, evento.titulo, evento.ubicacion?.localidad);
}

export function eventoPath(evento: Parameters<typeof getEventoSlugSegment>[0]): string[] {
  return ['/eventos', getEventoSlugSegment(evento)];
}

export function opinionEventoPath(
  evento: Pick<Evento, 'id' | 'slug' | 'titulo'> & {
    localidad?: string | null;
    ubicacion?: { localidad?: string } | null;
  },
): string[] {
  const loc = evento.localidad ?? evento.ubicacion?.localidad;
  return ['/opiniones', getEventoSlugSegment({ ...evento, ubicacion: loc ? { localidad: loc } : null })];
}
