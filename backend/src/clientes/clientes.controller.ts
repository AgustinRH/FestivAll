import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ApiAdminAuth } from '../common/swagger.decorators';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@ApiTags('clientes (admin)')
@ApiAdminAuth()
@Controller('clientes')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ClientesController {
  constructor(private clientesService: ClientesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes (locales/promotores)' })
  findAll() {
    return this.clientesService.findAll();
  }

  @Get('activos')
  @ApiOperation({ summary: 'Clientes activos (para selectores)' })
  findActivos() {
    return this.clientesService.findActivos();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de cliente' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear cliente' })
  create(@Body() dto: CreateClienteDto) {
    return this.clientesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClienteDto) {
    return this.clientesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cliente' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.remove(id);
  }
}
