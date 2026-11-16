import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { parseEventoIdFromSlug } from '../common/seo-slug.util';
import { EventosService } from './eventos.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ApiAdminAuth } from '../common/swagger.decorators';

@ApiTags('eventos')
@Controller('eventos')
export class EventosController {
  constructor(private eventosService: EventosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar/buscar eventos (público)' })
  @ApiQuery({ name: 'busqueda', required: false })
  @ApiQuery({ name: 'categoriaId', required: false })
  @ApiQuery({ name: 'localidad', required: false })
  @ApiQuery({ name: 'ultimasEntradas', required: false })
  @ApiQuery({ name: 'precioMin', required: false })
  @ApiQuery({ name: 'precioMax', required: false })
  @ApiQuery({ name: 'desde', required: false, description: 'Fecha ISO inicio' })
  @ApiQuery({ name: 'hasta', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false, description: 'Máx. 100' })
  findAll(
    @Query('busqueda') busqueda?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('localidad') localidad?: string,
    @Query('ultimasEntradas') ultimasEntradas?: string,
    @Query('precioMin') precioMin?: string,
    @Query('precioMax') precioMax?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsePrecio = (v?: string) => {
      if (v === undefined || v === '') return undefined;
      const n = +v;
      return Number.isFinite(n) ? n : undefined;
    };
    const parsePage = (v?: string) => {
      if (v === undefined || v === '') return undefined;
      const n = +v;
      return Number.isFinite(n) && n >= 1 ? Math.floor(n) : undefined;
    };
    const parseLimit = (v?: string) => {
      if (v === undefined || v === '') return undefined;
      const n = +v;
      return Number.isFinite(n) && n >= 1
        ? Math.min(Math.floor(n), 100)
        : undefined;
    };
    const parsedPage = parsePage(page);
    return this.eventosService.findAll({
      busqueda,
      categoriaId: categoriaId ? +categoriaId : undefined,
      localidad,
      ultimasEntradas: ultimasEntradas === 'true' || ultimasEntradas === '1',
      precioMin: parsePrecio(precioMin),
      precioMax: parsePrecio(precioMax),
      desde: desde || undefined,
      hasta: hasta || undefined,
      page: parsedPage,
      limit: parseLimit(limit),
      soloActivos: parsedPage != null,
    });
  }

  @Get('popular')
  @ApiOperation({ summary: 'Eventos destacados/populares' })
  @ApiQuery({ name: 'limit', required: false })
  findDestacados(@Query('limit') limit?: string) {
    return this.eventosService.findDestacados(limit ? +limit : undefined);
  }

  @Get('ultimas-entradas')
  @ApiOperation({ summary: 'Eventos con pocas entradas disponibles' })
  findUltimasEntradas() {
    return this.eventosService.findUltimasEntradas();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @Get('ubicaciones/buscar')
  @ApiOperation({ summary: 'Autocompletar ubicaciones (admin)' })
  @ApiQuery({ name: 'q', required: false, description: 'Mín. 3 caracteres' })
  buscarUbicaciones(@Query('q') q?: string) {
    const query = q?.trim() ?? '';
    if (query.length < 3) {
      return [];
    }
    return this.eventosService.buscarUbicaciones(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @Get('geocodificar')
  @ApiOperation({ summary: 'Geocodificar dirección (admin)' })
  geocodificar(
    @Query('direccion') direccion: string,
    @Query('localidad') localidad: string,
    @Query('provincia') provincia?: string,
  ) {
    if (!direccion?.trim() || !localidad?.trim()) {
      throw new BadRequestException('Indica dirección y localidad');
    }
    return this.eventosService.geocodificarDireccion({
      direccion: direccion.trim(),
      localidad: localidad.trim(),
      provincia: provincia?.trim(),
    });
  }

  @Get('mapa')
  @ApiOperation({ summary: 'Eventos para mapa (opcional filtro por radio)' })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'radio', required: false, description: 'km' })
  findForMapa(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radio') radio?: string,
  ) {
    const parse = (v?: string) => {
      if (v === undefined || v === '') return undefined;
      const n = +v;
      return Number.isFinite(n) ? n : undefined;
    };
    return this.eventosService.findForMapa({
      lat: parse(lat),
      lng: parse(lng),
      radio: parse(radio),
    });
  }

  @Get(':slugOrId')
  @ApiOperation({
    summary: 'Detalle público por id o slug (ej. 42-festival-rock)',
  })
  findOne(@Param('slugOrId') slugOrId: string) {
    const id = parseEventoIdFromSlug(slugOrId);
    if (id == null) {
      throw new BadRequestException('Identificador de evento inválido');
    }
    return this.eventosService.findOnePublic(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @Post()
  @ApiOperation({ summary: 'Crear evento (admin)' })
  create(@Body() dto: CreateEventoDto) {
    return this.eventosService.create(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar evento (admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventoDto) {
    return this.eventosService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @Post(':id/imagen/:tipo')
  @ApiOperation({
    summary: 'Subir imagen: principal | cartelera | galeria (admin)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiQuery({ name: 'slot', required: false, description: 'Índice en galería' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 30 * 1024 * 1024 },
    }),
  )
  uploadImagen(
    @Param('id', ParseIntPipe) id: number,
    @Param('tipo') tipo: string,
    @Query('slot') slot: string | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const slotNum =
      slot !== undefined && slot !== '' ? parseInt(slot, 10) : undefined;
    return this.eventosService.uploadImagen(
      id,
      tipo as 'principal' | 'cartelera' | 'galeria',
      file,
      slotNum,
    );
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @Delete(':id/imagen/:imagenId')
  @ApiOperation({ summary: 'Eliminar imagen de evento (admin)' })
  deleteImagen(
    @Param('id', ParseIntPipe) id: number,
    @Param('imagenId', ParseIntPipe) imagenId: number,
  ) {
    return this.eventosService.deleteImagen(id, imagenId);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @Patch(':id/destacado')
  @ApiOperation({ summary: 'Alternar evento destacado (admin)' })
  toggleDestacado(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.toggleDestacado(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar evento (admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.remove(id);
  }
}
