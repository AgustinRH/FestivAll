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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioAdminDto } from './dto/create-usuario-admin.dto';
import { UpdateUsuarioAdminDto } from './dto/update-usuario-admin.dto';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUsuarioAdminDto) {
    return this.usuariosService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioAdminDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.usuariosService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: { user: { id: number } }) {
    return this.usuariosService.remove(id, req.user.id);
  }
}
