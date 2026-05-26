/** Normaliza fechas de la API (string o Date) a YYYY-MM-DD. */
export function toIsoDateOnly(value: string | Date | null | undefined): string {
  if (value == null) return '';
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** Último día del evento (fecha_fin, obligatoria). */
export function fechaReferenciaEvento(evento: {
  fechaFin: string | Date;
}): string {
  return toIsoDateOnly(evento.fechaFin);
}

export function hoyIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function eventoHaPasado(evento: {
  fechaFin: string | Date;
}): boolean {
  return fechaReferenciaEvento(evento) < hoyIso();
}
