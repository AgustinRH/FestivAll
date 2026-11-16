import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { ReasignarEntradaDto } from './dto/reasignar-entrada.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ApiAdminAuth, ApiJwtAuth } from '../common/swagger.decorators';

@ApiTags('compras')
@Controller('compras')
export class ComprasController {
  constructor(private comprasService: ComprasService) {}

  @Post('webhook/stripe')
  @ApiOperation({
    summary: 'Webhook Stripe (sin JWT)',
    description: 'Requiere body en bruto y cabecera stripe-signature.',
  })
  stripeWebhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Falta cabecera stripe-signature');
    }
    if (!req.rawBody?.length) {
      throw new BadRequestException(
        'Cuerpo del webhook vacío (se requiere raw body)',
      );
    }
    return this.comprasService.handleStripeWebhook(req.rawBody, signature);
  }

  @UseGuards(JwtAuthGuard)
  @ApiJwtAuth()
  @Post('checkout')
  @ApiOperation({ summary: 'Crear sesión Stripe Checkout (evento de pago)' })
  createCheckout(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateCompraDto,
  ) {
    return this.comprasService.createCheckoutSession(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiJwtAuth()
  @Get('checkout/verificar')
  @ApiOperation({ summary: 'Verificar estado de sesión Checkout tras el pago' })
  @ApiQuery({ name: 'session_id', required: false })
  verifyCheckout(
    @Request() req: { user: { id: number } },
    @Query('session_id') sessionId: string,
  ) {
    if (!sessionId) {
      return { status: 'missing_session' };
    }
    return this.comprasService.verifyCheckoutSession(req.user.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiJwtAuth()
  @Post()
  @ApiOperation({ summary: 'Comprar entradas gratis (precio 0)' })
  create(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateCompraDto,
  ) {
    return this.comprasService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiJwtAuth()
  @Get('mis-compras')
  @ApiOperation({ summary: 'Historial de compras del usuario' })
  findMine(@Request() req: { user: { id: number } }) {
    return this.comprasService.findByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @Get('admin/eventos/:idEvento/cierre-caja')
  @ApiOperation({ summary: 'Cierre de caja: recaudación y neto (admin)' })
  cierreCaja(@Param('idEvento', ParseIntPipe) idEvento: number) {
    return this.comprasService.calcularCierreCaja(idEvento);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @Get('admin/eventos/:idEvento/entradas')
  @ApiOperation({ summary: 'Listar entradas vendidas de un evento (admin)' })
  listEntradasEvento(@Param('idEvento', ParseIntPipe) idEvento: number) {
    return this.comprasService.findEntradasByEventoAdmin(idEvento);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @Delete('admin/entradas/:idCompra')
  @ApiOperation({ summary: 'Anular entrada (admin)' })
  deleteEntrada(@Param('idCompra', ParseIntPipe) idCompra: number) {
    return this.comprasService.deleteEntradaAdmin(idCompra);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @Patch('admin/entradas/:idCompra/asistida')
  @ApiOperation({ summary: 'Marcar entrada como asistida (admin)' })
  marcarAsistida(@Param('idCompra', ParseIntPipe) idCompra: number) {
    return this.comprasService.marcarEntradaAsistidaAdmin(idCompra);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiAdminAuth()
  @Patch('admin/entradas/:idCompra')
  @ApiOperation({ summary: 'Reasignar entrada a otro usuario (admin)' })
  reasignarEntrada(
    @Param('idCompra', ParseIntPipe) idCompra: number,
    @Body() dto: ReasignarEntradaDto,
  ) {
    return this.comprasService.reasignarEntradaAdmin(idCompra, dto.idUsuario);
  }

  @UseGuards(JwtAuthGuard)
  @ApiJwtAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una compra del usuario' })
  findOne(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.comprasService.findOne(id, req.user.id);
  }
}
