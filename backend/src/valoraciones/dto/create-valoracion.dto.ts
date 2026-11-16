import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateValoracionDto {
  @IsInt()
  @Min(1)
  idEvento: number;

  @IsInt()
  @Min(1)
  @Max(5)
  puntuacion: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comentario?: string;
}
