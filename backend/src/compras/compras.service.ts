import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async create(userId: number, dto: CreateCompraDto) {
    const evento = await this.eventoRepo.findOne({ where: { id: dto.idEvento } });
    if (!evento) throw new NotFoundException('Evento no encontrado');

    if (evento.stock < dto.cantidad) {
      throw new BadRequestException('No hay suficiente stock disponible');
    }

    const totalPago = Number(evento.precio) * dto.cantidad;
    const codigoAcceso = `FA-${randomBytes(6).toString('hex').toUpperCase()}`;

    const compra = this.compraRepo.create({
      idUsuario: userId,
      idEvento: dto.idEvento,
      cantidad: dto.cantidad,
      totalPago,
      codigoAcceso,
    });

    evento.stock -= dto.cantidad;
    await this.eventoRepo.save(evento);
    const saved = await this.compraRepo.save(compra);

    return this.findOne(saved.id, userId);
  }

  async findByUser(userId: number) {
    return this.compraRepo.find({
      where: { idUsuario: userId },
      relations: ['evento', 'evento.categoria', 'evento.ubicacion', 'evento.imagenes'],
      order: { fechaCompra: 'DESC' },
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
