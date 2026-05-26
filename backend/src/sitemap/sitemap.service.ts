import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evento } from '../entities/evento.entity';
import { hoyIso } from '../eventos/evento-activo.util';
import { buildEventoSlug, slugify } from '../common/seo-slug.util';

type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
};

@Injectable()
export class SitemapService {
  constructor(
    @InjectRepository(Evento) private eventoRepo: Repository<Evento>,
    private config: ConfigService,
  ) {}

  private getSiteOrigin(): string {
    const url = (this.config.get<string>('FRONTEND_URL') || 'https://festivall.club').replace(
      /\/$/,
      '',
    );
    return url;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private formatUrlEntry(url: SitemapUrl): string {
    const parts = [`    <loc>${this.escapeXml(url.loc)}</loc>`];
    if (url.lastmod) parts.push(`    <lastmod>${url.lastmod}</lastmod>`);
    if (url.changefreq) parts.push(`    <changefreq>${url.changefreq}</changefreq>`);
    if (url.priority) parts.push(`    <priority>${url.priority}</priority>`);
    return `  <url>\n${parts.join('\n')}\n  </url>`;
  }

  private activosCondition(hoy: string): string {
    return 'COALESCE(evento.fechaFin, evento.fechaInicio) >= :hoy';
  }

  /** ISO date (YYYY-MM-DD); nunca posterior a maxDate (p. ej. hoy). */
  private toLastmodIso(value: unknown, fallback: string, maxDate?: string): string {
    let iso = fallback;
    if (value != null) {
      if (value instanceof Date) {
        iso = value.toISOString().slice(0, 10);
      } else {
        const s = String(value);
        if (s.length >= 10) iso = s.slice(0, 10);
      }
    }
    if (maxDate && iso > maxDate) return maxDate;
    return iso;
  }

  async buildXml(): Promise<string> {
    const origin = this.getSiteOrigin();
    const hoy = hoyIso();
    const urls: SitemapUrl[] = [];

    const push = (url: SitemapUrl) => {
      if (!urls.some((u) => u.loc === url.loc)) {
        urls.push(url);
      }
    };

    // —— Páginas estáticas públicas ——
    push({ loc: `${origin}/`, lastmod: hoy, changefreq: 'daily', priority: '1.0' });
    push({ loc: `${origin}/eventos`, lastmod: hoy, changefreq: 'daily', priority: '0.9' });
    push({ loc: `${origin}/sobre-nosotros`, lastmod: hoy, changefreq: 'monthly', priority: '0.6' });
    push({ loc: `${origin}/contacto`, lastmod: hoy, changefreq: 'monthly', priority: '0.6' });
    push({
      loc: `${origin}/terminos-y-condiciones`,
      lastmod: hoy,
      changefreq: 'yearly',
      priority: '0.4',
    });
    push({ loc: `${origin}/privacidad`, lastmod: hoy, changefreq: 'yearly', priority: '0.4' });
    push({ loc: `${origin}/aviso-legal`, lastmod: hoy, changefreq: 'yearly', priority: '0.4' });

    // —— Localidades con al menos un evento activo ——
    const localidades = await this.eventoRepo
      .createQueryBuilder('evento')
      .innerJoin('evento.ubicacion', 'ubicacion')
      .select('ubicacion.localidad', 'localidad')
      .where(this.activosCondition(hoy), { hoy })
      .groupBy('ubicacion.localidad')
      .orderBy('ubicacion.localidad', 'ASC')
      .getRawMany<{ localidad: string }>();

    for (const row of localidades) {
      const slug = slugify(row.localidad);
      if (!slug) continue;
      push({
        loc: `${origin}/eventos/localidad/${slug}`,
        lastmod: hoy,
        changefreq: 'weekly',
        priority: '0.7',
      });
    }

    // —— Categorías con al menos un evento activo ——
    const categorias = await this.eventoRepo
      .createQueryBuilder('evento')
      .innerJoin('evento.categoria', 'categoria')
      .select('categoria.id', 'id')
      .addSelect('categoria.nombreCategoria', 'nombre')
      .where(this.activosCondition(hoy), { hoy })
      .groupBy('categoria.id')
      .addGroupBy('categoria.nombreCategoria')
      .orderBy('categoria.nombreCategoria', 'ASC')
      .getRawMany<{ id: number; nombre: string }>();

    for (const row of categorias) {
      const slug = slugify(row.nombre);
      if (!slug) continue;
      push({
        loc: `${origin}/eventos/categoria/${slug}`,
        lastmod: hoy,
        changefreq: 'weekly',
        priority: '0.7',
      });
    }

    // —— Landing de cada evento activo ——
    const eventos = await this.eventoRepo
      .createQueryBuilder('evento')
      .leftJoinAndSelect('evento.ubicacion', 'ubicacion')
      .where(this.activosCondition(hoy), { hoy })
      .orderBy('evento.id', 'ASC')
      .getMany();

    for (const e of eventos) {
      const slug =
        e.slug ?? buildEventoSlug(e.id, e.titulo, e.ubicacion?.localidad);
      push({
        loc: `${origin}/eventos/${slug}`,
        lastmod: this.toLastmodIso(e.updatedAt, hoy, hoy),
        changefreq: 'weekly',
        priority: '0.8',
      });
    }

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((u) => this.formatUrlEntry(u)),
      '</urlset>',
    ].join('\n');
  }
}
