import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { getHttpErrorMessage } from '../../../core/utils/http-error';
import {
  isFieldInvalid,
  markFormGroupTouched,
} from '../../../core/utils/form-validation.util';
import { sanitizePostLoginReturnUrl } from '../../../core/utils/safe-return-url';
import { FormFieldErrorComponent } from '../../../shared/form-field-error/form-field-error.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FormFieldErrorComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl');
    if (!raw) return;
    const cleaned = sanitizePostLoginReturnUrl(raw);
    if (cleaned === '/' && raw !== '/' && raw.length > 1) {
      const sesion = this.route.snapshot.queryParamMap.get('sesion');
      void this.router.navigate(['/login'], {
        queryParams: sesion === 'expirada' ? { sesion: 'expirada' } : {},
        replaceUrl: true,
      });
    }
  }

  error = '';
  loading = false;
  showResend = false;
  resendMsg = '';
  resendLoading = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  isInvalid(name: string): boolean {
    return isFieldInvalid(this.form.get(name));
  }

  submit() {
    markFormGroupTouched(this.form);
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.showResend = false;
    this.resendMsg = '';
    const { email, password } = this.form.getRawValue();
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.loading = false;
        const raw = this.route.snapshot.queryParamMap.get('returnUrl');
        const returnUrl = sanitizePostLoginReturnUrl(raw) || '/';
        void this.router.navigateByUrl(returnUrl);
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
