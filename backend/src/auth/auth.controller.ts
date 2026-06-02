import { Body, Controller, Get, Post, Put, Query, UseGuards, Request } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiJwtAuth } from '../common/swagger.decorators';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registro de usuario (envía email de verificación)' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verificar cuenta con token del email' })
  @ApiQuery({ name: 'token', required: true })
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Reenviar email de verificación' })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar restablecimiento de contraseña por email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña con token del email' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @ApiJwtAuth()
  @Post('request-password-reset')
  @ApiOperation({ summary: 'Solicitar reset de contraseña (usuario autenticado)' })
  requestPasswordResetForMe(@Request() req: { user: { id: number } }) {
    return this.authService.requestPasswordResetForUser(req.user.id);
  }

  @Post('login')
  @ApiOperation({ summary: 'Inicio de sesión de usuario' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Inicio de sesión de administrador' })
  adminLogin(@Body() dto: LoginDto) {
    return this.authService.login(dto, true);
  }

  @UseGuards(JwtAuthGuard)
  @ApiJwtAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  getProfile(@Request() req: { user: { id: number } }) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiJwtAuth()
  @Put('change-password')
  @ApiOperation({ summary: 'Cambiar contraseña (usuario autenticado)' })
  changePassword(
    @Request() req: { user: { id: number } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, dto);
  }
}
