import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evento } from '../entities/evento.entity';
import { Imagen } from '../entities/imagen.entity';
import { Ubicacion } from '../entities/ubicacion.entity';
import { Cliente } from '../entities/cliente.entity';
import { EventosService } from './eventos.service';
import { EventosController } from './eventos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Evento, Imagen, Ubicacion, Cliente])],
  controllers: [EventosController],
  providers: [EventosService],
  exports: [EventosService],
})
export class EventosModule {}
