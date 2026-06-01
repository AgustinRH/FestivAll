import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { TicketQrComponent } from '../../shared/ticket-qr/ticket-qr.component';
import { AuthService } from '../../core/services/auth.service';
import { ComprasService } from '../../core/services/compras.service';
import { ValoracionesService } from '../../core/services/valoraciones.service';
import { EventoValoracionFormComponent } from '../../shared/evento-valoracion-form/evento-valoracion-form.component';
import { Evento, EventoPendienteValorar, ValoracionPerfil } from '../../core/models';
import { getEventoSlugSegment, opinionEventoPath } from '../../core/utils/evento-slug.util';
import {
  EntradaPerfil,
  GrupoEntradas,
  agruparEntradas,
  expandirEntradas,
} from '../../core/utils/entradas.util';
import { EntradaPdfService } from '../../core/services/entrada-pdf.service';
import { getHttpErrorMessage } from '../../core/utils/http-error';
import {
  PASSWORD_REQUIREMENTS_HINT,
  strongPasswordValidator,
} from '../../core/validators/password.validators';

type EntradasTab = 'activas' | 'historial';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    TicketQrComponent,
    EventoValoracionFormComponent,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private comprasService = inject(ComprasService);
  private valoracionesService = inject(ValoracionesService);
  private entradaPdf = inject(EntradaPdfService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly gruposPorPagina = 6;

  profile: { nombre: string; apellidos: string; email: string; fechaRegistro: string } | null = null;
  entradasActivas: EntradaPerfil[] = [];
  historialEntradas: EntradaPerfil[] = [];
  gruposActivos: GrupoEntradas[] = [];
  gruposHistorial: GrupoEntradas[] = [];

  tabEntradas: EntradasTab = 'activas';
  grupoExpandido: string | null = null;
  entradaExpandida: string | null = null;
  paginaActivas = 1;
  paginaHistorial = 1;

  downloadingKey: string | null = null;
  downloadError = '';
  compraVerificando = false;
  compraBanner: { type: 'success' | 'error' | 'pending'; text: string } | null = null;
  eventosPendientesValorar: EventoPendienteValorar[] = [];
  loadingValoraciones = true;
  valoracionesError = '';
  valoracionExpandida: number | null = null;
  /** Evita recrear el objeto en cada change detection (rompía el formulario de valoración). */
  valoracionEventoActivo: Evento | null = null;

  misValoraciones: ValoracionPerfil[] = [];
  loadingMisValoraciones = true;
  misValoracionesError = '';

  passwordMsg = '';
  passwordError = '';
  resetEmailMsg = '';
  resetEmailError = '';
  resetEmailLoading = false;
  readonly passwordHint = PASSWORD_REQUIREMENTS_HINT;

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, strongPasswordValidator()]],
    confirmPassword: ['', Validators.required],
  });

  ngOnInit() {
    this.auth.getProfile().subscribe((p) => (this.profile = p));
    this.cargarEntradas();
    this.cargarValoracionesPendientes();
    this.cargarMisValoraciones();

    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (sessionId) {
      this.verificarCompraStripe(sessionId);
    } else if (this.route.snapshot.queryParamMap.get('compra') === 'ok') {
      this.compraBanner = {
        type: 'success',
        text: '¡Entrada(s) confirmada(s)! Ya puedes ver y descargar tus códigos QR.',
      };
      this.limpiarQueryCompra();
      this.scrollToEntradas();
    }

    this.route.fragment.subscribe((fragment) => {
      if (fragment === 'entradas') {
        this.scrollToEntradas();
      }
    });
  }

  get sinCompras(): boolean {
    return this.entradasActivas.length === 0 && this.historialEntradas.length === 0;
  }

  get gruposVisibles(): GrupoEntradas[] {
    return this.tabEntradas === 'activas' ? this.gruposActivos : this.gruposHistorial;
  }

  get paginaActual(): number {
    return this.tabEntradas === 'activas' ? this.paginaActivas : this.paginaHistorial;
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.gruposVisibles.length / this.gruposPorPagina));
  }

  get gruposPagina(): GrupoEntradas[] {
    const start = (this.paginaActual - 1) * this.gruposPorPagina;
    return this.gruposVisibles.slice(start, start + this.gruposPorPagina);
  }

  get totalEntradasTab(): number {
    return this.tabEntradas === 'activas'
      ? this.entradasActivas.length
      : this.historialEntradas.length;
  }

  setTab(tab: EntradasTab) {
    this.tabEntradas = tab;
    this.grupoExpandido = null;
    this.entradaExpandida = null;
  }

  toggleGrupo(key: string) {
    if (this.grupoExpandido === key) {
      this.grupoExpandido = null;
      this.entradaExpandida = null;
    } else {
      this.grupoExpandido = key;
      this.entradaExpandida = null;
    }
  }

  toggleEntrada(key: string) {
    this.entradaExpandida = this.entradaExpandida === key ? null : key;
  }

  irPagina(pagina: number) {
    const p = Math.min(Math.max(1, pagina), this.totalPaginas);
    if (this.tabEntradas === 'activas') {
      this.paginaActivas = p;
    } else {
      this.paginaHistorial = p;
    }
    this.grupoExpandido = null;
    this.entradaExpandida = null;
  }

  indiceEntrada(grupo: GrupoEntradas, entrada: EntradaPerfil): number {
    return grupo.entradas.indexOf(entrada) + 1;
  }

  eventoParaValorar(item: EventoPendienteValorar): Evento {
    return {
      id: item.id,
      titulo: item.titulo,
      slug: item.slug ?? undefined,
      fechaInicio: item.fechaInicio,
      fechaFin: item.fechaFin,
      descripcion: '',
      precio: 0,
      stock: 0,
      idCategoria: 0,
      idUbicacion: 0,
      idCliente: 0,
      ubicacion: item.localidad
        ? {
            idUbicacion: 0,
            direccion: '',
            localidad: item.localidad,
            provincia: '',
          }
        : undefined,
    };
  }

  rutaEvento(item: EventoPendienteValorar): string {
    const segment = getEventoSlugSegment({
      id: item.id,
      slug: item.slug,
      titulo: item.titulo,
      ubicacion: item.localidad ? { localidad: item.localidad } : null,
    });
    return `/eventos/${segment}`;
  }

  rutaOpinionesEvento(item: { id: number; slug?: string | null; titulo: string; localidad?: string | null }): string[] {
    return opinionEventoPath({
      id: item.id,
      slug: item.slug ?? null,
      titulo: item.titulo,
      localidad: item.localidad ?? null,
    });
  }

  estrellas(puntuacion: number): boolean[] {
    return [1, 2, 3, 4, 5].map((i) => i <= puntuacion);
  }

  estadoValoracionLabel(estado: ValoracionPerfil['estadoModeracion']): string {
    switch (estado) {
      case 'aprobado':
        return 'Publicada';
      case 'rechazado':
        return 'No publicada';
      default:
        return 'En revisión';
    }
  }

  estadoValoracionClass(estado: ValoracionPerfil['estadoModeracion']): string {
    return `estado-valoracion--${estado}`;
  }

  toggleValoracion(item: EventoPendienteValorar) {
    if (this.valoracionExpandida === item.id) {
      this.valoracionExpandida = null;
      this.valoracionEventoActivo = null;
      return;
    }
    this.valoracionExpandida = item.id;
    this.valoracionEventoActivo = this.eventoParaValorar(item);
  }

  onValoracionActualizada(idEvento: number) {
    this.eventosPendientesValorar = this.eventosPendientesValorar.filter(
      (e) => e.id !== idEvento,
    );
    this.valoracionExpandida = null;
    this.valoracionEventoActivo = null;
    this.cargarMisValoraciones();
  }

  private cargarMisValoraciones() {
    this.loadingMisValoraciones = true;
    this.misValoracionesError = '';
    this.valoracionesService.getMisValoraciones().subscribe({
      next: (list) => {
        this.misValoraciones = list;
        this.loadingMisValoraciones = false;
      },
      error: (err) => {
        this.misValoraciones = [];
        this.loadingMisValoraciones = false;
        this.misValoracionesError = getHttpErrorMessage(
          err,
          'No se pudieron cargar tus valoraciones.',
        );
      },
    });
  }

  private cargarValoracionesPendientes() {
    this.loadingValoraciones = true;
    this.valoracionesError = '';
    this.valoracionesService.getMisPendientes().subscribe({
      next: (list) => {
        this.eventosPendientesValorar = list;
        this.loadingValoraciones = false;
      },
      error: (err) => {
        this.eventosPendientesValorar = [];
        this.loadingValoraciones = false;
        this.valoracionesError = getHttpErrorMessage(
          err,
          'No se pudieron cargar los eventos para valorar.',
        );
      },
    });
  }

  private cargarEntradas() {
    this.comprasService.misCompras().subscribe((c) => {
      const todas = expandirEntradas(c);
      this.entradasActivas = todas.filter((e) => !e.eventoPasado);
      this.historialEntradas = todas.filter((e) => e.eventoPasado);
      this.gruposActivos = agruparEntradas(this.entradasActivas);
      this.gruposHistorial = agruparEntradas(this.historialEntradas).reverse();

      const maxActivas = Math.max(1, Math.ceil(this.gruposActivos.length / this.gruposPorPagina));
      const maxHistorial = Math.max(1, Math.ceil(this.gruposHistorial.length / this.gruposPorPagina));
      if (this.paginaActivas > maxActivas) this.paginaActivas = maxActivas;
      if (this.paginaHistorial > maxHistorial) this.paginaHistorial = maxHistorial;
    });
  }

  private verificarCompraStripe(sessionId: string) {
    this.compraVerificando = true;
    this.compraBanner = null;
    this.comprasService.verificarCheckout(sessionId).subscribe({
      next: (res) => {
        this.compraVerificando = false;
        if (res.status === 'refunded_overbooking') {
          this.compraBanner = {
            type: 'error',
            text:
              res.message ??
              'El aforo se agotó mientras completabas el pago. Se ha iniciado el reembolso automático.',
          };
        } else if (res.status === 'paid' && res.compras.length > 0) {
          this.compraBanner = {
            type: 'success',
            text: `¡Compra completada! ${res.compras.length} entrada(s) lista(s). Abre el evento para ver el QR.`,
          };
          this.tabEntradas = 'activas';
          this.paginaActivas = 1;
        } else if (res.status === 'paid') {
          this.compraBanner = {
            type: 'pending',
            text: 'Pago recibido. Tus entradas aparecerán aquí en unos segundos.',
          };
        } else {
          this.compraBanner = {
            type: 'pending',
            text: 'Estamos confirmando tu pago. Actualiza en unos segundos si no ves las entradas.',
          };
        }
        this.cargarEntradas();
        this.limpiarQueryCompra();
        this.scrollToEntradas();
      },
      error: () => {
        this.compraVerificando = false;
        this.compraBanner = {
          type: 'error',
          text: 'No se pudo confirmar el pago. Revisa tu perfil en unos segundos.',
        };
        this.cargarEntradas();
        this.limpiarQueryCompra();
        this.scrollToEntradas();
      },
    });
  }

  private limpiarQueryCompra() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { session_id: null, compra: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      fragment: 'entradas',
    });
  }

  private scrollToEntradas() {
    setTimeout(() => {
      document.getElementById('entradas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }

  async descargarEntrada(entrada: EntradaPerfil) {
    this.downloadError = '';
    this.downloadingKey = entrada.key;
    try {
      const titular = this.profile
        ? `${this.profile.nombre} ${this.profile.apellidos}`.trim()
        : undefined;
      await this.entradaPdf.download(entrada, titular);
    } catch {
      this.downloadError = 'No se pudo generar el PDF. Inténtalo de nuevo.';
    } finally {
      this.downloadingKey = null;
    }
  }

  solicitarResetPorEmail() {
    this.resetEmailLoading = true;
    this.resetEmailMsg = '';
    this.resetEmailError = '';
    this.auth.requestPasswordResetEmail().subscribe({
      next: (res) => {
        this.resetEmailMsg = res.message;
        this.resetEmailLoading = false;
      },
      error: (err) => {
        this.resetEmailError = getHttpErrorMessage(err, 'No se pudo enviar el enlace');
        this.resetEmailLoading = false;
      },
    });
  }

  changePassword() {
    if (this.passwordForm.invalid) return;
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.passwordError = 'Las contraseñas no coinciden';
      return;
    }
    this.auth.changePassword(currentPassword!, newPassword!).subscribe({
      next: (res: { message: string }) => {
        this.passwordMsg = res.message;
        this.passwordError = '';
        this.passwordForm.reset();
      },
      error: (err) => {
        this.passwordError = getHttpErrorMessage(err, 'Error al cambiar contraseña');
        this.passwordMsg = '';
      },
    });
  }
}
