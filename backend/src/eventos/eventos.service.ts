import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AddressSuggestion, GeocodingService } from '../common/geocoding.service';
import { buildEventoSlug } from '../common/seo-slug.util';
import { Evento } from '../entities/evento.entity';
import { Imagen } from '../entities/imagen.entity';
import { Ubicacion } from '../entities/ubicacion.entity';
import { Cliente } from '../entities/cliente.entity';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { STOCK_ULTIMAS_ENTRADAS_MAX } from './precio.util';
import { hoyIso } from './evento-activo.util';
import { validarFechasEvento } from './evento-fechas.util';
import { getPrecioUnitario } from './precio.util';
import { EventImageService } from '../uploads/event-image.service';
import {
  EventImageTipo,
  MAX_GALERIA_IMAGES,
} from '../uploads/event-image.types';
import {
  findImagenPorTipo,
  listGaleria,
  urlImagenPrincipal,
} from './imagen-evento.util';

export type EventoMapaItem = {
  id: number;
  titulo: string;
  slug: string | null;
  latitud: number;
  longitud: number;
  imagenCartel: string | null;
  precioDesde: number;
  localidad: string;
};

export interface EventoFilters {
  busqueda?: string;
  categoriaId?: number;
  localidad?: string;
  ultimasEntradas?: boolean;
  precioMin?: number;
  precioMax?: number;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
  soloActivos?: boolean;
}

