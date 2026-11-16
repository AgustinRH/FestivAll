import { IsIn } from 'class-validator';
import { EstadoModeracionValoracion } from '../../entities/valoracion.entity';

export class UpdateEstadoValoracionDto {
  @IsIn(
    [EstadoModeracionValoracion.APROBADO, EstadoModeracionValoracion.RECHAZADO],
    {
      message: 'estado debe ser aprobado o rechazado',
    },
  )
  estado:
    | EstadoModeracionValoracion.APROBADO
    | EstadoModeracionValoracion.RECHAZADO;
}
