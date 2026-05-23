import {
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
  UseGuards,
} from '@nestjs/common';
import { EventosService } from './eventos.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('eventos')
export class EventosController {
  constructor(private eventosService: EventosService) {}

  @Get()
  findAll(
    @Query('busqueda') busqueda?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('localidad') localidad?: string,
  ) {
    return this.eventosService.findAll({
      busqueda,
      categoriaId: categoriaId ? +categoriaId : undefined,
      localidad,
    });
  }

  @Get('popular')
  findDestacados(@Query('limit') limit?: string) {
    return this.eventosService.findDestacados(limit ? +limit : undefined);
  }

  @Get('ultimas-entradas')
  findUltimasEntradas() {
    return this.eventosService.findUltimasEntradas();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() dto: CreateEventoDto) {
    return this.eventosService.create(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventoDto) {
    return this.eventosService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/destacado')
  toggleDestacado(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.toggleDestacado(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.remove(id);
  }
}
