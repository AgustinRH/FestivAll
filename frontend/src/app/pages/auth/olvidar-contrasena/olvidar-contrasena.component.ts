import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { getHttpErrorMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'app-olvidar-contrasena',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './olvidar-contrasena.component.html',
  styleUrl: '../login/login.component.scss',
})
export class OlvidarContrasenaComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  loading = false;
  error = '';
  success = '';
  sentEmail = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.success = '';
    const email = this.form.getRawValue().email!.trim();
    this.auth.forgotPassword(email).subscribe({
      next: (res) => {
        this.sentEmail = email;
        this.success = res.message;
        this.loading = false;
      },
      error: (err) => {
        this.error = getHttpErrorMessage(err, 'No se pudo enviar el enlace');
        this.loading = false;
      },
    });
  }
}
