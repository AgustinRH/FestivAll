import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { TicketQrComponent } from '../../../shared/ticket-qr/ticket-qr.component';
import { ComprasService } from '../../../core/services/compras.service';
import { AuthService } from '../../../core/services/auth.service';
import { Compra } from '../../../core/models';
import { EntradaPerfil, expandirEntradas } from '../../../core/utils/entradas.util';
import { EntradaPdfService } from '../../../core/services/entrada-pdf.service';

@Component({
  selector: 'app-compra-exito',
  standalone: true,
  imports: [NavbarComponent, FooterComponent, TicketQrComponent, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './compra-exito.component.html',
  styleUrl: './compra-exito.component.scss',
})
export class CompraExitoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private comprasService = inject(ComprasService);
  private entradaPdf = inject(EntradaPdfService);
  auth = inject(AuthService);

  compras: Compra[] = [];
  entradas: EntradaPerfil[] = [];
  loading = true;
  error = '';
  pendiente = false;
  downloadingKey: string | null = null;

  ngOnInit() {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (!sessionId) {
      this.loading = false;
      this.error = 'No se encontró la sesión de pago.';
      return;
    }

    this.comprasService.verificarCheckout(sessionId).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.status === 'paid' && res.compras.length > 0) {
          this.compras = res.compras;
          this.entradas = expandirEntradas(res.compras);
        } else if (res.status === 'paid') {
          this.pendiente = true;
        } else {
          this.pendiente = true;
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo confirmar el pago. Revisa tu perfil en unos segundos.';
      },
    });
  }

  async descargarEntrada(entrada: EntradaPerfil) {
    this.downloadingKey = entrada.key;
    try {
      const u = this.auth.currentUser();
      const titular = u ? `${u.nombre} ${u.apellidos}`.trim() : undefined;
      await this.entradaPdf.download(entrada, titular);
    } finally {
      this.downloadingKey = null;
    }
  }
}
