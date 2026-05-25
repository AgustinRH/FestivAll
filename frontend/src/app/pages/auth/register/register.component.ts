import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { getHttpErrorMessage } from '../../../core/utils/http-error';
import {
  PASSWORD_REQUIREMENTS_HINT,
  strongPasswordValidator,
} from '../../../core/validators/password.validators';
import { LegalPrimeraCapaComponent } from '../../../shared/legal-primera-capa/legal-primera-capa.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LegalPrimeraCapaComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  error = '';
  loading = false;
  success = false;
  registeredEmail = '';
  readonly passwordHint = PASSWORD_REQUIREMENTS_HINT;

  form = this.fb.group({
    nombre: ['', Validators.required],
    apellidos: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, strongPasswordValidator()]],
    confirmPassword: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid) return;
    const { confirmPassword, ...data } = this.form.getRawValue();
    if (data.password !== confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }
    this.loading = true;
    this.error = '';
    const payload = {
      nombre: data.nombre!.trim(),
      apellidos: data.apellidos!.trim(),
      email: data.email!.trim(),
      password: data.password!,
    };
    this.auth.register(payload).subscribe({
      next: (res) => {
        this.success = true;
        this.registeredEmail = res.email;
        this.loading = false;
      },
      error: (err) => {
        this.error = getHttpErrorMessage(err, 'Error al registrarse');
        this.loading = false;
      },
    });
  }
}
