import { IsEmail, IsString } from 'class-validator';

/** Credenciales de inicio de sesión (usuario o admin). */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
