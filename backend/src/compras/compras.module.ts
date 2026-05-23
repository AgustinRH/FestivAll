import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compra } from '../entities/compra.entity';
import { Evento } from '../entities/evento.entity';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';
import { StripeService } from './stripe.service';

@Module({
  imports: [TypeOrmModule.forFeature([Compra, Evento])],
  controllers: [ComprasController],
  providers: [ComprasService, StripeService],
})
export class ComprasModule {}
