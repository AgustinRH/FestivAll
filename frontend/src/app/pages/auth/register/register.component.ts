import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { getHttpErrorMessage } from '../../../core/utils/http-error';
import {
  isFieldInvalid,
  markFormGroupTouched,
} from '../../../core/utils/form-validation.util';
import {
  matchOtherFieldValidator,
  PASSWORD_REQUIREMENTS_HINT,
  strongPasswordValidator,
} from '../../../core/validators/password.validators';
import { LegalPrimeraCapaComponent } from '../../../shared/legal-primera-capa/legal-primera-capa.component';
import { FormFieldErrorComponent } from '../../../shared/form-field-error/form-field-error.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LegalPrimeraCapaComponent, FormFieldErrorComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
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
    confirmPassword: ['', [Validators.required, matchOtherFieldValidator('password')]],
  });

  ngOnInit() {
    this.form.get('password')?.valueChanges.subscribe(() => {
      this.form.get('confirmPassword')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  isInvalid(name: string): boolean {
    return isFieldInvalid(this.form.get(name));
  }

  submit() {
    markFormGroupTouched(this.form);
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const data = this.form.getRawValue();
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
