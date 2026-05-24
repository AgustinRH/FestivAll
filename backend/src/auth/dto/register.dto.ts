import { IsEmail, IsString } from 'class-validator';
import { IsStrongPassword } from '../validators/is-strong-password.decorator';

export class RegisterDto {
  @IsString()
  nombre: string;

  @IsString()
  apellidos: string;

  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;
}
