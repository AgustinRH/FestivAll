import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { Evento } from '../../core/models';
import { getPrecioUnitario } from '../../core/utils/precio.util';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.scss',
})
export class EventCardComponent {
  @Input({ required: true }) evento!: Evento;
  @Input() mostrarDescuento = false;

  get imagenUrl(): string {
    const principal = this.evento.imagenes?.find((i) => i.esPrincipal);
    return principal?.url || this.evento.imagenes?.[0]?.url || 'https://via.placeholder.com/400x250?text=Evento';
  }

  get precioFinal(): number {
    return getPrecioUnitario(this.evento);
  }

  get tieneDescuento(): boolean {
    return this.mostrarDescuento && this.precioFinal < Number(this.evento.precio);
  }
}
