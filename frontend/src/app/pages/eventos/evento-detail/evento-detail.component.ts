import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { EventosService } from '../../../core/services/eventos.service';
import { ComprasService } from '../../../core/services/compras.service';
import { AuthService } from '../../../core/services/auth.service';
import { getHttpErrorMessage } from '../../../core/utils/http-error';
import { getPrecioUnitario, aplicaDescuentoUltimasEntradas } from '../../../core/utils/precio.util';
import { Evento, Compra } from '../../../core/models';

@Component({
  selector: 'app-evento-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NavbarComponent,
    FooterComponent,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './evento-detail.component.html',
  styleUrl: './evento-detail.component.scss',
})
export class EventoDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private comprasService = inject(ComprasService);
  auth = inject(AuthService);

  evento?: Evento;
  comprasExitosas: Compra[] = [];
  showCompraModal = false;
  error = '';
  loading = false;

  compraForm = this.fb.group({
    nombre: ['', Validators.required],
    apellidos: ['', Validators.required],
    direccion: [''],
    codPostal: [''],
    ciudad: [''],
    pais: ['España'],
    telefono: [''],
    codigoDescuento: [''],
    cantidad: [1, [Validators.required, Validators.min(1)]],
  });

  ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    if (this.route.snapshot.queryParamMap.get('pago') === 'cancelado') {
      this.error = 'Has cancelado el pago. Puedes volver a intentarlo cuando quieras.';
    }
    this.eventosService.getById(id).subscribe((e) => {
      this.evento = e;
      if (this.auth.isLoggedIn()) {
        const user = this.auth.currentUser();
        this.compraForm.patchValue({
          nombre: user?.nombre || '',
          apellidos: user?.apellidos || '',
        });
      }
    });
  }

  get esGratis(): boolean {
    return this.precioUnitario <= 0;
  }

  get precioUnitario(): number {
    return this.evento ? getPrecioUnitario(this.evento) : 0;
  }

  get tieneDescuentoUltimas(): boolean {
    return this.evento ? aplicaDescuentoUltimasEntradas(this.evento.stock) : false;
  }

  get textoBotonPago(): string {
    if (this.loading) return 'Procesando…';
    return this.esGratis ? 'Confirmar entrada gratuita' : 'Pagar con tarjeta';
  }

  get imagenUrl(): string {
    const principal = this.evento?.imagenes?.find((i) => i.esPrincipal);
    return principal?.url || this.evento?.imagenes?.[0]?.url || '';
  }

  get mapUrl(): string {
    const u = this.evento?.ubicacion;
    if (!u) return '';
    const q = encodeURIComponent(`${u.direccion}, ${u.localidad}, ${u.provincia}`);
    return `https://www.openstreetmap.org/export/embed.html?bbox=-2.5,36.8,-2.4,36.9&layer=mapnik&marker=${q}`;
  }

  abrirCompra() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.showCompraModal = true;
    this.error = '';
  }

  cerrarCompra() {
    this.showCompraModal = false;
  }

  get total(): number {
    return this.precioUnitario * (this.compraForm.get('cantidad')?.value || 1);
  }

  confirmarCompra() {
    if (!this.evento || this.compraForm.invalid) return;
    const cantidad = this.compraForm.get('cantidad')!.value!;
    if (cantidad > this.evento.stock) {
      this.error = 'No hay suficiente stock';
      return;
    }
    this.loading = true;
    this.error = '';
    this.comprasService.iniciarCheckout(this.evento.id, cantidad).subscribe({
      next: (res) => {
        if (res.free && res.compras) {
          this.comprasExitosas = res.compras;
          this.evento!.stock -= cantidad;
          this.loading = false;
          this.showCompraModal = false;
          return;
        }
        if (res.url) {
          window.location.href = res.url;
          return;
        }
        this.loading = false;
        this.error = 'No se pudo iniciar el pago';
      },
      error: (err) => {
        this.error = getHttpErrorMessage(err, 'Error al procesar la compra');
        this.loading = false;
      },
    });
  }
}
