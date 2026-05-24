import { IsString } from 'class-validator';
import { IsStrongPassword } from '../validators/is-strong-password.decorator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsStrongPassword()
  newPassword: string;
}
