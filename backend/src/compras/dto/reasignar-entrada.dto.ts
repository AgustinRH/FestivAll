import { IsInt, Min } from 'class-validator';

export class ReasignarEntradaDto {
  @IsInt()
  @Min(1)
  idUsuario: number;
}
