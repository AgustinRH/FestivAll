import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { getHttpErrorMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  error = '';
  loading = false;
  showResend = false;
  resendMsg = '';
  resendLoading = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.showResend = false;
    this.resendMsg = '';
    const { email, password } = this.form.getRawValue();
    this.auth.login(email!, password!).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.error = getHttpErrorMessage(err, 'Error al iniciar sesión');
        this.showResend = err.status === 403;
        this.loading = false;
      },
    });
  }

  resendVerification() {
    const email = this.form.getRawValue().email?.trim();
    if (!email) {
      this.resendMsg = 'Introduce tu email arriba para reenviar el enlace.';
      return;
    }
    this.resendLoading = true;
    this.resendMsg = '';
    this.auth.resendVerification(email).subscribe({
      next: (res) => {
        this.resendMsg = res.message;
        this.resendLoading = false;
      },
      error: (err) => {
        this.resendMsg = getHttpErrorMessage(err, 'No se pudo reenviar el email.');
        this.resendLoading = false;
      },
    });
  }
}
