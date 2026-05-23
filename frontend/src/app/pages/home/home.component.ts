import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { EventCardComponent } from '../../shared/event-card/event-card.component';
import { EventosService } from '../../core/services/eventos.service';
import { Evento } from '../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ReactiveFormsModule, NavbarComponent, FooterComponent, EventCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private eventosService = inject(EventosService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  populares: Evento[] = [];

  searchForm = this.fb.group({
    busqueda: [''],
    desde: [''],
    hasta: [''],
  });

  ngOnInit() {
    this.eventosService.getPopular(3).subscribe((e) => (this.populares = e));
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
