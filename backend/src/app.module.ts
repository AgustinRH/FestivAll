import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { EventosModule } from './eventos/eventos.module';
import { ComprasModule } from './compras/compras.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { Categoria } from './entities/categoria.entity';
import { Ubicacion } from './entities/ubicacion.entity';
import { Usuario } from './entities/usuario.entity';
import { Evento } from './entities/evento.entity';
import { Imagen } from './entities/imagen.entity';
import { Compra } from './entities/compra.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mariadb',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get('DB_USERNAME', 'root'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_DATABASE', 'FestivAll'),
        entities: [Categoria, Ubicacion, Usuario, Evento, Imagen, Compra],
        synchronize: false,
      }),
    }),
    MailModule,
    AuthModule,
    EventosModule,
    ComprasModule,
    CatalogoModule,
    UsuariosModule,
  ],
})
export class AppModule {}
