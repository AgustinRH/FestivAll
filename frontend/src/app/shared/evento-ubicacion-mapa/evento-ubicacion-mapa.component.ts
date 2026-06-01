import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import {
  googleMapsDirectionsUrl,
  googleMapsSearchAddressUrl,
} from '../../core/utils/maps.util';

@Component({
  selector: 'app-evento-ubicacion-mapa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evento-ubicacion-mapa.component.html',
  styleUrl: './evento-ubicacion-mapa.component.scss',
})
export class EventoUbicacionMapaComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() latitud?: number | string | null;
  @Input() longitud?: number | string | null;
  @Input() direccion = '';
  @Input() localidad = '';
  @Input() provincia = '';
  @Input() etiqueta = '';

  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private marker?: L.Marker;

  get coords(): { lat: number; lng: number } | null {
    const lat = Number(this.latitud);
    const lng = Number(this.longitud);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  get googleMapsUrl(): string {
    const c = this.coords;
    if (c) return googleMapsDirectionsUrl(c.lat, c.lng);
    return googleMapsSearchAddressUrl({
      direccion: this.direccion,
      localidad: this.localidad,
      provincia: this.provincia,
    });
  }

  get direccionCompleta(): string {
    return [this.direccion, this.localidad, this.provincia || 'Almería'].filter(Boolean).join(', ');
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['latitud'] || changes['longitud']) &&
      this.mapEl &&
      !changes['latitud']?.firstChange
    ) {
      this.destroyMap();
      setTimeout(() => this.initMap(), 0);
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  abrirGoogleMaps(): void {
    window.open(this.googleMapsUrl, '_blank', 'noopener,noreferrer');
  }

  private initMap(): void {
    const c = this.coords;
    if (!c || !this.mapEl) return;

    const defaultIcon = L.icon({
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
      zoom: 15,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomControl: false,
      touchZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);

    this.marker = L.marker([c.lat, c.lng], { icon: defaultIcon }).addTo(this.map);

    setTimeout(() => this.map?.invalidateSize({ animate: false }), 100);
  }

  private destroyMap(): void {
    this.marker = undefined;
    this.map?.remove();
    this.map = undefined;
  }
}
