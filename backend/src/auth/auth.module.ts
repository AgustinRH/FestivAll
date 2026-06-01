import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';
import { Usuario } from '../entities/usuario.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

function jwtExpiresIn(config: ConfigService): JwtSignOptions['expiresIn'] {
  const raw = config.get<string>('JWT_EXPIRES_IN')?.trim() || '7d';
  const value = /^\d+$/.test(raw) ? `${raw}d` : raw;
  return value as JwtSignOptions['expiresIn'];
}

@Module({
  imports: [
    MailModule,
    TypeOrmModule.forFeature([Usuario]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'festivall_secret',
        signOptions: { expiresIn: jwtExpiresIn(config) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
