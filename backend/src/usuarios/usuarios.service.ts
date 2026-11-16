import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { esPropietario, tieneAccesoAdmin } from '../auth/roles.util';
import { BCRYPT_ROUNDS } from '../auth/password.constants';
import { RolUsuario, Usuario } from '../entities/usuario.entity';
import { CreateUsuarioAdminDto } from './dto/create-usuario-admin.dto';
import { UpdateUsuarioAdminDto } from './dto/update-usuario-admin.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
  ) {}

  findAll() {
    return this.usuarioRepo.find({
      order: { fechaRegistro: 'DESC' },
      select: [
        'id',
        'nombre',
        'apellidos',
        'email',
        'rol',
        'emailVerificado',
        'fechaRegistro',
      ],
    });
  }

  async findOne(id: number) {
    const user = await this.usuarioRepo.findOne({
      where: { id },
      select: [
        'id',
        'nombre',
        'apellidos',
        'email',
        'rol',
        'emailVerificado',
        'fechaRegistro',
      ],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(dto: CreateUsuarioAdminDto) {
    this.assertNoAssignOwner(dto.rol);

    const exists = await this.usuarioRepo.findOne({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('El email ya está registrado');

    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.usuarioRepo.create({
      nombre: dto.nombre.trim(),
      apellidos: dto.apellidos.trim(),
      email: dto.email.trim().toLowerCase(),
      password: hash,
      rol: dto.rol,
      emailVerificado: dto.emailVerificado ?? tieneAccesoAdmin(dto.rol),
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });
    await this.usuarioRepo.save(user);
    return this.findOne(user.id);
  }

  async update(id: number, dto: UpdateUsuarioAdminDto, currentUserId: number) {
    const actor = await this.usuarioRepo.findOne({
      where: { id: currentUserId },
    });
    if (!actor) throw new ForbiddenException('Sesión no válida');

    const user = await this.usuarioRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.rol !== undefined) {
      this.assertNoAssignOwner(dto.rol);
    }
    this.assertCanModifyProtectedUser(user, actor, dto);

    if (dto.email && dto.email !== user.email) {
      const exists = await this.usuarioRepo.findOne({
        where: { email: dto.email },
      });
      if (exists) throw new ConflictException('El email ya está en uso');
      user.email = dto.email.trim().toLowerCase();
    }

    if (dto.nombre !== undefined) user.nombre = dto.nombre.trim();
    if (dto.apellidos !== undefined) user.apellidos = dto.apellidos.trim();
    if (dto.rol !== undefined) {
      if (
        user.rol === RolUsuario.ADMIN &&
        dto.rol === RolUsuario.CLIENTE &&
        user.id === currentUserId
      ) {
        throw new BadRequestException(
          'No puedes quitarte el rol de administrador a ti mismo',
        );
      }
      if (user.rol === RolUsuario.ADMIN && dto.rol === RolUsuario.CLIENTE) {
        await this.ensureAnotherPrivilegiado(id);
      }
      user.rol = dto.rol;
    }
    if (dto.emailVerificado !== undefined)
      user.emailVerificado = dto.emailVerificado;
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    await this.usuarioRepo.save(user);
    return this.findOne(id);
  }

  async remove(id: number, currentUserId: number) {
    if (id === currentUserId) {
      throw new BadRequestException(
        'No puedes eliminar tu propia cuenta de administrador',
      );
    }
    const user = await this.usuarioRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (esPropietario(user.rol)) {
      throw new ForbiddenException(
        'No se puede eliminar al usuario propietario del sistema',
      );
    }

    if (user.rol === RolUsuario.ADMIN) {
      await this.ensureAnotherPrivilegiado(id);
    }
    await this.usuarioRepo.delete(id);
    return { message: 'Usuario eliminado correctamente' };
  }

  private assertNoAssignOwner(rol?: RolUsuario) {
    if (rol === RolUsuario.OWNER) {
      throw new ForbiddenException(
        'El rol propietario no se puede asignar desde el panel',
      );
    }
  }

  private assertCanModifyProtectedUser(
    target: Usuario,
    actor: Usuario,
    dto: UpdateUsuarioAdminDto,
  ) {
    if (!esPropietario(target.rol)) return;

    if (!esPropietario(actor.rol)) {
      throw new ForbiddenException(
        'No tienes permiso para modificar al usuario propietario del sistema',
      );
    }

    if (target.id !== actor.id) {
      throw new ForbiddenException(
        'Solo el propietario puede gestionar su propia cuenta',
      );
    }

    if (dto.rol !== undefined && dto.rol !== RolUsuario.OWNER) {
      throw new BadRequestException('No puedes cambiar tu rol de propietario');
    }
  }

  private async ensureAnotherPrivilegiado(excludeId: number) {
    const count = await this.usuarioRepo.count({
      where: { rol: In([RolUsuario.ADMIN, RolUsuario.OWNER]) },
    });
    const target = await this.usuarioRepo.findOne({ where: { id: excludeId } });
    if (target?.rol === RolUsuario.ADMIN && count <= 1) {
      throw new ForbiddenException(
        'Debe quedar al menos un administrador o propietario en el sistema',
      );
    }
  }
}
