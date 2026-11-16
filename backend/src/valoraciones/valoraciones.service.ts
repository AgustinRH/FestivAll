import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EstadoModeracionValoracion,
  Valoracion,
} from '../entities/valoracion.entity';
import { ValoracionOmitida } from '../entities/valoracion-omitida.entity';
import { Compra } from '../entities/compra.entity';
import { Evento } from '../entities/evento.entity';
import { CreateValoracionDto } from './dto/create-valoracion.dto';
import { UpdateEstadoValoracionDto } from './dto/update-estado-valoracion.dto';
import { eventoHaPasado } from '../eventos/evento-pasado.util';
import { urlImagenPrincipal } from '../eventos/imagen-evento.util';

export type ValoracionPublica = {
  id: number;
  puntuacion: number;
  comentario: string | null;
  nombreUsuario: string;
  createdAt: Date;
  verificada: boolean;
};

export type ValoracionesEventoResponse = {
  resumen: {
    media: number;
    total: number;
  };
  valoraciones: ValoracionPublica[];
};

export type EventoConValoracionesItem = {
  id: number;
  titulo: string;
  slug: string | null;
  fechaInicio: string;
  fechaFin: string;
  localidad: string | null;
  categoria: string | null;
  imagenUrl: string | null;
  resumen: { media: number; total: number };
};

export type EventoOpinionesDetalle = {
  evento: {
    id: number;
    titulo: string;
    slug: string | null;
    descripcion: string;
    fechaInicio: string;
    fechaFin: string;
    horaInicio: string | null;
    horaFin: string | null;
    localidad: string | null;
    direccion: string | null;
    provincia: string | null;
    categoria: string | null;
    imagenUrl: string | null;
  };
  resumen: { media: number; total: number };
  valoraciones: ValoracionPublica[];
};

@Injectable()
export class ValoracionesService {
  constructor(
    @InjectRepository(Valoracion)
    private valoracionRepo: Repository<Valoracion>,
    @InjectRepository(ValoracionOmitida)
    private omitidaRepo: Repository<ValoracionOmitida>,
    @InjectRepository(Compra) private compraRepo: Repository<Compra>,
    @InjectRepository(Evento) private eventoRepo: Repository<Evento>,
  ) {}

