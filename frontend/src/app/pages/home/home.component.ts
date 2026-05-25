import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { EventCardComponent } from '../../shared/event-card/event-card.component';
import { EventosService } from '../../core/services/eventos.service';
import { Evento } from '../../core/models';

const HOME_ULTIMAS_ENTRADAS_MAX = 6;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NavbarComponent, FooterComponent, EventCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private eventosService = inject(EventosService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  populares: Evento[] = [];
  ultimasEntradas: Evento[] = [];
  totalUltimasEntradas = 0;
  loading = true;
  error = '';

  get hayMasUltimasEntradas(): boolean {
    return this.totalUltimasEntradas > HOME_ULTIMAS_ENTRADAS_MAX;
  }

  searchForm = this.fb.group({
    busqueda: [''],
    desde: [''],
    hasta: [''],
  });

  ngOnInit() {
    forkJoin({
      populares: this.eventosService.getPopular(),
      ultimas: this.eventosService.getUltimasEntradas(),
    }).subscribe({
      next: ({ populares, ultimas }) => {
        this.populares = populares;
        this.totalUltimasEntradas = ultimas.length;
        this.ultimasEntradas = ultimas.slice(0, HOME_ULTIMAS_ENTRADAS_MAX);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error =
          'No se pudieron cargar los festivales. Comprueba que el backend esté en marcha (docker compose ps).';
      },
    });
  }

  buscar() {
    const v = this.searchForm.getRawValue();
    this.router.navigate(['/eventos'], {
      queryParams: {
        busqueda: v.busqueda || undefined,
        desde: v.desde || undefined,
        hasta: v.hasta || undefined,
      },
    });
  }
}
