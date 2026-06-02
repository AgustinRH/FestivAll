import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, User } from '../models';
import { sanitizeSessionExpiredReturnUrl } from '../utils/safe-return-url';

export interface RegisterResponse {
  message: string;
  email: string;
}

/**
 * Sesión de usuario en el cliente: JWT en `localStorage`, signal `currentUser`
 * y redirección tras login/logout. Las peticiones autenticadas usan `authInterceptor`.
 */
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

  forgotPassword(email: string) {
    return this.http.post<{ message: string }>(`${this.api}/forgot-password`, { email });
  }

  requestPasswordResetEmail() {
    return this.http.post<{ message: string }>(`${this.api}/request-password-reset`, {});
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${this.api}/reset-password`, { token, newPassword });
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

  /** Limpia sesión y lleva al login si el API responde 401 (token caducado, secreto distinto, BD reiniciada, etc.). */
  handleSessionExpiredFromApi(): void {
    const hadToken = !!localStorage.getItem('token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    if (!hadToken) return;
    const path = this.router.url.split('?')[0];
    if (path.startsWith('/festivall-admin')) {
      void this.router.navigate(['/festivall-admin'], {
        queryParams: { sesion: 'expirada' },
        replaceUrl: true,
      });
    } else {
      const returnUrl = sanitizeSessionExpiredReturnUrl(this.router.url);
      const queryParams: Record<string, string> = { sesion: 'expirada' };
      if (returnUrl) queryParams['returnUrl'] = returnUrl;
      void this.router.navigate(['/login'], {
        queryParams,
        replaceUrl: true,
      });
    }
  }

  get token(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  isAdmin(): boolean {
    const rol = this.currentUser()?.rol;
    return rol === 'admin' || rol === 'owner';
  }

  isOwner(): boolean {
    return this.currentUser()?.rol === 'owner';
  }

  private setSession(res: AuthResponse) {
    const token = res?.access_token?.trim();
    if (!token || !res?.user) {
      throw new Error('Respuesta de login inválida: falta token o usuario');
    }
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.currentUser.set(res.user);
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }
}
