import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
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
  ) {}

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
    data: { direccion: string; localidad: string; provincia?: string },
    idUbicacion?: number,
  ): Promise<number> {
    const payload = {
      direccion: data.direccion.trim(),
      localidad: data.localidad.trim(),
      provincia: (data.provincia?.trim() || 'Almería').trim(),
    };
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
      imagenUrl,
      direccion,
      localidad,
      provincia,
      idCliente,
      fechaInicio,
      fechaFin,
      ...rest
    } = dto;
    await this.assertCliente(idCliente);
    const idUbicacion = await this.guardarUbicacion({ direccion, localidad, provincia });
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

    if (imagenUrl) {
      await this.imagenRepo.save({
        idEvento: saved.id,
        url: imagenUrl,
        esPrincipal: true,
      });
    }

    return this.findOneById(saved.id);
  }

  async update(id: number, dto: UpdateEventoDto) {
    const evento = await this.findOneById(id);
    const {
      imagenUrl,
      direccion,
      localidad,
      provincia,
      idCliente,
      fechaInicio,
      fechaFin,
      ...rest
    } = dto;

    if (idCliente !== undefined) {
      await this.assertCliente(idCliente);
    }

    if (direccion !== undefined || localidad !== undefined || provincia !== undefined) {
      await this.guardarUbicacion(
        {
          direccion: direccion ?? evento.ubicacion?.direccion ?? '',
          localidad: localidad ?? evento.ubicacion?.localidad ?? '',
          provincia: provincia ?? evento.ubicacion?.provincia,
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

    if (imagenUrl) {
      const principal = evento.imagenes?.find((i) => i.esPrincipal);
      if (principal) {
        principal.url = imagenUrl;
        await this.imagenRepo.save(principal);
      } else {
        await this.imagenRepo.save({
          idEvento: id,
          url: imagenUrl,
          esPrincipal: true,
        });
      }
    }

    return this.findOneById(id);
  }

  async toggleDestacado(id: number) {
    const evento = await this.eventoRepo.findOne({ where: { id } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    evento.destacado = !evento.destacado;
    await this.eventoRepo.save(evento);
    return this.findOneById(id);
  }

  async remove(id: number) {
    const evento = await this.findOneById(id);
    await this.eventoRepo.remove(evento);
    return { message: 'Evento eliminado' };
  }
}
