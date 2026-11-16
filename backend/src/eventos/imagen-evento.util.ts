import { Imagen } from '../entities/imagen.entity';
import {
  EventImageTipo,
  MAX_GALERIA_IMAGES,
} from '../uploads/event-image.types';

export function resolveImagenTipo(img: Imagen): EventImageTipo {
  if (img.tipo) return img.tipo;
  return img.esPrincipal ? 'principal' : 'galeria';
}

export function findImagenPorTipo(
  imagenes: Imagen[] | undefined,
  tipo: EventImageTipo,
): Imagen | undefined {
  const list = imagenes ?? [];
  return list.find((i) => resolveImagenTipo(i) === tipo);
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
  tipo: EventImageTipo,
): string | null {
  return findImagenPorTipo(imagenes, tipo)?.url ?? null;
}

export function urlImagenPrincipal(
  imagenes: Imagen[] | undefined,
): string | null {
  return (
    urlImagenPorTipo(imagenes, 'principal') ??
    findImagenPorTipo(imagenes, 'cartelera')?.url ??
    imagenes?.[0]?.url ??
    null
  );
}
