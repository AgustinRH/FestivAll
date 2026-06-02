import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { ValoracionesService } from '../../../core/services/valoraciones.service';
import { SeoService } from '../../../core/services/seo.service';
import { EventoConValoraciones } from '../../../core/models';
import { resolveEventoImageUrl } from '../../../core/utils/evento-image.util';
import { opinionEventoPath } from '../../../core/utils/evento-slug.util';

@Component({
  selector: 'app-opiniones-list',
  standalone: true,
  imports: [RouterLink, DatePipe, NavbarComponent, FooterComponent],
  templateUrl: './opiniones-list.component.html',
  styleUrl: './opiniones-list.component.scss',
})
export class OpinionesListComponent implements OnInit {
  private valoracionesService = inject(ValoracionesService);
  private seo = inject(SeoService);

  eventos: EventoConValoraciones[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.seo.setStaticPage(
      'Opiniones de asistentes | FestivAll Almería',
      'Lee las experiencias verificadas de quienes asistieron a festivales y conciertos en Almería.',
      '/opiniones',
    );
    this.valoracionesService.getEventosConValoraciones().subscribe({
      next: (list) => {
        this.eventos = list;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los eventos con opiniones.';
        this.loading = false;
      },
    });
  }

  imagenUrl(evento: EventoConValoraciones): string {
    return resolveEventoImageUrl(evento.imagenUrl);
  }

  opinionLink(evento: EventoConValoraciones): string[] {
    return opinionEventoPath({
      id: evento.id,
      slug: evento.slug,
      titulo: evento.titulo,
      localidad: evento.localidad,
    });
  }

  estrellasMedia(media: number): boolean[] {
    const n = Math.round(media);
    return [1, 2, 3, 4, 5].map((i) => i <= n);
  }

}
