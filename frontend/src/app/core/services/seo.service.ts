import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Evento } from '../models';
import { clampMetaDescription, padMetaDescription } from '../utils/seo.util';
import { getPrecioUnitario } from '../utils/precio.util';
import {
  buildEventJsonLd,
  eventoCanonicalPath,
} from '../utils/schema-event.util';
import { environment } from '../../../environments/environment';

const SITE_NAME = 'FestivAll Almería';
/** Título home: 50–60 caracteres (recomendación SEO). */
const DEFAULT_TITLE =
  'FestivAll Almería | Eventos y entradas en Almería provincia';
const DEFAULT_DESCRIPTION = padMetaDescription(
  'Compra entradas online para festivales, conciertos y fiestas en Almería y provincia. Eventos destacados, últimas entradas con descuento y pago seguro.',
  ` Reserva en ${SITE_NAME}.`,
);
const JSON_LD_SCRIPT_ID = 'festivall-json-ld';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private meta = inject(Meta);
  private title = inject(Title);
  private document = inject(DOCUMENT);

  setHome(): void {
    this.apply(DEFAULT_TITLE, DEFAULT_DESCRIPTION, '/');
    this.clearJsonLd();
  }

  setEvento(evento: Evento): void {
    const pageTitle = `${evento.titulo} | ${SITE_NAME}`;
    const description = this.buildEventoDescription(evento);
    const path = eventoCanonicalPath(evento);
    const pageUrl = this.absoluteUrl(path);

    const origin = this.siteOrigin();
    this.apply(pageTitle, description, path);
    this.setJsonLd(buildEventJsonLd(evento, pageUrl, origin));
  }

  /** Listado de eventos: canónica sin query (?busqueda, ?page, etc.). */
  setEventosList(path?: string): void {
    const cleanPath = this.cleanPath(path ?? this.currentPath());
    this.setCanonical(cleanPath);
    this.clearJsonLd();
  }

  resetToDefaults(): void {
    this.setHome();
  }

  private apply(pageTitle: string, description: string, canonicalPath: string): void {
    this.title.setTitle(pageTitle);
    this.setCanonical(canonicalPath);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
  }

  private setCanonical(path: string): void {
    const href = this.absoluteUrl(path);
    let link = this.document.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
    this.meta.updateTag({ property: 'og:url', content: href });
  }

  /** Ruta sin query ni hash (URL limpia para canónica). */
  cleanPath(path: string): string {
    const base = path.split('?')[0].split('#')[0] || '/';
    return base.startsWith('/') ? base : `/${base}`;
  }

  private currentPath(): string {
    return this.document.location?.pathname || '/eventos';
  }

  private siteOrigin(): string {
    return (
      this.document.defaultView?.location?.origin ||
      environment.siteUrl ||
      'https://festivall.club'
    ).replace(/\/$/, '');
  }

  private absoluteUrl(path: string): string {
    return `${this.siteOrigin()}${this.cleanPath(path)}`;
  }

  private setJsonLd(data: Record<string, unknown>): void {
    let script = this.document.getElementById(
      JSON_LD_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.id = JSON_LD_SCRIPT_ID;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  private clearJsonLd(): void {
    this.document.getElementById(JSON_LD_SCRIPT_ID)?.remove();
  }

  private buildEventoDescription(evento: Evento): string {
    const ubicacion = evento.ubicacion
      ? `${evento.ubicacion.localidad}, ${evento.ubicacion.provincia}`
      : 'Almería';
    const categoria = evento.categoria?.nombreCategoria ?? 'evento';
    const precio = getPrecioUnitario(evento);
    const precioTxt =
      precio > 0
        ? `Entradas desde ${precio.toFixed(2).replace(/\.00$/, '')} €.`
        : 'Entrada gratuita disponible.';

    const base =
      evento.descripcion?.replace(/\s+/g, ' ').trim() ||
      `${evento.titulo}: ${categoria} en ${ubicacion}. ${precioTxt}`;

    const enriched = base.includes(precioTxt) ? base : `${base} ${precioTxt}`;
    const withCta = padMetaDescription(
      enriched,
      ` Compra en ${SITE_NAME}.`,
    );

    return clampMetaDescription(withCta);
  }
}
