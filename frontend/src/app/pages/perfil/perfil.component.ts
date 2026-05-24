import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { TicketQrComponent } from '../../shared/ticket-qr/ticket-qr.component';
import { AuthService } from '../../core/services/auth.service';
import { ComprasService } from '../../core/services/compras.service';
import { EntradaPerfil, expandirEntradas } from '../../core/utils/entradas.util';
import { EntradaPdfService } from '../../core/services/entrada-pdf.service';
import { getHttpErrorMessage } from '../../core/utils/http-error';
import {
  PASSWORD_REQUIREMENTS_HINT,
  strongPasswordValidator,
} from '../../core/validators/password.validators';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NavbarComponent,
    FooterComponent,
    TicketQrComponent,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private comprasService = inject(ComprasService);
  private entradaPdf = inject(EntradaPdfService);

  profile: { nombre: string; apellidos: string; email: string; fechaRegistro: string } | null = null;
  entradas: EntradaPerfil[] = [];
  downloadingKey: string | null = null;
  downloadError = '';
  passwordMsg = '';
  passwordError = '';
  readonly passwordHint = PASSWORD_REQUIREMENTS_HINT;

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, strongPasswordValidator()]],
    confirmPassword: ['', Validators.required],
  });

  ngOnInit() {
    this.auth.getProfile().subscribe((p) => (this.profile = p));
    this.comprasService.misCompras().subscribe((c) => (this.entradas = expandirEntradas(c)));
  }

  async descargarEntrada(entrada: EntradaPerfil) {
    this.downloadError = '';
    this.downloadingKey = entrada.key;
    try {
      const titular = this.profile
        ? `${this.profile.nombre} ${this.profile.apellidos}`.trim()
        : undefined;
      await this.entradaPdf.download(entrada, titular);
    } catch {
      this.downloadError = 'No se pudo generar el PDF. Inténtalo de nuevo.';
    } finally {
      this.downloadingKey = null;
    }
  }

  changePassword() {
    if (this.passwordForm.invalid) return;
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.passwordError = 'Las contraseñas no coinciden';
      return;
    }
    this.auth.changePassword(currentPassword!, newPassword!).subscribe({
      next: (res: { message: string }) => {
        this.passwordMsg = res.message;
        this.passwordError = '';
        this.passwordForm.reset();
      },
      error: (err) => {
        this.passwordError = getHttpErrorMessage(err, 'Error al cambiar contraseña');
        this.passwordMsg = '';
      },
    });
  }
}
