import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { EventCardComponent } from '../../../shared/event-card/event-card.component';
import { EventosService } from '../../../core/services/eventos.service';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { Evento, Categoria } from '../../../core/models';

@Component({
  selector: 'app-eventos-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent, EventCardComponent],
  templateUrl: './eventos-list.component.html',
  styleUrl: './eventos-list.component.scss',
})
export class EventosListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private catalogoService = inject(CatalogoService);

  eventos: Evento[] = [];
  categorias: Categoria[] = [];
  showFilters = false;

  filters = this.fb.group({
    busqueda: [''],
    categoriaId: [''],
    localidad: [''],
  });

  ngOnInit() {
    this.catalogoService.getCategorias().subscribe((c) => (this.categorias = c));
    this.loadEventos();
    this.filters.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.loadEventos());
  }

  loadEventos() {
    const v = this.filters.getRawValue();
    this.eventosService
      .getAll({
        busqueda: v.busqueda || undefined,
        categoriaId: v.categoriaId ? +v.categoriaId : undefined,
        localidad: v.localidad || undefined,
      })
      .subscribe((e) => (this.eventos = e));
  }

  clearFilters() {
    this.filters.reset({ busqueda: '', categoriaId: '', localidad: '' });
    this.loadEventos();
  }
}
