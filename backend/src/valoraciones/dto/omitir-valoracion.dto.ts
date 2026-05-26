import { IsInt, Min } from 'class-validator';

export class OmitirValoracionDto {
  @IsInt()
  @Min(1)
  idEvento: number;
}
