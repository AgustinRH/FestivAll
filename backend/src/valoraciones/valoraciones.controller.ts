import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ValoracionesService } from './valoraciones.service';
import { CreateValoracionDto } from './dto/create-valoracion.dto';
import { UpdateEstadoValoracionDto } from './dto/update-estado-valoracion.dto';
import { OmitirValoracionDto } from './dto/omitir-valoracion.dto';

@Controller()
export class ValoracionesController {
  constructor(private valoracionesService: ValoracionesService) {}

  @Post('valoraciones')
  @UseGuards(JwtAuthGuard)
  create(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateValoracionDto,
  ) {
    return this.valoracionesService.create(req.user.id, dto);
  }

  @Get('valoraciones/elegibilidad/:idEvento')
  @UseGuards(JwtAuthGuard)
  elegibilidad(
    @Request() req: { user: { id: number } },
    @Param('idEvento', ParseIntPipe) idEvento: number,
  ) {
    return this.valoracionesService.getElegibilidad(req.user.id, idEvento);
  }

  @Get('valoraciones/mis-pendientes')
  @UseGuards(JwtAuthGuard)
  pendientesPerfil(@Request() req: { user: { id: number } }) {
    return this.valoracionesService.findPendientesPerfil(req.user.id);
  }

  @Get('valoraciones/mis-valoraciones')
  @UseGuards(JwtAuthGuard)
  misValoraciones(@Request() req: { user: { id: number } }) {
    return this.valoracionesService.findMisValoraciones(req.user.id);
  }

  @Post('valoraciones/omitir')
  @UseGuards(JwtAuthGuard)
  omitir(
    @Request() req: { user: { id: number } },
    @Body() dto: OmitirValoracionDto,
  ) {
    return this.valoracionesService.omitir(req.user.id, dto.idEvento);
  }

  @Get('valoraciones/eventos')
  eventosConOpiniones() {
    return this.valoracionesService.findEventosConValoraciones();
  }

  @Get('valoraciones/eventos/:idEvento')
  opinionesEvento(@Param('idEvento', ParseIntPipe) idEvento: number) {
    return this.valoracionesService.findOpinionesEventoPublic(idEvento);
  }

  @Get('eventos/:idEvento/valoraciones')
  findByEvento(@Param('idEvento', ParseIntPipe) idEvento: number) {
    return this.valoracionesService.findPublicByEvento(idEvento);
  }

  @Get('valoraciones/admin/pendientes')
  @UseGuards(JwtAuthGuard, AdminGuard)
  pendientesAdmin() {
    return this.valoracionesService.findPendientesAdmin();
  }

  @Patch('valoraciones/:id/estado')
  @UseGuards(JwtAuthGuard, AdminGuard)
  moderar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoValoracionDto,
  ) {
    return this.valoracionesService.updateEstadoAdmin(id, dto);
  }
}
