import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminUser } from '../models';

export interface CreateUsuarioAdminPayload {
  nombre: string;
  apellidos: string;
  email: string;
  password: string;
  rol: 'owner' | 'admin' | 'cliente';
  emailVerificado?: boolean;
}

export interface UpdateUsuarioAdminPayload {
  nombre?: string;
  apellidos?: string;
  email?: string;
  password?: string;
  rol?: 'admin' | 'cliente';
  emailVerificado?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsuariosAdminService {
  private readonly api = `${environment.apiUrl}/usuarios`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<AdminUser[]>(this.api);
  }

  getById(id: number) {
    return this.http.get<AdminUser>(`${this.api}/${id}`);
  }

  create(data: CreateUsuarioAdminPayload) {
    return this.http.post<AdminUser>(this.api, data);
  }

  update(id: number, data: UpdateUsuarioAdminPayload) {
    return this.http.put<AdminUser>(`${this.api}/${id}`, data);
  }

  delete(id: number) {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }
}
