import { Evento } from '../models';
import { getEventoSlugSegment } from './evento-slug.util';
import { getPrecioUnitario } from './precio.util';

function toSchemaDateTime(date: string, time?: string | null): string {
  const day = date?.slice(0, 10);
  if (!day) return '';
  if (!time?.trim()) return day;
  const normalized = time.length === 5 ? `${time}:00` : time;
  return `${day}T${normalized}+02:00`;
}

export function toAbsoluteResourceUrl(
  url: string | undefined,
  siteOrigin: string,
): string | undefined {
  const raw = url?.trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  const origin = siteOrigin.replace(/\/$/, '');
  return `${origin}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function principalImageUrl(evento: Evento, siteOrigin: string): string | undefined {
  const principal = evento.imagenes?.find((i) => i.esPrincipal);
  const url = principal?.url || evento.imagenes?.[0]?.url;
  return toAbsoluteResourceUrl(url, siteOrigin);
}

function plainDescription(evento: Evento): string {
  const text = evento.descripcion?.replace(/\s+/g, ' ').trim();
  if (text) return text;
  const loc = evento.ubicacion;
  const lugar = loc ? `${loc.localidad}, ${loc.provincia}` : 'Almería';
  return `${evento.titulo} — ${evento.categoria?.nombreCategoria ?? 'Evento'} en ${lugar}.`;
}

/** JSON-LD schema.org/Event para fichas de evento. */
export function buildEventJsonLd(
  evento: Evento,
  pageUrl: string,
  siteOrigin: string,
): Record<string, unknown> {
  const u = evento.ubicacion;
  const precio = getPrecioUnitario(evento);
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${pageUrl}#event`,
    name: evento.titulo,
    description: plainDescription(evento),
    startDate: toSchemaDateTime(evento.fechaInicio, evento.horaInicio),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: pageUrl,
    identifier: String(evento.id),
    inLanguage: 'es-ES',
    location: {
      '@type': 'Place',
      name: u?.direccion || evento.titulo,
      address: {
        '@type': 'PostalAddress',
        streetAddress: u?.direccion ?? '',
        addressLocality: u?.localidad ?? 'Almería',
        addressRegion: u?.provincia ?? 'Almería',
        addressCountry: 'ES',
      },
    },
    offers: {
      '@type': 'Offer',
      url: pageUrl,
      price: precio.toFixed(2),
      priceCurrency: 'EUR',
      availability:
        evento.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
      validFrom: toSchemaDateTime(evento.fechaInicio, evento.horaInicio) || undefined,
    },
  };

  if (precio <= 0) {
    (schema['offers'] as Record<string, unknown>)['price'] = '0';
    schema['isAccessibleForFree'] = true;
  }

  const endDate = toSchemaDateTime(
    evento.fechaFin || evento.fechaInicio,
    evento.horaFin,
  );
  if (endDate) {
    schema['endDate'] = endDate;
  }

  const image = principalImageUrl(evento, siteOrigin);
  if (image) {
    schema['image'] = [image];
  }

  if (evento.categoria?.nombreCategoria) {
    schema['category'] = evento.categoria.nombreCategoria;
  }

  if (evento.cliente?.nombre) {
    schema['organizer'] = {
      '@type': 'Organization',
      name: evento.cliente.nombre,
    };
  }

  return schema;
}

export function eventoCanonicalPath(evento: Evento): string {
  return `/eventos/${getEventoSlugSegment(evento)}`;
}
