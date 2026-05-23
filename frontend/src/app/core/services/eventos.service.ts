import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Evento } from '../models';

@Injectable({ providedIn: 'root' })
export class EventosService {
  private readonly api = `${environment.apiUrl}/eventos`;

  constructor(private http: HttpClient) {}

  getAll(filters?: { busqueda?: string; categoriaId?: number; localidad?: string }) {
    let params = new HttpParams();
    if (filters?.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters?.categoriaId) params = params.set('categoriaId', filters.categoriaId);
    if (filters?.localidad) params = params.set('localidad', filters.localidad);
    return this.http.get<Evento[]>(this.api, { params });
  }

  getPopular(limit?: number) {
    let params = new HttpParams();
    if (limit != null && limit > 0) {
      params = params.set('limit', limit);
    }
    return this.http.get<Evento[]>(`${this.api}/popular`, { params });
  }

  getUltimasEntradas() {
    return this.http.get<Evento[]>(`${this.api}/ultimas-entradas`);
  }

  getById(id: number) {
    return this.http.get<Evento>(`${this.api}/${id}`);
  }

  create(data: Record<string, unknown>) {
    return this.http.post<Evento>(this.api, data);
  }

  update(id: number, data: Record<string, unknown>) {
    return this.http.put<Evento>(`${this.api}/${id}`, data);
  }

  toggleDestacado(id: number) {
    return this.http.patch<Evento>(`${this.api}/${id}/destacado`, {});
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
