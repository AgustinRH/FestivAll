import { Component, OnInit, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { LegalPrimeraCapaComponent } from '../../../shared/legal-primera-capa/legal-primera-capa.component';

@Component({
  selector: 'app-evento-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NavbarComponent,
    FooterComponent,
    LegalPrimeraCapaComponent,
    RouterLink,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './evento-detail.component.html',
  styleUrl: './evento-detail.component.scss',
})
export class EventoDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private comprasService = inject(ComprasService);
  auth = inject(AuthService);

  evento?: Evento;
  /** Bloquea el detalle hasta confirmar edad (+18). */
  mostrarAvisoEdad = false;
  comprasExitosas: Compra[] = [];
  showCompraModal = false;
  error = '';
  loading = false;
  emailVerificado: boolean | null = null;
  resendMsg = '';
  resendLoading = false;

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
    aceptoTerminos: [false, Validators.requiredTrue],
  });

  ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    if (this.route.snapshot.queryParamMap.get('pago') === 'cancelado') {
      this.error = 'Has cancelado el pago. Puedes volver a intentarlo cuando quieras.';
    }
    this.eventosService.getById(id).subscribe({
      next: (e) => {
        this.evento = e;
        this.mostrarAvisoEdad = this.requiereConfirmacionEdad(e);
        if (this.auth.isLoggedIn() && !this.mostrarAvisoEdad) {
          this.cargarPerfilCompra();
        }
      },
      error: (err) => {
        if (err.status === 404) {
          this.error = 'Este evento ya no está disponible (ha finalizado o no existe).';
        }
      },
    });
  }

  private edadStorageKey(eventoId: number): string {
    return `festivall_edad_ok_${eventoId}`;
  }

  private requiereConfirmacionEdad(evento: Evento): boolean {
    if (!evento.soloMayoresEdad) return false;
    return sessionStorage.getItem(this.edadStorageKey(evento.id)) !== '1';
  }

  confirmarMayorEdad(): void {
    if (!this.evento) return;
    sessionStorage.setItem(this.edadStorageKey(this.evento.id), '1');
    this.mostrarAvisoEdad = false;
    if (this.auth.isLoggedIn()) {
      this.cargarPerfilCompra();
    }
  }

  rechazarMayorEdad(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      void this.router.navigate(['/eventos']);
    }
  }

  private cargarPerfilCompra() {
    const user = this.auth.currentUser();
    this.compraForm.patchValue({
      nombre: user?.nombre || '',
      apellidos: user?.apellidos || '',
    });
    this.auth.getProfile().subscribe({
      next: (p) => {
        this.emailVerificado = p.emailVerificado ?? true;
      },
      error: () => {
        this.emailVerificado = true;
      },
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

  get puedeComprar(): boolean {
    return this.emailVerificado !== false;
  }

  abrirCompra() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (this.emailVerificado === null) {
      this.auth.getProfile().subscribe({
        next: (p) => {
          this.emailVerificado = p.emailVerificado ?? true;
          this.abrirCompra();
        },
        error: () => {
          this.emailVerificado = true;
          this.abrirCompra();
        },
      });
      return;
    }
    if (!this.puedeComprar) {
      this.error =
        'Debes verificar tu email antes de comprar. Revisa tu bandeja de entrada o reenvía el enlace de verificación.';
      this.showCompraModal = true;
      return;
    }
    this.showCompraModal = true;
    this.error = '';
    this.compraForm.patchValue({ aceptoTerminos: false });
  }

  reenviarVerificacion() {
    const email = this.auth.currentUser()?.email;
    if (!email) return;
    this.resendLoading = true;
    this.resendMsg = '';
    this.auth.resendVerification(email).subscribe({
      next: (res) => {
        this.resendMsg = res.message;
        this.resendLoading = false;
      },
      error: (err) => {
        this.resendMsg = getHttpErrorMessage(err, 'No se pudo reenviar el email.');
        this.resendLoading = false;
      },
    });
  }

  cerrarCompra() {
    this.showCompraModal = false;
    this.compraForm.patchValue({ aceptoTerminos: false });
  }

  get total(): number {
    return this.precioUnitario * (this.compraForm.get('cantidad')?.value || 1);
  }

  confirmarCompra() {
    if (!this.puedeComprar) return;
    if (!this.evento || this.compraForm.invalid) return;
    const cantidad = this.compraForm.get('cantidad')!.value!;
    if (cantidad > this.evento.stock) {
      this.error = 'No hay suficiente stock';
      return;
    }
    this.loading = true;
    this.error = '';
    const aceptoTerminos = this.compraForm.get('aceptoTerminos')!.value === true;
    this.comprasService.iniciarCheckout(this.evento.id, cantidad, aceptoTerminos).subscribe({
      next: (res) => {
        if (res.free && res.compras) {
          this.loading = false;
          this.showCompraModal = false;
          void this.router.navigate(['/perfil'], {
            fragment: 'entradas',
            queryParams: { compra: 'ok' },
          });
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
        if (err.status === 403) {
          this.emailVerificado = false;
        }
        this.loading = false;
      },
    });
  }
}
