import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { getHttpErrorMessage } from '../../../core/utils/http-error';
import {
  PASSWORD_REQUIREMENTS_HINT,
  strongPasswordValidator,
} from '../../../core/validators/password.validators';

@Component({
  selector: 'app-restablecer-contrasena',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './restablecer-contrasena.component.html',
  styleUrl: '../login/login.component.scss',
})
export class RestablecerContrasenaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  token = '';
  loading = false;
  error = '';
  success = '';
  readonly passwordHint = PASSWORD_REQUIREMENTS_HINT;

  form = this.fb.group({
    newPassword: ['', [Validators.required, strongPasswordValidator()]],
    confirmPassword: ['', Validators.required],
  });

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.error = 'Enlace de restablecimiento inválido.';
    }
  }

  submit() {
    if (this.form.invalid || !this.token) return;
    const { newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.resetPassword(this.token, newPassword!).subscribe({
      next: (res) => {
        this.success = res.message;
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (err) => {
        this.error = getHttpErrorMessage(err, 'No se pudo restablecer la contraseña');
        this.loading = false;
      },
    });
  }
}
