import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from '../entities/cliente.entity';
import { Evento } from '../entities/evento.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente) private clienteRepo: Repository<Cliente>,
    @InjectRepository(Evento) private eventoRepo: Repository<Evento>,
  ) {}

  findAll() {
    return this.clienteRepo.find({ order: { nombre: 'ASC' } });
  }

  findActivos() {
    return this.clienteRepo.find({ where: { activo: true }, order: { nombre: 'ASC' } });
  }

  async findOne(id: number) {
    const c = await this.clienteRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Cliente no encontrado');
    return c;
  }

  async create(dto: CreateClienteDto) {
    const row = this.clienteRepo.create({
      nombre: dto.nombre.trim(),
      nombreFiscal: dto.nombreFiscal?.trim() || null,
      cif: dto.cif?.trim() || null,
      emailContacto: dto.emailContacto?.trim() || null,
      telefono: dto.telefono?.trim() || null,
      notas: dto.notas?.trim() || null,
      activo: dto.activo ?? true,
    });
    return this.clienteRepo.save(row);
  }

  async update(id: number, dto: UpdateClienteDto) {
    const c = await this.findOne(id);
    if (dto.nombre !== undefined) c.nombre = dto.nombre.trim();
    if (dto.nombreFiscal !== undefined) c.nombreFiscal = dto.nombreFiscal?.trim() || null;
    if (dto.cif !== undefined) c.cif = dto.cif?.trim() || null;
    if (dto.emailContacto !== undefined) c.emailContacto = dto.emailContacto?.trim() || null;
    if (dto.telefono !== undefined) c.telefono = dto.telefono?.trim() || null;
    if (dto.notas !== undefined) c.notas = dto.notas?.trim() || null;
    if (dto.activo !== undefined) c.activo = dto.activo;
    return this.clienteRepo.save(c);
  }

  async remove(id: number) {
    if (id === 1) {
      throw new BadRequestException('No se puede eliminar el cliente por defecto del sistema');
    }
    const count = await this.eventoRepo.count({ where: { idCliente: id } });
    if (count > 0) {
      throw new BadRequestException(
        `Hay ${count} evento(s) asociados a este cliente. Reasígnalos antes de eliminar.`,
      );
    }
    await this.clienteRepo.delete(id);
    return { message: 'Cliente eliminado' };
  }
}
