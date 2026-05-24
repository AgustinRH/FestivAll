import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: { user, pass },
      });
    }
  }

  isConfigured(): boolean {
    return !!this.transporter;
  }

  async sendVerificationEmail(to: string, nombre: string, verifyUrl: string): Promise<void> {
    const from =
      this.config.get<string>('MAIL_FROM') ||
      this.config.get<string>('SMTP_USER') ||
      'noreply@festivall.club';
    const subject = 'Verifica tu cuenta en FestivAll';
    const safeName = this.escapeHtml(nombre);
    const html = `<motion style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;color:#222">
<h2 style="color:#e85d3b">FestivAll Almería</h2>
<p>Hola ${safeName},</p>
<p>Gracias por registrarte. Pulsa el botón para verificar tu email y poder iniciar sesión:</p>
<p style="margin:28px 0"><a href="${verifyUrl}" style="background:#e85d3b;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700">Verificar mi cuenta</a></p>
<p style="font-size:13px;color:#666">Si el botón no funciona, copia este enlace en el navegador:</p>
<p style="font-size:13px;word-break:break-all">${verifyUrl}</p>
<p style="font-size:13px;color:#666">El enlace caduca en 24 horas.</p>
</motion>`.replaceAll('motion', 'div');

    if (!this.transporter) {
      this.logger.warn(`SMTP no configurado. Enlace de verificación para ${to}: ${verifyUrl}`);
      return;
    }

    await this.transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: `Hola ${nombre},\n\nVerifica tu cuenta en FestivAll:\n${verifyUrl}\n\nEl enlace caduca en 24 horas.`,
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
