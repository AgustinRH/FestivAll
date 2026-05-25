import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { slugify } from '../../../core/utils/seo-slug.util';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { EventCardComponent } from '../../../shared/event-card/event-card.component';
import { EventosService } from '../../../core/services/eventos.service';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { Evento, Categoria, Ubicacion } from '../../../core/models';

@Component({
  selector: 'app-eventos-list',
  standalone: true,
  imports: [ReactiveFormsModule, NavbarComponent, FooterComponent, EventCardComponent],
  templateUrl: './eventos-list.component.html',
  styleUrl: './eventos-list.component.scss',
})
export class EventosListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private eventosService = inject(EventosService);
  private catalogoService = inject(CatalogoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly pageSize = 20;

  eventos: Evento[] = [];
  categorias: Categoria[] = [];
  ubicaciones: Ubicacion[] = [];
  showFilters = false;
  loading = false;
  page = 1;
  total = 0;
  totalPages = 1;

  filters = this.fb.group({
    busqueda: [''],
    categoriaId: [''],
    localidad: [''],
    precioMin: ['' as string | number],
    precioMax: ['' as string | number],
    ultimasEntradas: [false],
  });

  ngOnInit() {
    forkJoin({
      categorias: this.catalogoService.getCategorias(),
      ubicaciones: this.catalogoService.getUbicaciones(),
    }).subscribe(({ categorias, ubicaciones }) => {
      this.categorias = categorias;
      this.ubicaciones = ubicaciones;
    });

    this.route.queryParams.subscribe((params) => this.applyRouteState(params));
    this.route.paramMap.subscribe(() =>
      this.applyRouteState(this.route.snapshot.queryParams),
    );
  }

  private resolveSeoFilters(): { localidad?: string; categoriaId?: string } {
    const path = this.router.url.split('?')[0];
    const locMatch = path.match(/^\/eventos\/localidad\/([^/]+)/);
    if (locMatch) {
      const slug = decodeURIComponent(locMatch[1]);
      const u = this.ubicaciones.find((x) => slugify(x.localidad) === slug);
      return u ? { localidad: u.localidad } : {};
    }
    const catMatch = path.match(/^\/eventos\/categoria\/([^/]+)/);
    if (catMatch) {
      const slug = decodeURIComponent(catMatch[1]);
      const c = this.categorias.find((x) => slugify(x.nombreCategoria) === slug);
      return c ? { categoriaId: String(c.id) } : {};
    }
    return {};
  }

  private applyRouteState(params: Record<string, string>) {
    const seo = this.resolveSeoFilters();
    const ultimas =
      params['ultimasEntradas'] === 'true' || params['ultimasEntradas'] === '1';
    if (ultimas || params['precioMin'] || params['precioMax'] || seo.localidad || seo.categoriaId) {
      this.showFilters = true;
    }
    this.filters.patchValue({
      busqueda: params['busqueda'] || '',
      categoriaId: seo.categoriaId || params['categoriaId'] || '',
      localidad: seo.localidad || params['localidad'] || '',
      precioMin: params['precioMin'] ?? '',
      precioMax: params['precioMax'] ?? '',
      ultimasEntradas: ultimas,
    });
    const page = Math.max(1, +(params['page'] || 1) || 1);
    this.loadEventos(page, params['desde'], params['hasta']);
  }

  private parsePrecioFiltro(value: string | number | null | undefined): number | undefined {
    if (value === '' || value === null || value === undefined) return undefined;
    const n = typeof value === 'number' ? value : +value;
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  }

  loadEventos(page = 1, desde?: string, hasta?: string) {
    const v = this.filters.getRawValue();
    const precioMin = this.parsePrecioFiltro(v.precioMin);
    let precioMax = this.parsePrecioFiltro(v.precioMax);
    if (precioMin != null && precioMax != null && precioMax < precioMin) {
      precioMax = precioMin;
    }

    this.loading = true;
    this.eventosService
      .getPaginated({
        busqueda: v.busqueda || undefined,
        categoriaId: v.categoriaId ? +v.categoriaId : undefined,
        localidad: v.localidad || undefined,
        ultimasEntradas: v.ultimasEntradas || undefined,
        precioMin,
        precioMax,
        desde: desde || undefined,
        hasta: hasta || undefined,
        page,
        limit: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.eventos = res.items;
          this.page = res.page;
          this.total = res.total;
          this.totalPages = res.totalPages;
          this.loading = false;
        },
        error: () => {
          this.eventos = [];
          this.total = 0;
          this.totalPages = 1;
          this.loading = false;
        },
      });
  }

  aplicarFiltros() {
    const v = this.filters.getRawValue();
    const precioMin = this.parsePrecioFiltro(v.precioMin);
    let precioMax = this.parsePrecioFiltro(v.precioMax);
    if (precioMin != null && precioMax != null && precioMax < precioMin) {
      precioMax = precioMin;
      this.filters.patchValue({ precioMax: precioMin });
    }
    this.router.navigate(['/eventos'], {
      queryParams: {
        busqueda: v.busqueda || null,
        categoriaId: v.categoriaId || null,
        localidad: v.localidad || null,
        precioMin: precioMin ?? null,
        precioMax: precioMax ?? null,
        ultimasEntradas: v.ultimasEntradas ? true : null,
        page: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  clearFilters() {
    this.filters.reset({
      busqueda: '',
      categoriaId: '',
      localidad: '',
      precioMin: '',
      precioMax: '',
      ultimasEntradas: false,
    });
    this.router.navigate(['/eventos'], { queryParams: { page: null } });
  }

  goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > this.totalPages || nextPage === this.page) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: nextPage > 1 ? nextPage : null },
      queryParamsHandling: 'merge',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get rangoInicio(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get rangoFin(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }
}
