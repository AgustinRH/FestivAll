import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, User } from '../models';

export interface RegisterResponse {
  message: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = `${environment.apiUrl}/auth`;
  currentUser = signal<User | null>(this.loadUser());

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  register(data: { nombre: string; apellidos: string; email: string; password: string }) {
    return this.http.post<RegisterResponse>(`${this.api}/register`, data);
  }

  verifyEmail(token: string) {
    return this.http.get<{ message: string }>(`${this.api}/verify-email`, { params: { token } });
  }

  resendVerification(email: string) {
    return this.http.post<{ message: string }>(`${this.api}/resend-verification`, { email });
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${this.api}/login`, { email, password }).pipe(
      tap((res) => this.setSession(res)),
    );
  }

  adminLogin(email: string, password: string) {
    return this.http.post<AuthResponse>(`${this.api}/admin/login`, { email, password }).pipe(
      tap((res) => this.setSession(res)),
    );
  }

  getProfile() {
    return this.http.get<User & { fechaRegistro: string; emailVerificado?: boolean }>(`${this.api}/profile`);
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.put<{ message: string }>(`${this.api}/change-password`, { currentPassword, newPassword });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  get token(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  isAdmin(): boolean {
    return this.currentUser()?.rol === 'admin';
  }

  private setSession(res: AuthResponse) {
    localStorage.setItem('token', res.access_token);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.currentUser.set(res.user);
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }
}
