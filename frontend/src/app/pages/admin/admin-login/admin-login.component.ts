import { Location } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
})
export class AdminLoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);

  error = '';
  sessionInfo = '';
  loading = false;

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('sesion') === 'expirada') {
      this.sessionInfo =
        'Vuelve a iniciar sesión para continuar. Suele pasar si la sesión caducó o se reinició la base de datos.';
      const path = this.router.url.split('?')[0] || '/festivall-admin';
      this.location.replaceState(path);
    }
  }

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { email, password } = this.form.getRawValue();
    this.auth.adminLogin(email!, password!).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigate(['/festivall-admin/panel']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Acceso denegado';
        this.loading = false;
      },
    });
  }
}
