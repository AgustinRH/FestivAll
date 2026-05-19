import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Evento } from '../../core/models';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.scss',
})
export class EventCardComponent {
  @Input({ required: true }) evento!: Evento;

  get imagenUrl(): string {
    const principal = this.evento.imagenes?.find((i) => i.esPrincipal);
    return principal?.url || this.evento.imagenes?.[0]?.url || 'https://via.placeholder.com/400x250?text=Evento';
  }
}
