import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { getHttpErrorMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  error = '';
  loading = false;

  form = this.fb.group({
    nombre: ['', Validators.required],
    apellidos: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
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
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error = getHttpErrorMessage(err, 'Error al registrarse');
        this.loading = false;
      },
    });
  }
}
