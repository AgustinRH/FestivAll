import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { IsStrongPassword } from '../../auth/validators/is-strong-password.decorator';
import { RolUsuario } from '../../entities/usuario.entity';

export class CreateUsuarioAdminDto {
  @IsString()
  nombre: string;

  @IsString()
  apellidos: string;

  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsEnum(RolUsuario)
  rol: RolUsuario;

  @IsOptional()
  @IsBoolean()
  emailVerificado?: boolean;
}
