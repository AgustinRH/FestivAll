import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from '../entities/categoria.entity';
import { Ubicacion } from '../entities/ubicacion.entity';

@Controller('catalogo')
export class CatalogoController {
  constructor(
    @InjectRepository(Categoria) private categoriaRepo: Repository<Categoria>,
    @InjectRepository(Ubicacion) private ubicacionRepo: Repository<Ubicacion>,
  ) {}

  @Get('categorias')
  getCategorias() {
    return this.categoriaRepo.find({ order: { nombreCategoria: 'ASC' } });
  }

  @Get('ubicaciones')
  getUbicaciones() {
    return this.ubicacionRepo.find({ order: { localidad: 'ASC' } });
  }
}
