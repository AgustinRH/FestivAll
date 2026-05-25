import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('compras')
export class ComprasController {
  constructor(private comprasService: ComprasService) {}

  /** Webhook de Stripe (sin JWT). Requiere body en bruto. */
  @Post('webhook/stripe')
  stripeWebhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      return { received: false };
    }
    return this.comprasService.handleStripeWebhook(req.rawBody as Buffer, signature);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  createCheckout(@Request() req: { user: { id: number } }, @Body() dto: CreateCompraDto) {
    return this.comprasService.createCheckoutSession(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('checkout/verificar')
  verifyCheckout(
    @Request() req: { user: { id: number } },
    @Query('session_id') sessionId: string,
  ) {
    if (!sessionId) {
      return { status: 'missing_session' };
    }
    return this.comprasService.verifyCheckoutSession(req.user.id, sessionId);
  }

  /** Solo eventos gratuitos (precio 0). */
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: { user: { id: number } }, @Body() dto: CreateCompraDto) {
    return this.comprasService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mis-compras')
  findMine(@Request() req: { user: { id: number } }) {
    return this.comprasService.findByUser(req.user.id);
  }

  /** Cierre de caja: recaudación, comisiones y neto a transferir al local. */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/eventos/:idEvento/cierre-caja')
  cierreCaja(@Param('idEvento', ParseIntPipe) idEvento: number) {
    return this.comprasService.calcularCierreCaja(idEvento);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Request() req: { user: { id: number } }, @Param('id', ParseIntPipe) id: number) {
    return this.comprasService.findOne(id, req.user.id);
  }
}
