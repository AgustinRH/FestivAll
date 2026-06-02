import { Imagen } from '../models';

export type EventoImagenTipo = 'principal' | 'cartelera' | 'galeria';

export const MAX_GALERIA_IMAGES = 5;

export function resolveImagenTipo(img: Imagen): EventoImagenTipo {
  if (img.tipo) return img.tipo;
  return img.esPrincipal ? 'principal' : 'galeria';
}

export function findImagenPorTipo(
  imagenes: Imagen[] | undefined,
  tipo: EventoImagenTipo,
): Imagen | undefined {
  return (imagenes ?? []).find((i) => resolveImagenTipo(i) === tipo);
}

export function listGaleria(imagenes: Imagen[] | undefined): Imagen[] {
  const bySlot = new Map<number, Imagen>();
  for (const img of imagenes ?? []) {
    if (resolveImagenTipo(img) !== 'galeria' || !img.url?.trim()) continue;
    const slot = img.orden ?? 0;
    if (!bySlot.has(slot)) {
      bySlot.set(slot, img);
    }
  }
  return [...bySlot.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, img]) => img)
    .slice(0, MAX_GALERIA_IMAGES);
}

export function urlImagenPorTipo(
  imagenes: Imagen[] | undefined,
  tipo: EventoImagenTipo,
): string | null {
  return findImagenPorTipo(imagenes, tipo)?.url ?? null;
}

/** Imagen para listados y tarjetas: principal, si no cartelera, si no la primera disponible. */
export function urlImagenListado(imagenes: Imagen[] | undefined): string | null {
  return (
    urlImagenPorTipo(imagenes, 'principal') ??
    urlImagenPorTipo(imagenes, 'cartelera') ??
    imagenes?.[0]?.url ??
    null
  );
}
