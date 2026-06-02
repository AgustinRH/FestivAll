import { Component, Input, OnChanges, OnInit, SimpleChanges, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { markFormGroupTouched } from '../../core/utils/form-validation.util';
import { FormFieldErrorComponent } from '../form-field-error/form-field-error.component';
import { CommonModule } from '@angular/common';
import { ValoracionesService } from '../../core/services/valoraciones.service';
import { AuthService } from '../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { eventoHaPasado } from '../../core/utils/evento.util';
import { Evento } from '../../core/models';

@Component({
  selector: 'app-evento-valoracion-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormFieldErrorComponent],
  templateUrl: './evento-valoracion-form.component.html',
  styleUrl: './evento-valoracion-form.component.scss',
})
export class EventoValoracionFormComponent implements OnInit, OnChanges {
  @Input({ required: true }) evento!: Evento;
  /** En perfil: título más pequeño y sin margen de sección. */
  @Input() compact = false;
  enviado = output<void>();
  omitidoEvento = output<void>();

  private fb = inject(FormBuilder);
  private valoracionesService = inject(ValoracionesService);
  auth = inject(AuthService);
  router = inject(Router);

  puntuacion = 0;
  hoverStar = 0;
  puedeValorar = false;
  yaValorado = false;
  omitido = false;
  eventoFinalizado = false;
  tieneAsistencia = false;
  loadingElegibilidad = true;
  saving = false;
  omitiendo = false;
  msg = '';
  msgError = '';

  form = this.fb.group({
    comentario: ['', [Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    this.checkElegibilidad();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const ev = changes['evento'];
    if (!ev || !this.evento?.id) return;
    if (ev.firstChange) return;
    if (ev.previousValue?.id !== ev.currentValue?.id) {
      this.checkElegibilidad();
    }
  }

  get eventoPasado(): boolean {
    return eventoHaPasado(this.evento);
  }

  private checkElegibilidad(): void {
    this.eventoFinalizado = this.eventoPasado;
    if (!this.auth.isLoggedIn()) {
      this.loadingElegibilidad = false;
      this.puedeValorar = false;
      return;
    }
    this.loadingElegibilidad = true;
    this.valoracionesService.getElegibilidad(this.evento.id).subscribe({
      next: (e) => {
        this.puedeValorar = e.puedeValorar;
        this.yaValorado = e.yaValorado;
        this.omitido = e.omitido;
        this.tieneAsistencia = e.tieneAsistencia;
        this.eventoFinalizado = e.eventoFinalizado;
        this.loadingElegibilidad = false;
      },
      error: (err) => {
        this.loadingElegibilidad = false;
        this.msgError =
          err.error?.message || 'No se pudo comprobar si puedes valorar este evento.';
      },
    });
  }

  setStar(n: number): void {
    this.puntuacion = n;
  }

  setHover(n: number): void {
    this.hoverStar = n;
  }

  clearHover(): void {
    this.hoverStar = 0;
  }

  displayStar(i: number): boolean {
    const ref = this.hoverStar || this.puntuacion;
    return i <= ref;
  }

  omitir(): void {
    if (!this.auth.isLoggedIn() || this.omitiendo) return;
    this.omitiendo = true;
    this.msgError = '';
    this.valoracionesService.omitir(this.evento.id).subscribe({
      next: (res) => {
        this.omitiendo = false;
        this.omitido = true;
        this.puedeValorar = false;
        this.msg = res.message;
        this.omitidoEvento.emit();
      },
      error: (err) => {
        this.omitiendo = false;
        this.msgError = err.error?.message || 'No se pudo guardar tu preferencia.';
      },
    });
  }

  isInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  submit(): void {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    markFormGroupTouched(this.form);
    if (!this.puntuacion) {
      this.msgError = 'Selecciona una puntuación de 1 a 5 estrellas.';
      return;
    }
    if (this.form.invalid) return;
    this.saving = true;
    this.msgError = '';
    this.msg = '';
    const comentario = this.form.get('comentario')?.value?.trim() || undefined;
    this.valoracionesService
      .create({
        idEvento: this.evento.id,
        puntuacion: this.puntuacion,
        comentario,
      })
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.msg = res.message;
          this.puntuacion = 0;
          this.form.reset({ comentario: '' });
          this.puedeValorar = false;
          this.yaValorado = true;
          this.enviado.emit();
        },
        error: (err) => {
          this.saving = false;
          this.msgError = err.error?.message || 'No se pudo enviar la valoración.';
        },
      });
  }
}
