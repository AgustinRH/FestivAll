import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEventoDto {
  @IsInt()
  idCategoria: number;

  @IsString()
  @MinLength(3)
  direccion: string;

  @IsString()
  @MinLength(2)
  localidad: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  provincia?: string;

  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsDateString()
  fechaInicio: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  horaInicio?: string;

  @IsOptional()
  @IsString()
  horaFin?: string;

  @IsNumber()
  @Min(0)
  precio: number;

  @IsInt()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsBoolean()
  destacado?: boolean;

  @IsOptional()
  @IsBoolean()
  soloMayoresEdad?: boolean;

  @IsOptional()
  @IsString()
  imagenUrl?: string;
}
