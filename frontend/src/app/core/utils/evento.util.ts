/** Fecha de referencia: fin del evento o inicio si es de un solo día. */
export function fechaReferenciaEvento(evento: {
  fechaInicio: string;
  fechaFin?: string | null;
}): string {
  return evento.fechaFin || evento.fechaInicio;
}

export function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function eventoHaPasado(evento: {
  fechaInicio: string;
  fechaFin?: string | null;
}): boolean {
  return fechaReferenciaEvento(evento) < hoyIso();
}
