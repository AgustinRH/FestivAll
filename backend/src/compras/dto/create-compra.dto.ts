import { Equals, IsBoolean, IsInt, Min } from 'class-validator';

export class CreateCompraDto {
  @IsInt()
  idEvento: number;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsBoolean()
  @Equals(true, { message: 'Debes aceptar los términos y condiciones de compra' })
  aceptoTerminos: boolean;
}
