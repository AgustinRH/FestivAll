import { BadRequestException } from '@nestjs/common';
import { toIsoDateOnly } from './evento-activo.util';

/**
 * Normaliza y valida el rango de fechas de un evento (ISO date `YYYY-MM-DD`).
 * @throws BadRequestException si faltan fechas o la fecha fin es anterior al inicio
 */
export function validarFechasEvento(
  fechaInicio: string | Date,
  fechaFin: string | Date,
): { fechaInicio: string; fechaFin: string } {
  const inicio = toIsoDateOnly(fechaInicio);
  const fin = toIsoDateOnly(fechaFin);

  if (!inicio || !fin) {
    throw new BadRequestException(
      'La fecha de inicio y la fecha de fin son obligatorias.',
    );
  }
  if (fin < inicio) {
    throw new BadRequestException(
      'La fecha de fin no puede ser anterior a la fecha de inicio.',
    );
  }

  return { fechaInicio: inicio, fechaFin: fin };
}
