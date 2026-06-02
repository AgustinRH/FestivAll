import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { Usuario, RolUsuario } from '../entities/usuario.entity';
import { tieneAccesoAdmin } from './roles.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { BCRYPT_ROUNDS } from './password.constants';
import { ConfigService } from '@nestjs/config';

const VERIFICATION_HOURS = 24;
const PASSWORD_RESET_HOURS = 1;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
    private jwtService: JwtService,
    private mailService: MailService,
    private config: ConfigService,
  ) {}

  /**
   * Alta de cliente con hash bcrypt y token de verificación por email (24 h).
   * No devuelve JWT hasta que el email esté verificado.
   */
  async register(dto: RegisterDto) {
    const exists = await this.usuarioRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El email ya está registrado');

    if (!this.mailService.isConfigured()) {
      throw new ServiceUnavailableException(
        'El registro requiere verificación por email, pero el servidor de correo no está configurado.',
      );
    }

    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + VERIFICATION_HOURS * 60 * 60 * 1000);

    const user = this.usuarioRepo.create({
      nombre: dto.nombre,
      apellidos: dto.apellidos,
      email: dto.email,
      password: hash,
      rol: RolUsuario.CLIENTE,
      emailVerificado: false,
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    });
    await this.usuarioRepo.save(user);

    await this.sendVerificationEmail(user, token);

    return {
      message: 'Cuenta creada. Revisa tu email y haz clic en el enlace de verificación para iniciar sesión.',
      email: this.maskEmail(user.email),
    };
  }

  /** Activa la cuenta si el token de verificación es válido y no ha expirado. */
  async verifyEmail(token: string) {
    if (!token?.trim()) {
      throw new BadRequestException('Token de verificación inválido');
    }

    const user = await this.usuarioRepo
      .createQueryBuilder('u')
      .addSelect('u.emailVerificationToken')
      .addSelect('u.emailVerificationExpires')
      .where('u.email_verification_token = :token', { token: token.trim() })
      .getOne();

    if (!user) {
      throw new BadRequestException('Enlace de verificación inválido o ya utilizado');
    }

    if (user.emailVerificado) {
      return { message: 'Tu cuenta ya estaba verificada. Ya puedes iniciar sesión.' };
    }

    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      throw new BadRequestException('El enlace ha caducado. Solicita uno nuevo desde el login.');
    }

    user.emailVerificado = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await this.usuarioRepo.save(user);

    return { message: 'Email verificado correctamente. Ya puedes iniciar sesión.' };
  }

  async resendVerification(email: string) {
    const user = await this.usuarioRepo
      .createQueryBuilder('u')
      .addSelect('u.emailVerificationToken')
      .addSelect('u.emailVerificationExpires')
      .where('u.email = :email', { email })
      .getOne();

    if (!user || user.emailVerificado || tieneAccesoAdmin(user.rol)) {
      return {
        message: 'Si el email existe y no está verificado, recibirás un nuevo enlace en breve.',
      };
    }

    if (!this.mailService.isConfigured()) {
      throw new ServiceUnavailableException('El servidor de correo no está configurado.');
    }

    const token = randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_HOURS * 60 * 60 * 1000);
    await this.usuarioRepo.save(user);
    await this.sendVerificationEmail(user, token);

    return {
      message: 'Si el email existe y no está verificado, recibirás un nuevo enlace en breve.',
    };
  }

  async login(dto: LoginDto, adminOnly = false) {
    const user = await this.usuarioRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    if (adminOnly && !tieneAccesoAdmin(user.rol)) {
      throw new UnauthorizedException('No tienes permisos de administrador');
    }

    if (!adminOnly && !tieneAccesoAdmin(user.rol) && !user.emailVerificado) {
      throw new ForbiddenException(
        'Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada o solicita un nuevo enlace.',
      );
    }

    return this.buildAuthResponse(user);
  }

  async getProfile(userId: number) {
    const user = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      nombre: user.nombre,
      apellidos: user.apellidos,
      email: user.email,
      rol: user.rol,
      fechaRegistro: user.fechaRegistro,
      emailVerificado: user.emailVerificado,
    };
  }

  async requestPasswordReset(email: string) {
    const genericMessage =
      'Si el email está registrado, recibirás un enlace para restablecer la contraseña en breve.';

    const user = await this.usuarioRepo.findOne({ where: { email: email.trim() } });
    if (!user) {
      return { message: genericMessage };
    }

    if (!this.mailService.isConfigured()) {
      throw new ServiceUnavailableException('El servidor de correo no está configurado.');
    }

    const token = randomBytes(32).toString('hex');
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_HOURS * 60 * 60 * 1000);
    await this.usuarioRepo.save(user);
    await this.sendPasswordResetEmail(user, token);

    return { message: genericMessage };
  }

  async requestPasswordResetForUser(userId: number) {
    const user = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (!this.mailService.isConfigured()) {
      throw new ServiceUnavailableException('El servidor de correo no está configurado.');
    }

    const token = randomBytes(32).toString('hex');
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_HOURS * 60 * 60 * 1000);
    await this.usuarioRepo.save(user);
    await this.sendPasswordResetEmail(user, token);

    return {
      message: `Te hemos enviado un enlace a ${this.maskEmail(user.email)}. Caduca en ${PASSWORD_RESET_HOURS} hora.`,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token?.trim()) {
      throw new BadRequestException('Enlace de restablecimiento inválido');
    }

    const user = await this.usuarioRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .addSelect('u.passwordResetToken')
      .addSelect('u.passwordResetExpires')
      .where('u.password_reset_token = :token', { token: token.trim() })
      .getOne();

    if (!user) {
      throw new BadRequestException('Enlace inválido o ya utilizado');
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException(
        'El enlace ha caducado. Solicita uno nuevo desde «¿Has olvidado la contraseña?».',
      );
    }

    const sameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (sameAsCurrent) {
      throw new BadRequestException('La nueva contraseña debe ser distinta a la actual');
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await this.usuarioRepo.save(user);

    return { message: 'Contraseña actualizada. Ya puedes iniciar sesión con la nueva contraseña.' };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.usuarioRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.id = :id', { id: userId })
      .getOne();

    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) {
      throw new ForbiddenException('Contraseña actual incorrecta');
    }

    const sameAsCurrent = await bcrypt.compare(dto.newPassword, user.password);
    if (sameAsCurrent) {
      throw new BadRequestException('La nueva contraseña debe ser distinta a la actual');
    }

    user.password = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.usuarioRepo.save(user);
    return { message: 'Contraseña actualizada correctamente' };
  }

  private async sendVerificationEmail(user: Usuario, token: string) {
    const base = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:4200').replace(/\/$/, '');
    const verifyUrl = `${base}/verificar-email?token=${token}`;
    await this.mailService.sendVerificationEmail(user.email, user.nombre, verifyUrl);
  }

  private async sendPasswordResetEmail(user: Usuario, token: string) {
    const base = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:4200').replace(/\/$/, '');
    const resetUrl = `${base}/restablecer-contrasena?token=${token}`;
    await this.mailService.sendPasswordResetEmail(user.email, user.nombre, resetUrl);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
  }

  private buildAuthResponse(user: Usuario) {
    const payload = { sub: user.id, email: user.email, rol: user.rol };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nombre: user.nombre,
        apellidos: user.apellidos,
        email: user.email,
        rol: user.rol,
      },
    };
  }
}