export interface EventosPaginatedResult {
  items: Evento[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class EventosService implements OnModuleInit {
  private readonly logger = new Logger(EventosService.name);

  constructor(
    @InjectRepository(Evento) private eventoRepo: Repository<Evento>,
    @InjectRepository(Imagen) private imagenRepo: Repository<Imagen>,
    @InjectRepository(Ubicacion) private ubicacionRepo: Repository<Ubicacion>,
    @InjectRepository(Cliente) private clienteRepo: Repository<Cliente>,
    private geocoding: GeocodingService,
    private eventImages: EventImageService,
  ) {}

  buscarUbicaciones(q: string): Promise<AddressSuggestion[]> {
    return this.geocoding.searchAddresses(q);
  }

  async geocodificarDireccion(data: {
    direccion: string;
    localidad: string;
    provincia?: string;
  }) {
    const result = await this.geocoding.geocodeAddress(data);
    if (!result) {
      throw new BadRequestException(
        'No se encontraron coordenadas para esa dirección. Prueba a ser más específico o introdúcelas a mano.',
      );
    }
    return result;
  }

  private async assertCliente(idCliente: number) {
    const c = await this.clienteRepo.findOne({ where: { id: idCliente } });
    if (!c) throw new BadRequestException('Organizador (cliente) no encontrado');
  }

  async onModuleInit() {
    await this.backfillSlugs();
  }

  private async backfillSlugs() {
    const pendientes = await this.eventoRepo.find({
      where: { slug: IsNull() },
      relations: ['ubicacion'],
    });
    if (!pendientes.length) return;

    for (const evento of pendientes) {
      evento.slug = buildEventoSlug(evento.id, evento.titulo, evento.ubicacion?.localidad);
      await this.eventoRepo.save(evento);
    }
    this.logger.log(`Slugs SEO: ${pendientes.length} evento(s) actualizados`);
  }

  private async asignarSlug(evento: Evento, localidad?: string | null) {
    const loc = localidad ?? evento.ubicacion?.localidad;
    evento.slug = buildEventoSlug(evento.id, evento.titulo, loc);
    await this.eventoRepo.save(evento);
  }

  private baseQuery() {
    return this.eventoRepo
      .createQueryBuilder('evento')
      .leftJoinAndSelect('evento.categoria', 'categoria')
      .leftJoinAndSelect('evento.ubicacion', 'ubicacion')
      .leftJoinAndSelect('evento.cliente', 'cliente')
      .leftJoinAndSelect('evento.imagenes', 'imagenes');
  }

  private async guardarUbicacion(
    data: {
      direccion: string;
      localidad: string;
      provincia?: string;
      latitud?: number | null;
      longitud?: number | null;
    },
    idUbicacion?: number,
  ): Promise<number> {
    const payload: Partial<Ubicacion> = {
      direccion: data.direccion.trim(),
      localidad: data.localidad.trim(),
      provincia: (data.provincia?.trim() || 'Almería').trim(),
    };

    let lat = data.latitud ?? null;
    let lng = data.longitud ?? null;
    if (lat == null || lng == null) {
      const geo = await this.geocoding.geocodeAddress({
        direccion: payload.direccion!,
        localidad: payload.localidad!,
        provincia: payload.provincia,
      });
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        this.logger.log(
          `Coordenadas obtenidas para «${payload.direccion}, ${payload.localidad}»: ${lat}, ${lng}`,
        );
      }
    }
    if (lat != null && lng != null) {
      payload.latitud = lat;
      payload.longitud = lng;
    }
    if (idUbicacion) {
      await this.ubicacionRepo.update(idUbicacion, payload);
      return idUbicacion;
    }
    const nueva = await this.ubicacionRepo.save(payload);
    return nueva.idUbicacion;
  }

  private applySoloActivos(qb: ReturnType<typeof this.baseQuery>) {
    qb.andWhere('evento.fechaFin >= :hoy', { hoy: hoyIso() });
  }

  private applyFilters(qb: ReturnType<typeof this.baseQuery>, filters?: EventoFilters) {
    if (filters?.soloActivos) {
      this.applySoloActivos(qb);
    }
    if (filters?.busqueda) {
      qb.andWhere(
        '(evento.titulo LIKE :q OR evento.descripcion LIKE :q OR ubicacion.direccion LIKE :q OR ubicacion.localidad LIKE :q)',
        { q: `%${filters.busqueda}%` },
      );
    }
    if (filters?.categoriaId) {
      qb.andWhere('evento.idCategoria = :categoriaId', { categoriaId: filters.categoriaId });
    }
    if (filters?.localidad) {
      qb.andWhere('ubicacion.localidad LIKE :localidad', {
        localidad: `%${filters.localidad}%`,
      });
    }
    if (filters?.ultimasEntradas) {
      qb.andWhere('evento.stock > 0').andWhere('evento.stock <= :maxStock', {
        maxStock: STOCK_ULTIMAS_ENTRADAS_MAX,
      });
    }
    if (filters?.precioMin != null && !Number.isNaN(filters.precioMin)) {
      qb.andWhere('evento.precio >= :precioMin', { precioMin: filters.precioMin });
    }
    if (filters?.precioMax != null && !Number.isNaN(filters.precioMax)) {
      qb.andWhere('evento.precio <= :precioMax', { precioMax: filters.precioMax });
    }
    if (filters?.desde) {
      qb.andWhere('evento.fechaInicio >= :desde', { desde: filters.desde });
    }
    if (filters?.hasta) {
      qb.andWhere('evento.fechaInicio <= :hasta', { hasta: filters.hasta });
    }

    if (filters?.ultimasEntradas) {
      qb.orderBy('evento.stock', 'ASC').addOrderBy('evento.fechaInicio', 'ASC');
    } else {
      qb.orderBy('evento.fechaInicio', 'ASC');
    }
  }

  private countQuery(filters?: EventoFilters) {
    const qb = this.eventoRepo
      .createQueryBuilder('evento')
      .leftJoin('evento.ubicacion', 'ubicacion')
      .leftJoin('evento.cliente', 'cliente');
    this.applyFilters(qb, filters);
    return qb;
  }

  async findAll(filters?: EventoFilters): Promise<Evento[] | EventosPaginatedResult> {
    const page = filters?.page;
    const limit = filters?.limit ?? 20;

    if (page != null && page >= 1) {
      const total = await this.countQuery(filters).getCount();
      const qb = this.baseQuery();
      this.applyFilters(qb, filters);
      const items = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();
      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    const qb = this.baseQuery();
    this.applyFilters(qb, filters);
    return qb.getMany();
  }

  async findDestacados(limit?: number) {
    const qb = this.baseQuery()
      .where('evento.destacado = :destacado', { destacado: true });
    this.applySoloActivos(qb);
    qb.orderBy('evento.fechaInicio', 'ASC');
    if (limit != null && limit > 0) {
      qb.take(limit);
    }
    return qb.getMany();
  }

  async findUltimasEntradas() {
    const qb = this.baseQuery()
      .where('evento.stock > 0')
      .andWhere('evento.stock <= :maxStock', { maxStock: STOCK_ULTIMAS_ENTRADAS_MAX });
    this.applySoloActivos(qb);
    return qb.orderBy('evento.stock', 'ASC').addOrderBy('evento.fechaInicio', 'ASC').getMany();
  }

  async findOneById(id: number) {
    const evento = await this.baseQuery().where('evento.id = :id', { id }).getOne();
    if (!evento) throw new NotFoundException('Evento no encontrado');
    return evento;
  }

  /** Eventos activos con coordenadas para el mapa (respuesta ligera). */
  async findForMapa(filters?: {
    lat?: number;
    lng?: number;
    radio?: number;
  }): Promise<EventoMapaItem[]> {
    const hoy = hoyIso();
    const qb = this.eventoRepo
      .createQueryBuilder('evento')
      .innerJoinAndSelect('evento.ubicacion', 'ubicacion')
      .leftJoinAndSelect('evento.imagenes', 'imagenes')
      .where('evento.fechaFin >= :hoy', { hoy })
      .andWhere('ubicacion.latitud IS NOT NULL')
      .andWhere('ubicacion.longitud IS NOT NULL');

    const lat = filters?.lat;
    const lng = filters?.lng;
    const radio = filters?.radio;
    if (
      lat != null &&
      lng != null &&
      radio != null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      radio > 0
    ) {
      qb.andWhere(
        `(6371 * acos(LEAST(1, GREATEST(-1,
          cos(radians(:lat)) * cos(radians(ubicacion.latitud))
          * cos(radians(ubicacion.longitud) - radians(:lng))
          + sin(radians(:lat)) * sin(radians(ubicacion.latitud))
        )))) <= :radio`,
        { lat, lng, radio },
      );
    }

    const eventos = await qb.orderBy('evento.fechaInicio', 'ASC').getMany();

    return eventos.map((e) => {
      const img = urlImagenPrincipal(e.imagenes);
      return {
        id: e.id,
        titulo: e.titulo,
        slug: e.slug ?? null,
        latitud: Number(e.ubicacion.latitud),
        longitud: Number(e.ubicacion.longitud),
        imagenCartel: img,
        precioDesde: getPrecioUnitario(e),
        localidad: e.ubicacion.localidad,
      };
    });
  }

  /** Detalle público: oculta eventos ya finalizados. */
  async findOnePublic(id: number) {
    const qb = this.baseQuery().where('evento.id = :id', { id });
    this.applySoloActivos(qb);
    const evento = await qb.getOne();
    if (!evento) throw new NotFoundException('Evento no encontrado');
    return evento;
  }

  async create(dto: CreateEventoDto) {
    const {
      direccion,
      localidad,
      provincia,
      latitud,
      longitud,
      idCliente,
      fechaInicio,
      fechaFin,
      ...rest
    } = dto;
    await this.assertCliente(idCliente);
    const idUbicacion = await this.guardarUbicacion({
      direccion,
      localidad,
      provincia,
      latitud,
      longitud,
    });
    const fechas = validarFechasEvento(fechaInicio, fechaFin);

    const evento = this.eventoRepo.create({
      ...rest,
      ...fechas,
      idUbicacion,
      idCliente,
      destacado: dto.destacado ?? false,
      soloMayoresEdad: dto.soloMayoresEdad ?? false,
    });
    const saved = await this.eventoRepo.save(evento);
    await this.asignarSlug(saved, localidad);

    return this.findOneById(saved.id);
  }

  async update(id: number, dto: UpdateEventoDto) {
    const evento = await this.findOneById(id);
    const {
      direccion,
      localidad,
      provincia,
      latitud,
      longitud,
      idCliente,
      fechaInicio,
      fechaFin,
      ...rest
    } = dto;

    if (idCliente !== undefined) {
      await this.assertCliente(idCliente);
    }

    if (
      direccion !== undefined ||
      localidad !== undefined ||
      provincia !== undefined ||
      latitud !== undefined ||
      longitud !== undefined
    ) {
      await this.guardarUbicacion(
        {
          direccion: direccion ?? evento.ubicacion?.direccion ?? '',
          localidad: localidad ?? evento.ubicacion?.localidad ?? '',
          provincia: provincia ?? evento.ubicacion?.provincia,
          latitud: latitud ?? evento.ubicacion?.latitud ?? null,
          longitud: longitud ?? evento.ubicacion?.longitud ?? null,
        },
        evento.idUbicacion,
      );
    }

    const fechas = validarFechasEvento(
      fechaInicio ?? evento.fechaInicio,
      fechaFin ?? evento.fechaFin,
    );

    Object.assign(evento, rest, fechas);
    await this.eventoRepo.save(evento);

    const actualizado = await this.findOneById(id);
    const loc =
      localidad ??
      actualizado.ubicacion?.localidad ??
      evento.ubicacion?.localidad;
    await this.asignarSlug(actualizado, loc);

    return this.findOneById(id);
  }

  async toggleDestacado(id: number) {
    const evento = await this.eventoRepo.findOne({ where: { id } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    evento.destacado = !evento.destacado;
    await this.eventoRepo.save(evento);
    return this.findOneById(id);
  }

  async uploadImagen(
    id: number,
    tipo: EventImageTipo,
    file: Express.Multer.File,
    slot?: number,
  ) {
    this.eventImages.assertTipo(tipo);
    const evento = await this.findOneById(id);
    const galeria = listGaleria(evento.imagenes);
    let orden: number | null = null;

    if (tipo === 'galeria') {
      const slotProvided = slot !== undefined && !Number.isNaN(slot);
      if (slotProvided) {
        this.eventImages.assertGaleriaSlot(slot!);
        orden = slot!;
      } else {
        orden = this.nextFreeGaleriaSlot(galeria);
      }
      const replacing = galeria.some((i) => i.orden === orden);
      if (!replacing && galeria.length >= MAX_GALERIA_IMAGES) {
        throw new BadRequestException(
          `La galería admite como máximo ${MAX_GALERIA_IMAGES} imágenes`,
        );
      }
    }

    const prev =
      tipo === 'galeria'
        ? galeria.find((i) => i.orden === orden)
        : findImagenPorTipo(evento.imagenes, tipo);
    if (prev?.url) {
      this.eventImages.deleteByUrl(prev.url);
    }

    const url = await this.eventImages.save(id, tipo, file, orden ?? undefined);
    await this.upsertImagenRegistro(id, tipo, url, orden);

    return { url, tipo, orden };
  }

  async deleteImagen(idEvento: number, imagenId: number) {
    const img = await this.imagenRepo.findOne({
      where: { id: imagenId, idEvento },
    });
    if (!img) {
      throw new NotFoundException('Imagen no encontrada');
    }
    this.eventImages.deleteByUrl(img.url);
    await this.imagenRepo.remove(img);
    return { message: 'Imagen eliminada' };
  }

  async remove(id: number) {
    const evento = await this.findOneById(id);
    this.eventImages.deleteEventoFolder(evento.id);
    await this.eventoRepo.remove(evento);
    return { message: 'Evento eliminado' };
  }

  private nextFreeGaleriaSlot(galeria: Imagen[]): number {
    const used = new Set(galeria.map((i) => i.orden ?? 0));
    for (let s = 0; s < MAX_GALERIA_IMAGES; s++) {
      if (!used.has(s)) return s;
    }
    throw new BadRequestException(
      `La galería admite como máximo ${MAX_GALERIA_IMAGES} imágenes`,
    );
  }

  private async upsertImagenRegistro(
    idEvento: number,
    tipo: EventImageTipo,
    url: string,
    orden: number | null,
  ) {
    let existing: Imagen | null;
    if (tipo === 'galeria') {
      existing = await this.imagenRepo.findOne({
        where: { idEvento, tipo: 'galeria', orden: orden ?? 0 },
      });
    } else {
      existing = await this.imagenRepo.findOne({ where: { idEvento, tipo } });
    }

    if (existing) {
      existing.url = url;
      existing.esPrincipal = tipo === 'principal';
      existing.orden = tipo === 'galeria' ? orden : null;
      return this.imagenRepo.save(existing);
    }

    return this.imagenRepo.save({
      idEvento,
      url,
      tipo,
      orden: tipo === 'galeria' ? orden : null,
      esPrincipal: tipo === 'principal',
    });
  }
}
