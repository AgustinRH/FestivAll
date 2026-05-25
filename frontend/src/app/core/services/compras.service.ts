import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Compra } from '../models';

export interface CheckoutResponse {
  free: boolean;
  url?: string;
  sessionId?: string;
  compras?: Compra[];
}

export interface VerifyCheckoutResponse {
  status: string;
  compras: Compra[];
}

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly api = `${environment.apiUrl}/compras`;

  constructor(private http: HttpClient) {}

  /** Inicia pago Stripe o confirma entrada gratuita. */
  iniciarCheckout(idEvento: number, cantidad: number, aceptoTerminos: boolean) {
    return this.http.post<CheckoutResponse>(`${this.api}/checkout`, {
      idEvento,
      cantidad,
      aceptoTerminos,
    });
  }

  verificarCheckout(sessionId: string) {
    const params = new HttpParams().set('session_id', sessionId);
    return this.http.get<VerifyCheckoutResponse>(`${this.api}/checkout/verificar`, { params });
  }

  /** Solo para eventos con precio 0 (legacy). */
  comprar(idEvento: number, cantidad: number, aceptoTerminos: boolean) {
    return this.http.post<Compra[]>(this.api, { idEvento, cantidad, aceptoTerminos });
  }

  misCompras() {
    return this.http.get<Compra[]>(`${this.api}/mis-compras`);
  }
}
