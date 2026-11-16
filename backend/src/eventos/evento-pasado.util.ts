import { fechaReferenciaEvento, hoyIso } from './evento-activo.util';

/** Finalizado cuando el último día (fecha_fin) es anterior a hoy. */
export function eventoHaPasado(evento: { fechaFin: string | Date }): boolean {
  return fechaReferenciaEvento(evento) < hoyIso();
}
