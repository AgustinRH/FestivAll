import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { EventosService } from '../../../core/services/eventos.service';
import { SeoService } from '../../../core/services/seo.service';
import { ComprasService } from '../../../core/services/compras.service';
import { AuthService } from '../../../core/services/auth.service';
import { getHttpErrorMessage } from '../../../core/utils/http-error';
import { resolveEventoImageUrl } from '../../../core/utils/evento-image.util';
import {
  listGaleria,
  urlImagenListado,
  urlImagenPorTipo,
} from '../../../core/utils/evento-imagenes.util';
import { getPrecioUnitario, aplicaDescuentoUltimasEntradas } from '../../../core/utils/precio.util';
import { Evento, Compra } from '../../../core/models';
import {
  getEventoSlugSegment,
  parseEventoIdFromSlug,
} from '../../../core/utils/evento-slug.util';
import {
  isFieldInvalid,
  markFormGroupTouched,
} from '../../../core/utils/form-validation.util';
import { LegalPrimeraCapaComponent } from '../../../shared/legal-primera-capa/legal-primera-capa.component';
import { FormFieldErrorComponent } from '../../../shared/form-field-error/form-field-error.component';
import { EventoValoracionesComponent } from '../../../shared/evento-valoraciones/evento-valoraciones.component';
import { EventoValoracionFormComponent } from '../../../shared/evento-valoracion-form/evento-valoracion-form.component';
import { EventoUbicacionMapaComponent } from '../../../shared/evento-ubicacion-mapa/evento-ubicacion-mapa.component';
import { ImageCarouselComponent } from '../../../shared/image-carousel/image-carousel.component';

@Component({
  selector: 'app-evento-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NavbarComponent,
    FooterComponent,
    LegalPrimeraCapaComponent,
    EventoValoracionesComponent,
    EventoValoracionFormComponent,
    EventoUbicacionMapaComponent,
    ImageCarouselComponent,
    FormFieldErrorComponent,
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
  private seo = inject(SeoService);
  private comprasService = inject(ComprasService);
  auth = inject(AuthService);

  @ViewChild(EventoValoracionesComponent) valoracionesList?: EventoValoracionesComponent;

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
    direccion: ['', Validators.required],
    codPostal: ['', Validators.required],
    ciudad: ['', Validators.required],
    pais: ['España'],
    telefono: ['', Validators.required],
    codigoDescuento: [''],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    aceptoTerminos: [false, Validators.requiredTrue],
  });

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('pago') === 'cancelado') {
      this.error = 'Has cancelado el pago. Puedes volver a intentarlo cuando quieras.';
    }
    this.route.paramMap.subscribe((params) => {
      const slugParam = params.get('slug') ?? '';
      const id = parseEventoIdFromSlug(slugParam);
      if (!id) {
        this.error = 'Enlace de evento no válido.';
        return;
      }
      this.eventosService.getById(id).subscribe({
        next: (e) => {
          this.evento = e;
          this.redirigirSlugCanonico(slugParam, e);
          this.seo.setEvento(e);
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
    });
  }

  /** Redirige a la URL con slug SEO si entraron solo con el ID numérico. */
  private redirigirSlugCanonico(slugParam: string, evento: Evento) {
    const canonico = getEventoSlugSegment(evento);
    if (slugParam !== canonico) {
      void this.router.navigate(['/eventos', canonico], {
        replaceUrl: true,
        queryParamsHandling: 'preserve',
      });
    }
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

  get imagenPrincipalUrl(): string {
    const raw =
      urlImagenPorTipo(this.evento?.imagenes, 'principal') ??
      urlImagenListado(this.evento?.imagenes);
    return resolveEventoImageUrl(raw);
  }

  get imagenCarteleraUrl(): string | null {
    const raw = urlImagenPorTipo(this.evento?.imagenes, 'cartelera');
    return raw ? resolveEventoImageUrl(raw) : null;
  }

  get galeriaUrls(): string[] {
    return listGaleria(this.evento?.imagenes).map((i) =>
      resolveEventoImageUrl(i.url),
    );
  }

  onValoracionEnviada(): void {
    this.valoracionesList?.load();
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

  isCompraInvalid(name: string): boolean {
    return isFieldInvalid(this.compraForm.get(name));
  }

  confirmarCompra() {
    if (!this.puedeComprar) return;
    if (!this.evento) return;
    markFormGroupTouched(this.compraForm);
    const cantidad = this.compraForm.get('cantidad')!.value!;
    if (cantidad > this.evento.stock) {
      this.compraForm.get('cantidad')?.setErrors({
        max: { max: this.evento.stock, actual: cantidad },
      });
      return;
    }
    if (this.compraForm.invalid) return;
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
