import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Compra } from '../models';

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly api = `${environment.apiUrl}/compras`;

  constructor(private http: HttpClient) {}

  comprar(idEvento: number, cantidad: number) {
    return this.http.post<Compra[]>(this.api, { idEvento, cantidad });
  }

  misCompras() {
    return this.http.get<Compra[]>(`${this.api}/mis-compras`);
  }
}
