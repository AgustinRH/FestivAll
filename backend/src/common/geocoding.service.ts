import { Injectable, Logger } from '@nestjs/common';

export type GeocodingResult = {
  lat: number;
  lng: number;
  displayName: string;
};

export type AddressSuggestion = {
  id: string;
  label: string;
  direccion: string;
  localidad: string;
  provincia: string;
  codigoPostal?: string;
  lat: number;
  lng: number;
};

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    locality?: string;
    county?: string;
    state?: string;
    countrycode?: string;
  };
};

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private lastRequestAt = 0;
  /** Nominatim: máx. 1 petición por segundo. */
  private readonly minIntervalMs = 1100;

  async geocodeAddress(parts: {
    direccion: string;
    localidad: string;
    provincia?: string;
  }): Promise<GeocodingResult | null> {
    const direccion = parts.direccion?.trim();
    const localidad = parts.localidad?.trim();
    if (!direccion || !localidad) return null;

    const provincia = (parts.provincia?.trim() || 'Almería').trim();
    const query = [direccion, localidad, provincia, 'España'].join(', ');

    await this.respectRateLimit();

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'es');

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent':
            'FestivAll/1.0 (https://festivall.club; eventos geocoding)',
          'Accept-Language': 'es',
        },
      });

      if (!res.ok) {
        this.logger.warn(`Nominatim respondió ${res.status} para: ${query}`);
        return null;
      }

      const data = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name?: string;
      }>;

      if (!data?.length) {
        this.logger.debug(`Sin resultados de geocodificación para: ${query}`);
        return null;
      }

      const hit = data[0];
      const lat = Number(hit.lat);
      const lng = Number(hit.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        lat: Math.round(lat * 1e6) / 1e6,
        lng: Math.round(lng * 1e6) / 1e6,
        displayName: hit.display_name ?? query,
      };
    } catch (err) {
      this.logger.warn(`Error geocodificando "${query}": ${err}`);
      return null;
    }
  }

  /** Autocompletado de direcciones (Photon / OpenStreetMap). */
  async searchAddresses(
    query: string,
    limit = 8,
  ): Promise<AddressSuggestion[]> {
    const q = query?.trim();
    if (!q || q.length < 3) return [];

    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('q', q);
    url.searchParams.set('limit', String(Math.min(limit, 10)));
    // Photon solo admite: default, de, en, fr (no "es" — provoca HTTP 400).
    url.searchParams.set('lang', 'default');
    url.searchParams.set('bbox', '-9.6,35.0,4.6,44.1');

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent':
            'FestivAll/1.0 (https://festivall.club; address search)',
        },
      });

      if (!res.ok) {
        this.logger.warn(`Photon respondió ${res.status} para: ${q}`);
        return this.searchAddressesNominatim(q, limit);
      }

      const body = (await res.json()) as { features?: PhotonFeature[] };
      const features = body.features ?? [];

      const mapped = features
        .filter((f) => f.properties?.countrycode?.toUpperCase() === 'ES')
        .map((f) => this.photonToSuggestion(f))
        .filter((s): s is AddressSuggestion => s != null);

      if (mapped.length > 0) return mapped;

      // Respaldo si Photon no devuelve resultados parseables
      return this.searchAddressesNominatim(q, limit);
    } catch (err) {
      this.logger.warn(`Error buscando direcciones "${q}": ${err}`);
      return this.searchAddressesNominatim(q, limit);
    }
  }

  private async searchAddressesNominatim(
    query: string,
    limit: number,
  ): Promise<AddressSuggestion[]> {
    await this.respectRateLimit();

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(Math.min(limit, 8)));
    url.searchParams.set('countrycodes', 'es');
    url.searchParams.set('addressdetails', '1');

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent':
            'FestivAll/1.0 (https://festivall.club; address search)',
          'Accept-Language': 'es',
        },
      });
      if (!res.ok) return [];

      const data = (await res.json()) as Array<{
        place_id: number;
        lat: string;
        lon: string;
        display_name?: string;
        address?: {
          road?: string;
          house_number?: string;
          pedestrian?: string;
          tourism?: string;
          amenity?: string;
          city?: string;
          town?: string;
          village?: string;
          municipality?: string;
          county?: string;
          state?: string;
          postcode?: string;
        };
      }>;

      return data
        .map((hit) => {
          const a = hit.address ?? {};
          const localidad =
            a.city || a.town || a.village || a.municipality || a.county || '';
          const direccion =
            [a.road, a.house_number].filter(Boolean).join(' ').trim() ||
            a.pedestrian ||
            a.tourism ||
            a.amenity ||
            '';
          if (!direccion || !localidad) return null;

          const lat = Number(hit.lat);
          const lng = Number(hit.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          const provincia = this.normalizeProvincia(a.county, a.state);
          const label =
            hit.display_name ?? [direccion, localidad, provincia].join(', ');

          const item: AddressSuggestion = {
            id: `n-${hit.place_id}`,
            label,
            direccion,
            localidad,
            provincia,
            lat: Math.round(lat * 1e6) / 1e6,
            lng: Math.round(lng * 1e6) / 1e6,
          };
          const cp = a.postcode?.trim();
          if (cp) item.codigoPostal = cp;
          return item;
        })
        .filter((s): s is AddressSuggestion => s != null);
    } catch {
      return [];
    }
  }

  private photonToSuggestion(feature: PhotonFeature): AddressSuggestion | null {
    const p = feature.properties;
    const [lng, lat] = feature.geometry?.coordinates ?? [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const localidad =
      p.city?.trim() ||
      p.town?.trim() ||
      p.village?.trim() ||
      p.municipality?.trim() ||
      p.locality?.trim() ||
      p.county?.trim() ||
      '';
    if (!localidad) return null;

    const streetLine = [p.street, p.housenumber]
      .filter(Boolean)
      .join(' ')
      .trim();
    const direccion = streetLine || p.name?.trim() || '';
    if (!direccion) return null;

    const provincia = this.normalizeProvincia(p.county, p.state);
    const codigoPostal = p.postcode?.trim() || undefined;
    const labelParts = [direccion, localidad, provincia, codigoPostal].filter(
      Boolean,
    );

    const id =
      p.osm_type && p.osm_id != null
        ? `${p.osm_type}-${p.osm_id}`
        : `${lat.toFixed(5)}-${lng.toFixed(5)}`;

    return {
      id,
      label: labelParts.join(', '),
      direccion,
      localidad,
      provincia,
      codigoPostal,
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
    };
  }

  /** Prefiere provincia (county) frente a comunidad autónoma (state). */
  private normalizeProvincia(county?: string, state?: string): string {
    const c = county?.trim();
    if (
      c &&
      !/andalucía|murcia|valencia|castilla|galicia|cataluña|navarra|país vasco|extremadura|asturias|cantabria|rioja|madrid|aragon|balear|canarias/i.test(
        c,
      )
    ) {
      return c;
    }
    const s = state?.trim();
    if (s && !/andalucía|murcia|comunidad|autónoma|autonomia/i.test(s)) {
      return s;
    }
    return 'Almería';
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const wait = this.minIntervalMs - (now - this.lastRequestAt);
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }
    this.lastRequestAt = Date.now();
  }
}
