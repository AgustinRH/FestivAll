import { BadRequestException } from '@nestjs/common';
import { toIsoDateOnly } from './evento-activo.util';

export function validarFechasEvento(
  fechaInicio: string | Date,
  fechaFin: string | Date,
): { fechaInicio: string; fechaFin: string } {
  const inicio = toIsoDateOnly(fechaInicio);
  const fin = toIsoDateOnly(fechaFin);

  if (!inicio || !fin) {
    throw new BadRequestException('La fecha de inicio y la fecha de fin son obligatorias.');
  }
  if (fin < inicio) {
    throw new BadRequestException(
      'La fecha de fin no puede ser anterior a la fecha de inicio.',
    );
  }

  return { fechaInicio: inicio, fechaFin: fin };
}
