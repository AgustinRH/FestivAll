import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Compra, EntradaAdmin } from '../models';

export interface CheckoutResponse {
  free: boolean;
  url?: string;
  sessionId?: string;
  compras?: Compra[];
}

export interface VerifyCheckoutResponse {
  status: string;
  compras: Compra[];
  message?: string;
  refunded?: boolean;
}

export interface CierreCajaReport {
  eventoId: number;
  eventoTitulo: string;
  localNombre: string;
  entradasVendidas: number;
  transaccionesPagadas: number;
  entradasGratuitas: number;
  totalRecaudado: number;
  comisionStripe: number;
  comisionStripeEsEstimada: boolean;
  transaccionesConFeeReal: number;
  comisionFestivall: number;
  totalTransferirLocal: number;
  festivallComisionPct: number;
  stripeFeePercent: number;
  stripeFeeFixedEur: number;
  stripeMode: string;
  nota: string;
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

  /** Panel admin: liquidación para transferir al local. */
  getCierreCaja(idEvento: number) {
    return this.http.get<CierreCajaReport>(`${this.api}/admin/eventos/${idEvento}/cierre-caja`);
  }

  getEntradasAdmin(idEvento: number) {
    return this.http.get<EntradaAdmin[]>(`${this.api}/admin/eventos/${idEvento}/entradas`);
  }

  deleteEntradaAdmin(idCompra: number) {
    return this.http.delete<{ message: string }>(`${this.api}/admin/entradas/${idCompra}`);
  }

  reasignarEntradaAdmin(idCompra: number, idUsuario: number) {
    return this.http.patch<{ message: string; entrada: EntradaAdmin }>(
      `${this.api}/admin/entradas/${idCompra}`,
      { idUsuario },
    );
  }
}
