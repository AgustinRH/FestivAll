import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Valoracion } from '../entities/valoracion.entity';
import { ValoracionOmitida } from '../entities/valoracion-omitida.entity';
import { Compra } from '../entities/compra.entity';
import { Evento } from '../entities/evento.entity';
import { ValoracionesService } from './valoraciones.service';
import { ValoracionesController } from './valoraciones.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Valoracion, ValoracionOmitida, Compra, Evento]),
  ],
  controllers: [ValoracionesController],
  providers: [ValoracionesService],
  exports: [ValoracionesService],
})
export class ValoracionesModule {}
