import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { BCRYPT_ROUNDS } from '../auth/password.constants';
import { RolUsuario, Usuario } from '../entities/usuario.entity';
import { CreateUsuarioAdminDto } from './dto/create-usuario-admin.dto';
import { UpdateUsuarioAdminDto } from './dto/update-usuario-admin.dto';

@Injectable()
export class UsuariosService {
  constructor(@InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>) {}

  findAll() {
    return this.usuarioRepo.find({
      order: { fechaRegistro: 'DESC' },
      select: ['id', 'nombre', 'apellidos', 'email', 'rol', 'emailVerificado', 'fechaRegistro'],
    });
  }

  async findOne(id: number) {
    const user = await this.usuarioRepo.findOne({
      where: { id },
      select: ['id', 'nombre', 'apellidos', 'email', 'rol', 'emailVerificado', 'fechaRegistro'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(dto: CreateUsuarioAdminDto) {
    const exists = await this.usuarioRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El email ya está registrado');

    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.usuarioRepo.create({
      nombre: dto.nombre.trim(),
      apellidos: dto.apellidos.trim(),
      email: dto.email.trim().toLowerCase(),
      password: hash,
      rol: dto.rol,
      emailVerificado: dto.emailVerificado ?? dto.rol === RolUsuario.ADMIN,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });
    await this.usuarioRepo.save(user);
    return this.findOne(user.id);
  }

  async update(id: number, dto: UpdateUsuarioAdminDto, currentUserId: number) {
    const user = await this.usuarioRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.email && dto.email !== user.email) {
      const exists = await this.usuarioRepo.findOne({ where: { email: dto.email } });
      if (exists) throw new ConflictException('El email ya está en uso');
      user.email = dto.email.trim().toLowerCase();
    }

    if (dto.nombre !== undefined) user.nombre = dto.nombre.trim();
    if (dto.apellidos !== undefined) user.apellidos = dto.apellidos.trim();
    if (dto.rol !== undefined) {
      if (user.rol === RolUsuario.ADMIN && dto.rol === RolUsuario.CLIENTE && user.id === currentUserId) {
        throw new BadRequestException('No puedes quitarte el rol de administrador a ti mismo');
      }
      if (user.rol === RolUsuario.ADMIN && dto.rol === RolUsuario.CLIENTE) {
        await this.ensureAnotherAdmin(id);
      }
      user.rol = dto.rol;
    }
    if (dto.emailVerificado !== undefined) user.emailVerificado = dto.emailVerificado;
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    await this.usuarioRepo.save(user);
    return this.findOne(id);
  }

  async remove(id: number, currentUserId: number) {
    if (id === currentUserId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta de administrador');
    }
    const user = await this.usuarioRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.rol === RolUsuario.ADMIN) {
      await this.ensureAnotherAdmin(id);
    }
    await this.usuarioRepo.delete(id);
    return { message: 'Usuario eliminado correctamente' };
  }

  private async ensureAnotherAdmin(excludeId: number) {
    const count = await this.usuarioRepo.count({
      where: { rol: RolUsuario.ADMIN },
    });
    const target = await this.usuarioRepo.findOne({ where: { id: excludeId } });
    if (target?.rol === RolUsuario.ADMIN && count <= 1) {
      throw new ForbiddenException('Debe quedar al menos un administrador en el sistema');
    }
  }
}
