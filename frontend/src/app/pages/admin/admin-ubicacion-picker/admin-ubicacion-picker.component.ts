import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import * as L from 'leaflet';
import {
  Subject,
  Subscription,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { EventosService } from '../../../core/services/eventos.service';
import { AddressSuggestion } from '../../../core/models';

@Component({
  selector: 'app-admin-ubicacion-picker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-ubicacion-picker.component.html',
  styleUrl: './admin-ubicacion-picker.component.scss',
})
export class AdminUbicacionPickerComponent implements AfterViewInit, OnDestroy {
  form = input.required<FormGroup>();

  private eventosService = inject(EventosService);
  private searchInput$ = new Subject<string>();
  private subs = new Subscription();

  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;

  searchQuery = '';
  suggestions: AddressSuggestion[] = [];
  showDropdown = false;
  searchLoading = false;
  geocodeFallbackLoading = false;
  mapReady = false;

  private map?: L.Map;
  private marker?: L.Marker;
  private draggingMarker = false;

  ngAfterViewInit(): void {
    const dir = this.form().get('direccion')?.value?.trim();
    const loc = this.form().get('localidad')?.value?.trim();
    const prov = this.form().get('provincia')?.value?.trim();
    if (dir && loc && this.readCoords()) {
      this.searchQuery = [dir, loc, prov].filter(Boolean).join(', ');
    }
    this.subs.add(
      this.searchInput$
        .pipe(
          debounceTime(350),
          distinctUntilChanged(),
          tap(() => {
            this.searchLoading = true;
          }),
          filter((q) => q.length >= 3),
          switchMap((q) =>
            this.eventosService.buscarUbicaciones(q).pipe(catchError(() => of([]))),
          ),
        )
        .subscribe((results) => {
          this.searchLoading = false;
          this.suggestions = results;
          this.showDropdown = results.length > 0;
        }),
    );

    this.subs.add(
      this.searchInput$.pipe(filter((q) => q.length < 3)).subscribe(() => {
        this.searchLoading = false;
        this.suggestions = [];
        this.showDropdown = false;
      }),
    );

    this.subs.add(
      this.form().valueChanges.subscribe(() => {
        if (!this.draggingMarker) {
          this.scheduleMapRefresh();
        }
      }),
    );

    this.scheduleMapRefresh();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.destroyMap();
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.searchInput$.next(value.trim());
  }

  onSearchFocus(): void {
    if (this.suggestions.length) {
      this.showDropdown = true;
    }
  }

  closeDropdown(): void {
    setTimeout(() => {
      this.showDropdown = false;
    }, 150);
  }

  selectSuggestion(item: AddressSuggestion): void {
    this.form().patchValue({
      direccion: item.direccion,
      localidad: item.localidad,
      provincia: item.provincia,
      latitud: item.lat,
      longitud: item.lng,
    });
    this.searchQuery = item.label;
    this.showDropdown = false;
    this.suggestions = [];
    this.scheduleMapRefresh();
  }

  geocodificarDesdeCampos(): void {
    const direccion = this.form().get('direccion')?.value?.trim();
    const localidad = this.form().get('localidad')?.value?.trim();
    const provincia = this.form().get('provincia')?.value?.trim() || 'Almería';
    if (!direccion || !localidad) return;

    this.geocodeFallbackLoading = true;
    this.eventosService.geocodificar(direccion, localidad, provincia).subscribe({
      next: (res) => {
        this.geocodeFallbackLoading = false;
        this.form().patchValue({ latitud: res.lat, longitud: res.lng });
        this.scheduleMapRefresh();
      },
      error: () => {
        this.geocodeFallbackLoading = false;
      },
    });
  }

  isInvalid(name: string): boolean {
    const c = this.form().get(name);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  get hasCoords(): boolean {
    return this.readCoords() != null;
  }

  private readCoords(): { lat: number; lng: number } | null {
    const lat = this.parseCoord(this.form().get('latitud')?.value);
    const lng = this.parseCoord(this.form().get('longitud')?.value);
    if (lat == null || lng == null) return null;
    return { lat, lng };
  }

  private parseCoord(v: unknown): number | null {
    if (v === '' || v == null) return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
  }

  private scheduleMapRefresh(): void {
    setTimeout(() => this.refreshMap(), 0);
  }

  private refreshMap(): void {
    const c = this.readCoords();
    if (!c || !this.mapEl) {
      this.mapReady = false;
      this.destroyMap();
      return;
    }

    if (!this.map) {
      this.initMap(c);
      return;
    }

    this.marker?.setLatLng([c.lat, c.lng]);
    this.map.setView([c.lat, c.lng], this.map.getZoom(), { animate: false });
    this.mapReady = true;
    setTimeout(() => this.map?.invalidateSize({ animate: false }), 50);
  }

  private initMap(c: { lat: number; lng: number }): void {
    if (!this.mapEl) return;

    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    this.map = L.map(this.mapEl.nativeElement, {
      center: [c.lat, c.lng],
      zoom: 16,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);

    this.marker = L.marker([c.lat, c.lng], { icon, draggable: true }).addTo(this.map);

    this.marker.on('dragstart', () => {
      this.draggingMarker = true;
    });

    this.marker.on('dragend', () => {
      const pos = this.marker?.getLatLng();
      if (pos) {
        const lat = Math.round(pos.lat * 1e6) / 1e6;
        const lng = Math.round(pos.lng * 1e6) / 1e6;
        this.form().patchValue({ latitud: lat, longitud: lng }, { emitEvent: false });
      }
      this.draggingMarker = false;
    });

    this.mapReady = true;
    setTimeout(() => this.map?.invalidateSize({ animate: false }), 100);
  }

  private destroyMap(): void {
    this.marker = undefined;
    this.map?.remove();
    this.map = undefined;
  }
}
