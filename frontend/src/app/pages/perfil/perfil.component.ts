import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { AuthService } from '../../core/services/auth.service';
import { ComprasService } from '../../core/services/compras.service';
import { EntradaPerfil, expandirEntradas } from '../../core/utils/entradas.util';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent, FooterComponent, CurrencyPipe, DatePipe],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private comprasService = inject(ComprasService);

  profile: { nombre: string; apellidos: string; email: string; fechaRegistro: string } | null = null;
  entradas: EntradaPerfil[] = [];
  passwordMsg = '';
  passwordError = '';

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  ngOnInit() {
    this.auth.getProfile().subscribe((p) => (this.profile = p));
    this.comprasService.misCompras().subscribe((c) => (this.entradas = expandirEntradas(c)));
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
        this.passwordError = err.error?.message || 'Error al cambiar contraseña';
        this.passwordMsg = '';
      },
    });
  }
}
