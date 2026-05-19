import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compra } from '../entities/compra.entity';
import { Evento } from '../entities/evento.entity';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Compra, Evento])],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule {}
