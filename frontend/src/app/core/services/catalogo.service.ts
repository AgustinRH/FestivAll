import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Categoria, Ubicacion } from '../models';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly api = `${environment.apiUrl}/catalogo`;

  constructor(private http: HttpClient) {}

  getCategorias() {
    return this.http.get<Categoria[]>(`${this.api}/categorias`);
  }

  getUbicaciones() {
    return this.http.get<Ubicacion[]>(`${this.api}/ubicaciones`);
  }
}
