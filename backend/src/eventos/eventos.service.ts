import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evento } from '../entities/evento.entity';
import { Imagen } from '../entities/imagen.entity';
import { Ubicacion } from '../entities/ubicacion.entity';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { STOCK_ULTIMAS_ENTRADAS_MAX } from './precio.util';

export interface EventoFilters {
  busqueda?: string;
  categoriaId?: number;
  localidad?: string;
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

  private async guardarUbicacion(direccionCompleta: string, idUbicacion?: number): Promise<number> {
    const direccion = direccionCompleta.trim();
    if (idUbicacion) {
      await this.ubicacionRepo.update(idUbicacion, {
        direccion,
        localidad: 'Almería',
        provincia: 'Almería',
      });
      return idUbicacion;
    }
    const nueva = await this.ubicacionRepo.save({
      direccion,
      localidad: 'Almería',
      provincia: 'Almería',
    });
    return nueva.idUbicacion;
  }

  async findAll(filters?: EventoFilters) {
    const qb = this.baseQuery();

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

    qb.orderBy('evento.fechaInicio', 'ASC');
    return qb.getMany();
  }

  async findDestacados(limit?: number) {
    const qb = this.baseQuery()
      .where('evento.destacado = :destacado', { destacado: true })
      .orderBy('evento.fechaInicio', 'ASC');
    if (limit != null && limit > 0) {
      qb.take(limit);
    }
    return qb.getMany();
  }

  async findUltimasEntradas() {
    return this.baseQuery()
      .where('evento.stock > 0')
      .andWhere('evento.stock <= :maxStock', { maxStock: STOCK_ULTIMAS_ENTRADAS_MAX })
      .orderBy('evento.stock', 'ASC')
      .addOrderBy('evento.fechaInicio', 'ASC')
      .getMany();
  }

  async findOne(id: number) {
    const evento = await this.baseQuery().where('evento.id = :id', { id }).getOne();
    if (!evento) throw new NotFoundException('Evento no encontrado');
    return evento;
  }

  async create(dto: CreateEventoDto) {
    const { imagenUrl, direccionCompleta, ...rest } = dto;
    const idUbicacion = await this.guardarUbicacion(direccionCompleta);

    const evento = this.eventoRepo.create({
      ...rest,
      idUbicacion,
      destacado: dto.destacado ?? false,
    });
    const saved = await this.eventoRepo.save(evento);

    if (imagenUrl) {
      await this.imagenRepo.save({
        idEvento: saved.id,
        url: imagenUrl,
        esPrincipal: true,
      });
    }

    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateEventoDto) {
    const evento = await this.findOne(id);
    const { imagenUrl, direccionCompleta, ...rest } = dto;

    if (direccionCompleta !== undefined) {
      await this.guardarUbicacion(direccionCompleta, evento.idUbicacion);
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

    return this.findOne(id);
  }

  async toggleDestacado(id: number) {
    const evento = await this.eventoRepo.findOne({ where: { id } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    evento.destacado = !evento.destacado;
    await this.eventoRepo.save(evento);
    return this.findOne(id);
  }

  async remove(id: number) {
    const evento = await this.findOne(id);
    await this.eventoRepo.remove(evento);
    return { message: 'Evento eliminado' };
  }
}
