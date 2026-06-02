import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { Evento } from '../../core/models';
import { eventoPath } from '../../core/utils/evento-slug.util';
import { resolveEventoImageUrl } from '../../core/utils/evento-image.util';
import { urlImagenListado } from '../../core/utils/evento-imagenes.util';
import { aplicaDescuentoUltimasEntradas, getPrecioUnitario } from '../../core/utils/precio.util';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.scss',
})
export class EventCardComponent {
  @Input({ required: true }) evento!: Evento;

  get imagenUrl(): string {
    return resolveEventoImageUrl(urlImagenListado(this.evento.imagenes));
  }

  get precioFinal(): number {
    return getPrecioUnitario(this.evento);
  }

  get tieneDescuento(): boolean {
    return (
      aplicaDescuentoUltimasEntradas(this.evento.stock) &&
      this.precioFinal < Number(this.evento.precio)
    );
  }

  get eventoLink(): string[] {
    return eventoPath(this.evento);
  }
}
