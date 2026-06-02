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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ApiAdminAuth, ApiJwtAuth } from '../common/swagger.decorators';
import { ValoracionesService } from './valoraciones.service';
import { CreateValoracionDto } from './dto/create-valoracion.dto';
import { UpdateEstadoValoracionDto } from './dto/update-estado-valoracion.dto';
import { OmitirValoracionDto } from './dto/omitir-valoracion.dto';

@ApiTags('valoraciones')
@Controller()
export class ValoracionesController {
  constructor(private valoracionesService: ValoracionesService) {}

  @Post('valoraciones')
  @UseGuards(JwtAuthGuard)
  @ApiJwtAuth()
  @ApiOperation({ summary: 'Crear valoración de un evento asistido' })
  create(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateValoracionDto,
  ) {
    return this.valoracionesService.create(req.user.id, dto);
  }

  @Get('valoraciones/elegibilidad/:idEvento')
  @UseGuards(JwtAuthGuard)
  @ApiJwtAuth()
  @ApiOperation({ summary: 'Comprobar si el usuario puede valorar el evento' })
  elegibilidad(
    @Request() req: { user: { id: number } },
    @Param('idEvento', ParseIntPipe) idEvento: number,
  ) {
    return this.valoracionesService.getElegibilidad(req.user.id, idEvento);
  }

  @Get('valoraciones/mis-pendientes')
  @UseGuards(JwtAuthGuard)
  @ApiJwtAuth()
  @ApiOperation({ summary: 'Eventos pendientes de valorar (perfil)' })
  pendientesPerfil(@Request() req: { user: { id: number } }) {
    return this.valoracionesService.findPendientesPerfil(req.user.id);
  }

  @Get('valoraciones/mis-valoraciones')
  @UseGuards(JwtAuthGuard)
  @ApiJwtAuth()
  @ApiOperation({ summary: 'Valoraciones enviadas por el usuario' })
  misValoraciones(@Request() req: { user: { id: number } }) {
    return this.valoracionesService.findMisValoraciones(req.user.id);
  }

  @Post('valoraciones/omitir')
  @UseGuards(JwtAuthGuard)
  @ApiJwtAuth()
  @ApiOperation({ summary: 'Omitir valoración de un evento' })
  omitir(
    @Request() req: { user: { id: number } },
    @Body() dto: OmitirValoracionDto,
  ) {
    return this.valoracionesService.omitir(req.user.id, dto.idEvento);
  }

  @Get('valoraciones/eventos')
  @ApiOperation({ summary: 'Eventos con opiniones públicas' })
  eventosConOpiniones() {
    return this.valoracionesService.findEventosConValoraciones();
  }

  @Get('valoraciones/eventos/:idEvento')
  @ApiOperation({ summary: 'Opiniones públicas de un evento' })
  opinionesEvento(@Param('idEvento', ParseIntPipe) idEvento: number) {
    return this.valoracionesService.findOpinionesEventoPublic(idEvento);
  }

  @Get('eventos/:idEvento/valoraciones')
  @ApiOperation({ summary: 'Valoraciones aprobadas de un evento (alias)' })
  findByEvento(@Param('idEvento', ParseIntPipe) idEvento: number) {
    return this.valoracionesService.findPublicByEvento(idEvento);
  }

  @Get('valoraciones/admin/pendientes')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @ApiOperation({ summary: 'Cola de moderación (admin)' })
  pendientesAdmin() {
    return this.valoracionesService.findPendientesAdmin();
  }

  @Patch('valoraciones/:id/estado')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @ApiOperation({ summary: 'Aprobar o rechazar valoración (admin)' })
  moderar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoValoracionDto,
  ) {
    return this.valoracionesService.updateEstadoAdmin(id, dto);
  }
}
