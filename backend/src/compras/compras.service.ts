import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Compra } from '../entities/compra.entity';
import { Evento } from '../entities/evento.entity';
import { CreateCompraDto } from './dto/create-compra.dto';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(Compra) private compraRepo: Repository<Compra>,
    @InjectRepository(Evento) private eventoRepo: Repository<Evento>,
  ) {}

  private generarCodigo(): string {
    return `FA-${randomBytes(6).toString('hex').toUpperCase()}`;
  }

  async create(userId: number, dto: CreateCompraDto) {
    const evento = await this.eventoRepo.findOne({ where: { id: dto.idEvento } });
    if (!evento) throw new NotFoundException('Evento no encontrado');

    if (evento.stock < dto.cantidad) {
      throw new BadRequestException('No hay suficiente stock disponible');
    }

    const precioUnitario = Number(evento.precio);
    const entradas = Array.from({ length: dto.cantidad }, () =>
      this.compraRepo.create({
        idUsuario: userId,
        idEvento: dto.idEvento,
        cantidad: 1,
        totalPago: precioUnitario,
        codigoAcceso: this.generarCodigo(),
      }),
    );

    evento.stock -= dto.cantidad;
    await this.eventoRepo.save(evento);
    const guardadas = await this.compraRepo.save(entradas);

    return this.compraRepo.find({
      where: { id: In(guardadas.map((c) => c.id)) },
      relations: ['evento', 'evento.categoria', 'evento.ubicacion', 'evento.imagenes'],
      order: { id: 'ASC' },
    });
  }

  async findByUser(userId: number) {
    return this.compraRepo.find({
      where: { idUsuario: userId },
      relations: ['evento', 'evento.categoria', 'evento.ubicacion', 'evento.imagenes'],
      order: { fechaCompra: 'DESC', id: 'DESC' },
    });
  }

  async findOne(id: number, userId: number) {
    const compra = await this.compraRepo.findOne({
      where: { id, idUsuario: userId },
      relations: ['evento', 'evento.categoria', 'evento.ubicacion', 'evento.imagenes'],
    });
    if (!compra) throw new NotFoundException('Compra no encontrada');
    return compra;
  }
}
