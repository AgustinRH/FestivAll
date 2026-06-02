import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ApiAdminAuth } from '../common/swagger.decorators';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioAdminDto } from './dto/create-usuario-admin.dto';
import { UpdateUsuarioAdminDto } from './dto/update-usuario-admin.dto';

@ApiTags('usuarios (admin)')
@ApiAdminAuth()
@Controller('usuarios')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios' })
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de usuario' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario (admin o cliente)' })
  create(@Body() dto: CreateUsuarioAdminDto) {
    return this.usuariosService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioAdminDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.usuariosService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar usuario' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: { user: { id: number } }) {
    return this.usuariosService.remove(id, req.user.id);
  }
}
