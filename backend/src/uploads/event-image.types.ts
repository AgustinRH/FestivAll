export const EVENT_IMAGE_TIPOS = ['principal', 'cartelera', 'galeria'] as const;
export type EventImageTipo = (typeof EVENT_IMAGE_TIPOS)[number];
export const MAX_GALERIA_IMAGES = 5;
