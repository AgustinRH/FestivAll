import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  ValoracionesEventoResponse,
  ValoracionElegibilidad,
  ValoracionAdmin,
  EventoPendienteValorar,
  ValoracionPerfil,
  EventoConValoraciones,
  EventoOpinionesDetalle,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ValoracionesService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  getByEvento(idEvento: number) {
    return this.http.get<ValoracionesEventoResponse>(
      `${this.api}/eventos/${idEvento}/valoraciones`,
    );
  }

  getEventosConValoraciones() {
    return this.http.get<EventoConValoraciones[]>(`${this.api}/valoraciones/eventos`);
  }

  getOpinionesEvento(idEvento: number) {
    return this.http.get<EventoOpinionesDetalle>(
      `${this.api}/valoraciones/eventos/${idEvento}`,
    );
  }

  getElegibilidad(idEvento: number) {
    return this.http.get<ValoracionElegibilidad>(
      `${this.api}/valoraciones/elegibilidad/${idEvento}`,
    );
  }

  create(body: { idEvento: number; puntuacion: number; comentario?: string }) {
    return this.http.post<{ message: string }>(`${this.api}/valoraciones`, body);
  }

  getMisPendientes() {
    return this.http.get<EventoPendienteValorar[]>(
      `${this.api}/valoraciones/mis-pendientes`,
    );
  }

  getMisValoraciones() {
    return this.http.get<ValoracionPerfil[]>(`${this.api}/valoraciones/mis-valoraciones`);
  }

  omitir(idEvento: number) {
    return this.http.post<{ message: string }>(`${this.api}/valoraciones/omitir`, {
      idEvento,
    });
  }

  getPendientesAdmin() {
    return this.http.get<ValoracionAdmin[]>(`${this.api}/valoraciones/admin/pendientes`);
  }

  moderar(id: number, estado: 'aprobado' | 'rechazado') {
    return this.http.patch<{ message: string }>(`${this.api}/valoraciones/${id}/estado`, {
      estado,
    });
  }
}
