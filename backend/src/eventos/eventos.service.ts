import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evento } from '../entities/evento.entity';
import { Imagen } from '../entities/imagen.entity';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';

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
  ) {}

  private baseQuery() {
    return this.eventoRepo
      .createQueryBuilder('evento')
      .leftJoinAndSelect('evento.categoria', 'categoria')
      .leftJoinAndSelect('evento.ubicacion', 'ubicacion')
      .leftJoinAndSelect('evento.imagenes', 'imagenes');
  }

  async findAll(filters?: EventoFilters) {
    const qb = this.baseQuery();

    if (filters?.busqueda) {
      qb.andWhere(
        '(evento.titulo LIKE :q OR evento.descripcion LIKE :q OR ubicacion.localidad LIKE :q)',
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

  async findPopular(limit = 4) {
    return this.baseQuery()
      .orderBy('evento.stock', 'DESC')
      .take(limit)
      .getMany();
  }

  async findOne(id: number) {
    const evento = await this.baseQuery().where('evento.id = :id', { id }).getOne();
    if (!evento) throw new NotFoundException('Evento no encontrado');
    return evento;
  }

  async create(dto: CreateEventoDto) {
    const { imagenUrl, ...data } = dto;
    const evento = this.eventoRepo.create(data);
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
    const { imagenUrl, ...data } = dto;
    Object.assign(evento, data);
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

  async remove(id: number) {
    const evento = await this.findOne(id);
    await this.eventoRepo.remove(evento);
    return { message: 'Evento eliminado' };
  }
}
