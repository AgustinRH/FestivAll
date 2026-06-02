import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../shared/footer/footer.component';
import { EventosService } from '../../../core/services/eventos.service';
import { SeoService } from '../../../core/services/seo.service';
import { EventoMapa } from '../../../core/models';
import { resolveEventoImageUrl } from '../../../core/utils/evento-image.util';
import { getEventoSlugSegment } from '../../../core/utils/evento-slug.util';

/** Centro provincia de Almería */
const ALMERIA_CENTER: L.LatLngExpression = [36.8381, -2.4597];
const DEFAULT_ZOOM = 10;

@Component({
  selector: 'app-buscador-mapa',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './buscador-mapa.component.html',
  styleUrl: './buscador-mapa.component.scss',
})
export class BuscadorMapaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private eventosService = inject(EventosService);
  private seo = inject(SeoService);

  private map?: L.Map;
  private markersLayer = L.layerGroup();
  private userMarker?: L.CircleMarker;
  private resizeObserver?: ResizeObserver;
  private resizeListener = () => this.refreshMapSize();

  loading = true;
  error = '';
  totalEventos = 0;
  usarCercania = false;
  radioKm = 30;
  ubicacionUsuario: { lat: number; lng: number } | null = null;

  ngAfterViewInit(): void {
    this.seo.setStaticPage(
      'Mapa de festivales | FestivAll Almería',
      'Explora en el mapa los festivales y conciertos activos en la provincia de Almería.',
      '/mapa',
    );
    this.initMap();
    this.setupMapResizeHandling();
    this.cargarEventos();
    this.intentarGeolocalizacion();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.resizeListener);
    this.map?.remove();
  }

  private setupMapResizeHandling(): void {
    const wrapper = this.mapContainer.nativeElement.parentElement;
    if (wrapper && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.refreshMapSize());
      this.resizeObserver.observe(wrapper);
    }
    window.addEventListener('resize', this.resizeListener);
    requestAnimationFrame(() => this.refreshMapSize());
    setTimeout(() => this.refreshMapSize(), 150);
    setTimeout(() => this.refreshMapSize(), 500);
  }

  private refreshMapSize(): void {
    if (!this.map) return;
    this.map.invalidateSize({ animate: false });
  }

  recargar(): void {
    this.cargarEventos();
  }

  toggleCercania(): void {
    this.usarCercania = !this.usarCercania;
    this.cargarEventos();
  }

  onRadioChange(): void {
    if (this.usarCercania && this.ubicacionUsuario) {
      this.cargarEventos();
    }
  }

  centrarEnMi(): void {
    if (!this.ubicacionUsuario || !this.map) return;
    const { lat, lng } = this.ubicacionUsuario;
    this.map.setView([lat, lng], 11);
  }

  private initMap(): void {
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = defaultIcon;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: ALMERIA_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    this.markersLayer.addTo(this.map);
    this.refreshMapSize();
  }

  private intentarGeolocalizacion(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.ubicacionUsuario = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        if (this.map) {
          this.userMarker?.remove();
          this.userMarker = L.circleMarker(
            [this.ubicacionUsuario.lat, this.ubicacionUsuario.lng],
            {
              radius: 8,
              color: '#3b82f6',
              fillColor: '#60a5fa',
              fillOpacity: 0.9,
              weight: 2,
            },
          )
            .addTo(this.map)
            .bindPopup('Tu ubicación');
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  private cargarEventos(): void {
    this.loading = true;
    this.error = '';

    const filters =
      this.usarCercania && this.ubicacionUsuario
        ? {
            lat: this.ubicacionUsuario.lat,
            lng: this.ubicacionUsuario.lng,
            radio: this.radioKm,
          }
        : undefined;

    this.eventosService.getMapa(filters).subscribe({
      next: (eventos) => {
        this.totalEventos = eventos.length;
        this.pintarMarcadores(eventos);
        this.loading = false;
        setTimeout(() => this.refreshMapSize(), 50);
        setTimeout(() => this.refreshMapSize(), 300);
      },
      error: () => {
        this.error = 'No se pudieron cargar los eventos en el mapa.';
        this.loading = false;
      },
    });
  }

  private pintarMarcadores(eventos: EventoMapa[]): void {
    if (!this.map) return;
    this.markersLayer.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    for (const ev of eventos) {
      const lat = Number(ev.latitud);
      const lng = Number(ev.longitud);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const marker = L.marker([lat, lng]);
      marker.bindPopup(this.popupHtml(ev), { maxWidth: 280 });
      this.markersLayer.addLayer(marker);
      bounds.push([lat, lng]);
    }

    if (bounds.length > 0) {
      this.map.fitBounds(L.latLngBounds(bounds), { padding: [48, 48], maxZoom: 13 });
    } else {
      this.map.setView(ALMERIA_CENTER, DEFAULT_ZOOM);
    }
    setTimeout(() => this.refreshMapSize(), 0);
  }

  private popupHtml(ev: EventoMapa): string {
    const slug = getEventoSlugSegment({
      id: ev.id,
      slug: ev.slug,
      titulo: ev.titulo,
      ubicacion: { localidad: ev.localidad },
    });
    const img = resolveEventoImageUrl(ev.imagenCartel);
    const precio =
      ev.precioDesde <= 0
        ? 'Gratis'
        : `${ev.precioDesde.toFixed(2).replace('.', ',')} €`;

    return `
      <div class="map-popup">
        <img class="map-popup__img" src="${this.escapeHtml(img)}" alt="" loading="lazy" />
        <h3 class="map-popup__title">${this.escapeHtml(ev.titulo)}</h3>
        <p class="map-popup__meta">📍 ${this.escapeHtml(ev.localidad)}</p>
        <p class="map-popup__precio">Desde <strong>${precio}</strong></p>
        <a class="map-popup__btn" href="/eventos/${slug}">Ver entradas</a>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
