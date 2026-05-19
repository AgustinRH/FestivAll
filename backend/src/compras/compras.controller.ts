import { Body, Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('compras')
@UseGuards(JwtAuthGuard)
export class ComprasController {
  constructor(private comprasService: ComprasService) {}

  @Post()
  create(@Request() req: { user: { id: number } }, @Body() dto: CreateCompraDto) {
    return this.comprasService.create(req.user.id, dto);
  }

  @Get('mis-compras')
  findMine(@Request() req: { user: { id: number } }) {
    return this.comprasService.findByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req: { user: { id: number } }, @Param('id', ParseIntPipe) id: number) {
    return this.comprasService.findOne(id, req.user.id);
  }
}
