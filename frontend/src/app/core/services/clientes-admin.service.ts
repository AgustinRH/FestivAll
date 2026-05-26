import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Cliente } from '../models';

@Injectable({ providedIn: 'root' })
export class ClientesAdminService {
  private readonly api = `${environment.apiUrl}/clientes`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Cliente[]>(this.api);
  }

  getActivos() {
    return this.http.get<Cliente[]>(`${this.api}/activos`);
  }

  create(body: Partial<Cliente>) {
    return this.http.post<Cliente>(this.api, body);
  }

  update(id: number, body: Partial<Cliente>) {
    return this.http.put<Cliente>(`${this.api}/${id}`, body);
  }

  delete(id: number) {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }
}
