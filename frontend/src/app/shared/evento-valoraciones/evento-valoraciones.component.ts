import { Component, Input, OnChanges, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ValoracionesService } from '../../core/services/valoraciones.service';
import { ValoracionesEventoResponse } from '../../core/models';

@Component({
  selector: 'app-evento-valoraciones',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './evento-valoraciones.component.html',
  styleUrl: './evento-valoraciones.component.scss',
})
export class EventoValoracionesComponent implements OnChanges {
  @Input({ required: true }) eventoId!: number;

  private valoracionesService = inject(ValoracionesService);

  data: ValoracionesEventoResponse | null = null;
  loading = true;
  error = '';

  ngOnChanges(): void {
    if (this.eventoId) {
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.valoracionesService.getByEvento(this.eventoId).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las valoraciones.';
        this.loading = false;
      },
    });
  }

  estrellas(n: number): boolean[] {
    return [1, 2, 3, 4, 5].map((i) => i <= n);
  }

  estrellasMedia(media: number): boolean[] {
    const redondeada = Math.round(media);
    return [1, 2, 3, 4, 5].map((i) => i <= redondeada);
  }
}
