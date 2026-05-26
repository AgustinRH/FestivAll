import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Evento, EventosPaginatedResponse } from '../models';

const PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class EventosService {
  private readonly api = `${environment.apiUrl}/eventos`;

  constructor(private http: HttpClient) {}

  getAll(filters?: {
    busqueda?: string;
    categoriaId?: number;
    localidad?: string;
    ultimasEntradas?: boolean;
    precioMin?: number;
    precioMax?: number;
  }) {
    return this.http.get<Evento[]>(this.api, { params: this.buildFilterParams(filters) });
  }

  getPaginated(
    filters: {
      busqueda?: string;
      categoriaId?: number;
      localidad?: string;
      ultimasEntradas?: boolean;
      precioMin?: number;
      precioMax?: number;
      desde?: string;
      hasta?: string;
      page?: number;
      limit?: number;
    },
  ) {
    let params = this.buildFilterParams(filters);
    params = params.set('page', String(filters.page ?? 1));
    params = params.set('limit', String(filters.limit ?? PAGE_SIZE));
    if (filters.desde) params = params.set('desde', filters.desde);
    if (filters.hasta) params = params.set('hasta', filters.hasta);
    return this.http.get<EventosPaginatedResponse>(this.api, { params });
  }

  private buildFilterParams(filters?: {
    busqueda?: string;
    categoriaId?: number;
    localidad?: string;
    ultimasEntradas?: boolean;
    precioMin?: number;
    precioMax?: number;
  }): HttpParams {
    let params = new HttpParams();
    if (filters?.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters?.categoriaId) params = params.set('categoriaId', filters.categoriaId);
    if (filters?.localidad) params = params.set('localidad', filters.localidad);
    if (filters?.ultimasEntradas) params = params.set('ultimasEntradas', 'true');
    if (filters?.precioMin != null) params = params.set('precioMin', filters.precioMin);
    if (filters?.precioMax != null) params = params.set('precioMax', filters.precioMax);
    return params;
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

  /** Acepta slug SEO (`100-titulo-localidad`) o id numérico. */
  getBySlugOrId(slugOrId: string) {
    return this.http.get<Evento>(`${this.api}/${slugOrId}`);
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