  private async assertEventoExiste(idEvento: number): Promise<Evento> {
    const evento = await this.eventoRepo.findOne({ where: { id: idEvento } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    return evento;
  }

  private async assertEntradaAsistida(
    userId: number,
    idEvento: number,
  ): Promise<void> {
    const asistio = await this.compraRepo
      .createQueryBuilder('c')
      .where('c.id_usuario = :userId', { userId })
      .andWhere('c.id_evento = :idEvento', { idEvento })
      .andWhere('c.estado_entrada = :estado', { estado: 'asistida' })
      .getCount();

    if (!asistio) {
      throw new BadRequestException(
        'Solo puedes valorar eventos a los que hayas asistido (entrada validada en la puerta).',
      );
    }
  }

  async getElegibilidad(userId: number, idEvento: number) {
    const evento = await this.assertEventoExiste(idEvento);
    const yaValorado = await this.valoracionRepo.exist({
      where: { idUsuario: userId, idEvento },
    });
    const omitido = await this.omitidaRepo.exist({
      where: { idUsuario: userId, idEvento },
    });
    const tieneAsistencia = await this.compraRepo.exist({
      where: { idUsuario: userId, idEvento, estadoEntrada: 'asistida' },
    });
    const eventoFinalizado = eventoHaPasado(evento);

    return {
      puedeValorar:
        eventoFinalizado && tieneAsistencia && !yaValorado && !omitido,
      eventoFinalizado,
      tieneAsistencia,
      yaValorado,
      omitido,
    };
  }

  async findPendientesPerfil(userId: number) {
    const comprasAsistidas = await this.compraRepo.find({
      where: { idUsuario: userId, estadoEntrada: 'asistida' },
      relations: ['evento', 'evento.ubicacion'],
    });

    const porEvento = new Map<number, Evento>();
    for (const c of comprasAsistidas) {
      if (c.evento && eventoHaPasado(c.evento)) {
        porEvento.set(c.idEvento, c.evento);
      }
    }

    if (porEvento.size === 0) return [];

    const idsEvento = [...porEvento.keys()];
    const valorados = await this.valoracionRepo.find({
      where: idsEvento.map((idEvento) => ({ idUsuario: userId, idEvento })),
      select: ['idEvento'],
    });
    const omitidos = await this.omitidaRepo.find({
      where: idsEvento.map((idEvento) => ({ idUsuario: userId, idEvento })),
      select: ['idEvento'],
    });

    const excluir = new Set([
      ...valorados.map((v) => v.idEvento),
      ...omitidos.map((o) => o.idEvento),
    ]);

    return [...porEvento.entries()]
      .filter(([id]) => !excluir.has(id))
      .map(([, evento]) => ({
        id: evento.id,
        titulo: evento.titulo,
        slug: evento.slug ?? null,
        fechaInicio: evento.fechaInicio,
        fechaFin: evento.fechaFin,
        localidad: evento.ubicacion?.localidad ?? null,
      }))
      .sort((a, b) =>
        String(b.fechaInicio).localeCompare(String(a.fechaInicio)),
      );
  }

  async findMisValoraciones(userId: number) {
    const list = await this.valoracionRepo.find({
      where: { idUsuario: userId },
      relations: ['evento', 'evento.ubicacion'],
      order: { createdAt: 'DESC' },
    });

    return list.map((v) => ({
      id: v.id,
      puntuacion: v.puntuacion,
      comentario: v.comentario,
      estadoModeracion: v.estadoModeracion,
      verificada: v.verificada,
      createdAt: v.createdAt,
      evento: v.evento
        ? {
            id: v.evento.id,
            titulo: v.evento.titulo,
            slug: v.evento.slug ?? null,
            fechaInicio: v.evento.fechaInicio,
            fechaFin: v.evento.fechaFin,
            localidad: v.evento.ubicacion?.localidad ?? null,
          }
        : null,
    }));
  }

  async omitir(userId: number, idEvento: number) {
    const evento = await this.assertEventoExiste(idEvento);

    if (!eventoHaPasado(evento)) {
      throw new BadRequestException(
        'Solo puedes omitir la valoración de eventos ya finalizados.',
      );
    }

    await this.assertEntradaAsistida(userId, idEvento);

    const yaValorado = await this.valoracionRepo.exist({
      where: { idUsuario: userId, idEvento },
    });
    if (yaValorado) {
      throw new BadRequestException('Ya has valorado este evento.');
    }

    const existente = await this.omitidaRepo.findOne({
      where: { idUsuario: userId, idEvento },
    });
    if (existente) {
      return {
        message: 'Ya habías indicado que no quieres valorar este evento.',
      };
    }

    await this.omitidaRepo.save(
      this.omitidaRepo.create({ idUsuario: userId, idEvento }),
    );

    return {
      message: 'De acuerdo. No te volveremos a pedir valorar este evento.',
    };
  }

  async create(userId: number, dto: CreateValoracionDto) {
    const evento = await this.assertEventoExiste(dto.idEvento);

    if (!eventoHaPasado(evento)) {
      throw new BadRequestException(
        'Solo puedes valorar un evento después de que haya finalizado.',
      );
    }

    await this.assertEntradaAsistida(userId, dto.idEvento);

    const omitido = await this.omitidaRepo.exist({
      where: { idUsuario: userId, idEvento: dto.idEvento },
    });
    if (omitido) {
      throw new BadRequestException(
        'Indicaste que no querías valorar este evento.',
      );
    }

    const existente = await this.valoracionRepo.findOne({
      where: { idUsuario: userId, idEvento: dto.idEvento },
    });
    if (existente) {
      throw new ConflictException('Ya has valorado este evento.');
    }

    const valoracion = this.valoracionRepo.create({
      idUsuario: userId,
      idEvento: dto.idEvento,
      puntuacion: dto.puntuacion,
      comentario: dto.comentario?.trim() || null,
      verificada: true,
      estadoModeracion: EstadoModeracionValoracion.PENDIENTE,
    });

    const guardada = await this.valoracionRepo.save(valoracion);
    return {
      message:
        'Tu opinión se ha enviado correctamente y está pendiente de moderación.',
      valoracion: guardada,
    };
  }

  private imagenPrincipal(evento: Evento): string | null {
    return urlImagenPrincipal(evento.imagenes);
  }

  private resumenFromPuntuaciones(puntuaciones: number[]) {
    const total = puntuaciones.length;
    const media =
      total === 0
        ? 0
        : Math.round((puntuaciones.reduce((s, n) => s + n, 0) / total) * 10) /
          10;
    return { media, total };
  }

  async findEventosConValoraciones(): Promise<EventoConValoracionesItem[]> {
    const aprobadas = await this.valoracionRepo.find({
      where: { estadoModeracion: EstadoModeracionValoracion.APROBADO },
      relations: [
        'evento',
        'evento.ubicacion',
        'evento.categoria',
        'evento.imagenes',
      ],
      order: { createdAt: 'DESC' },
    });

    const porEvento = new Map<
      number,
      { evento: Evento; puntuaciones: number[]; ultimaOpinion: Date }
    >();

    for (const v of aprobadas) {
      if (!v.evento) continue;
      const existente = porEvento.get(v.idEvento);
      if (existente) {
        existente.puntuaciones.push(v.puntuacion);
        if (v.createdAt > existente.ultimaOpinion) {
          existente.ultimaOpinion = v.createdAt;
        }
      } else {
        porEvento.set(v.idEvento, {
          evento: v.evento,
          puntuaciones: [v.puntuacion],
          ultimaOpinion: v.createdAt,
        });
      }
    }

    return [...porEvento.values()]
      .map(({ evento, puntuaciones, ultimaOpinion }) => ({
        item: {
          id: evento.id,
          titulo: evento.titulo,
          slug: evento.slug ?? null,
          fechaInicio: evento.fechaInicio,
          fechaFin: evento.fechaFin,
          localidad: evento.ubicacion?.localidad ?? null,
          categoria: evento.categoria?.nombreCategoria ?? null,
          imagenUrl: this.imagenPrincipal(evento),
          resumen: this.resumenFromPuntuaciones(puntuaciones),
        },
        ultimaOpinion,
      }))
      .sort((a, b) => b.ultimaOpinion.getTime() - a.ultimaOpinion.getTime())
      .map(({ item }) => item);
  }

  async findOpinionesEventoPublic(
    idEvento: number,
  ): Promise<EventoOpinionesDetalle> {
    const evento = await this.eventoRepo.findOne({
      where: { id: idEvento },
      relations: ['ubicacion', 'categoria', 'imagenes'],
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');

    const { resumen, valoraciones } = await this.findPublicByEvento(idEvento);
    if (resumen.total === 0) {
      throw new NotFoundException(
        'Este evento aún no tiene opiniones publicadas.',
      );
    }

    return {
      evento: {
        id: evento.id,
        titulo: evento.titulo,
        slug: evento.slug ?? null,
        descripcion: evento.descripcion ?? '',
        fechaInicio: evento.fechaInicio,
        fechaFin: evento.fechaFin,
        horaInicio: evento.horaInicio ?? null,
        horaFin: evento.horaFin ?? null,
        localidad: evento.ubicacion?.localidad ?? null,
        direccion: evento.ubicacion?.direccion ?? null,
        provincia: evento.ubicacion?.provincia ?? null,
        categoria: evento.categoria?.nombreCategoria ?? null,
        imagenUrl: this.imagenPrincipal(evento),
      },
      resumen,
      valoraciones,
    };
  }

  async findPublicByEvento(
    idEvento: number,
  ): Promise<ValoracionesEventoResponse> {
    await this.assertEventoExiste(idEvento);

    const aprobadas = await this.valoracionRepo.find({
      where: {
        idEvento,
        estadoModeracion: EstadoModeracionValoracion.APROBADO,
      },
      relations: ['usuario'],
      order: { createdAt: 'DESC' },
    });

    const total = aprobadas.length;
    const media =
      total === 0
        ? 0
        : Math.round(
            (aprobadas.reduce((s, v) => s + v.puntuacion, 0) / total) * 10,
          ) / 10;

    return {
      resumen: { media, total },
      valoraciones: aprobadas.map((v) => ({
        id: v.id,
        puntuacion: v.puntuacion,
        comentario: v.comentario,
        nombreUsuario: `${v.usuario.nombre} ${v.usuario.apellidos.charAt(0)}.`,
        createdAt: v.createdAt,
        verificada: v.verificada,
      })),
    };
  }

  async findPendientesAdmin() {
    const list = await this.valoracionRepo.find({
      where: { estadoModeracion: EstadoModeracionValoracion.PENDIENTE },
      relations: ['usuario', 'evento', 'evento.ubicacion'],
      order: { createdAt: 'ASC' },
    });

    return list.map((v) => ({
      id: v.id,
      puntuacion: v.puntuacion,
      comentario: v.comentario,
      verificada: v.verificada,
      estadoModeracion: v.estadoModeracion,
      createdAt: v.createdAt,
      usuario: v.usuario
        ? {
            id: v.usuario.id,
            nombre: v.usuario.nombre,
            apellidos: v.usuario.apellidos,
            email: v.usuario.email,
          }
        : null,
      evento: v.evento
        ? {
            id: v.evento.id,
            titulo: v.evento.titulo,
            fechaInicio: v.evento.fechaInicio,
            localidad: v.evento.ubicacion?.localidad ?? null,
          }
        : null,
    }));
  }

  async updateEstadoAdmin(id: number, dto: UpdateEstadoValoracionDto) {
    const valoracion = await this.valoracionRepo.findOne({ where: { id } });
    if (!valoracion) throw new NotFoundException('Valoración no encontrada');

    if (valoracion.estadoModeracion !== EstadoModeracionValoracion.PENDIENTE) {
      throw new BadRequestException(
        'Solo se puede moderar una valoración pendiente.',
      );
    }

    valoracion.estadoModeracion = dto.estado;
    await this.valoracionRepo.save(valoracion);

    return {
      message:
        dto.estado === EstadoModeracionValoracion.APROBADO
          ? 'Valoración aprobada y visible en el evento.'
          : 'Valoración rechazada.',
      valoracion,
    };
  }
}
