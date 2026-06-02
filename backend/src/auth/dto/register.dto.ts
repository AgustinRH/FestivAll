import { IsEmail, IsString } from 'class-validator';
import { IsStrongPassword } from '../validators/is-strong-password.decorator';

/** Registro de cliente; requiere verificación por email antes del primer login. */
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
