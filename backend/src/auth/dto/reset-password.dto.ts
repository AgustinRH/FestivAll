import { IsString, MinLength } from 'class-validator';
import { IsStrongPassword } from '../validators/is-strong-password.decorator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  token: string;

  @IsStrongPassword()
  newPassword: string;
}
