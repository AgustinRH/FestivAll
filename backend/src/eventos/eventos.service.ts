import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evento } from '../entities/evento.entity';
import { Imagen } from '../entities/imagen.entity';
import { Ubicacion } from '../entities/ubicacion.entity';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { STOCK_ULTIMAS_ENTRADAS_MAX } from './precio.util';
import { hoyIso } from './evento-activo.util';

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
export class EventosService {
  constructor(
    @InjectRepository(Evento) private eventoRepo: Repository<Evento>,
    @InjectRepository(Imagen) private imagenRepo: Repository<Imagen>,
    @InjectRepository(Ubicacion) private ubicacionRepo: Repository<Ubicacion>,
  ) {}

  private baseQuery() {
    return this.eventoRepo
      .createQueryBuilder('evento')
      .leftJoinAndSelect('evento.categoria', 'categoria')
      .leftJoinAndSelect('evento.ubicacion', 'ubicacion')
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
    qb.andWhere('COALESCE(evento.fechaFin, evento.fechaInicio) >= :hoy', { hoy: hoyIso() });
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
      .leftJoin('evento.ubicacion', 'ubicacion');
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
    const { imagenUrl, direccion, localidad, provincia, ...rest } = dto;
    const idUbicacion = await this.guardarUbicacion({ direccion, localidad, provincia });

    const evento = this.eventoRepo.create({
      ...rest,
      idUbicacion,
      destacado: dto.destacado ?? false,
      soloMayoresEdad: dto.soloMayoresEdad ?? false,
    });
    const saved = await this.eventoRepo.save(evento);

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
    const { imagenUrl, direccion, localidad, provincia, ...rest } = dto;

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

    Object.assign(evento, rest);
    await this.eventoRepo.save(evento);

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
