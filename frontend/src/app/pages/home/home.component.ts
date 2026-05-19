import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { EventCardComponent } from '../../shared/event-card/event-card.component';
import { EventosService } from '../../core/services/eventos.service';
import { Evento } from '../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NavbarComponent, EventCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private eventosService = inject(EventosService);
  populares: Evento[] = [];

  ngOnInit() {
    this.eventosService.getPopular(4).subscribe((e) => (this.populares = e));
  }
}
