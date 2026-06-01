import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../entities/usuario.entity';

export interface JwtPayload {
  sub: number;
  email: string;
  rol: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET') || 'festivall_secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usuarioRepo.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException(
        'Sesión inválida: el usuario ya no existe o la base de datos se reinició. Cierra sesión y vuelve a entrar.',
      );
    }
    return { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre, apellidos: user.apellidos };
  }
}
