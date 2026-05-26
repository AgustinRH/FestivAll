import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { ValoracionesService } from '../../../core/services/valoraciones.service';
import { SeoService } from '../../../core/services/seo.service';
import { EventoOpinionesDetalle } from '../../../core/models';
import { parseEventoIdFromSlug } from '../../../core/utils/evento-slug.util';
import { opinionEventoPath } from '../../../core/utils/evento-slug.util';

@Component({
  selector: 'app-opinion-evento-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, NavbarComponent, FooterComponent],
  templateUrl: './opinion-evento-detail.component.html',
  styleUrl: './opinion-evento-detail.component.scss',
})
export class OpinionEventoDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private valoracionesService = inject(ValoracionesService);
  private seo = inject(SeoService);

  detalle: EventoOpinionesDetalle | null = null;
  loading = true;
  error = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = parseEventoIdFromSlug(params.get('slug') ?? '');
      if (id == null) {
        this.error = 'Evento no encontrado.';
        this.loading = false;
        return;
      }
      this.cargar(id);
    });
  }

  get imagenUrl(): string {
    return (
      this.detalle?.evento.imagenUrl ||
      'https://via.placeholder.com/1200x400?text=Evento'
    );
  }

  private cargar(idEvento: number): void {
    this.loading = true;
    this.error = '';
    this.valoracionesService.getOpinionesEvento(idEvento).subscribe({
      next: (res) => {
        this.detalle = res;
        this.loading = false;
        const ev = res.evento;
        this.seo.setStaticPage(
          `Opiniones: ${ev.titulo} | FestivAll Almería`,
          `Lee ${res.resumen.total} opiniones verificadas de asistentes a ${ev.titulo} en Almería.`,
          opinionEventoPath({
            id: ev.id,
            slug: ev.slug,
            titulo: ev.titulo,
            localidad: ev.localidad,
          }).join('/'),
        );
      },
      error: (err) => {
        this.detalle = null;
        this.loading = false;
        this.error =
          err.error?.message || 'No se encontraron opiniones para este evento.';
      },
    });
  }

  estrellas(n: number): boolean[] {
    return [1, 2, 3, 4, 5].map((i) => i <= n);
  }

  estrellasMedia(media: number): boolean[] {
    return this.estrellas(Math.round(media));
  }
}
