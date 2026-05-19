import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categoria } from '../entities/categoria.entity';
import { Ubicacion } from '../entities/ubicacion.entity';
import { CatalogoController } from './catalogo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Categoria, Ubicacion])],
  controllers: [CatalogoController],
})
export class CatalogoModule {}
