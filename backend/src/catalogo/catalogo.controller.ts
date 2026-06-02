import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from '../entities/categoria.entity';
import { Ubicacion } from '../entities/ubicacion.entity';

@ApiTags('catalogo')
@Controller('catalogo')
export class CatalogoController {
  constructor(
    @InjectRepository(Categoria) private categoriaRepo: Repository<Categoria>,
    @InjectRepository(Ubicacion) private ubicacionRepo: Repository<Ubicacion>,
  ) {}

  @Get('categorias')
  @ApiOperation({ summary: 'Listar categorías de eventos' })
  getCategorias() {
    return this.categoriaRepo.find({ order: { nombreCategoria: 'ASC' } });
  }

  @Get('ubicaciones')
  @ApiOperation({ summary: 'Listar localidades/ubicaciones' })
  getUbicaciones() {
    return this.ubicacionRepo.find({ order: { localidad: 'ASC' } });
  }
}
