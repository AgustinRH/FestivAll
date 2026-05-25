/** Fecha de referencia para saber si el evento sigue vigente (fin del evento o inicio si es de un día). */
export function fechaReferenciaEvento(evento: {
  fechaInicio: string;
  fechaFin?: string | null;
}): string {
  return evento.fechaFin || evento.fechaInicio;
}

export function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function eventoEstaActivo(evento: {
  fechaInicio: string;
  fechaFin?: string | null;
}): boolean {
  return fechaReferenciaEvento(evento) >= hoyIso();
}
