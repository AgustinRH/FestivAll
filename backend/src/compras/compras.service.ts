import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import Stripe from 'stripe';
import { Compra } from '../entities/compra.entity';
import { Evento } from '../entities/evento.entity';
import { Usuario } from '../entities/usuario.entity';
import { tieneAccesoAdmin } from '../auth/roles.util';
import { CreateCompraDto } from './dto/create-compra.dto';
import { StripeService } from './stripe.service';
import { MailService } from '../mail/mail.service';
import { buildEventoSlug } from '../common/seo-slug.util';
import { getPrecioUnitario, aplicaDescuentoUltimasEntradas } from '../eventos/precio.util';
import { eventoEstaActivo } from '../eventos/evento-activo.util';
import {
  buildCheckoutMetadata,
  buildLocalId,
  generarIdPedidoInterno,
} from './compras-metadata.util';
import {
  obtenerComisionStripeRealEur,
  precioUnitarioDesdeSesion,
} from './stripe-fees.util';

type FulfillPurchaseResult =
  | { status: 'fulfilled'; compras: Compra[] }
  | { status: 'already_processed'; compras: Compra[] }
  | { status: 'no_stock' }
  | { status: 'event_not_found' }
  | { status: 'event_ended' };

export type CierreCajaReport = {
  eventoId: number;
  eventoTitulo: string;
  localNombre: string;
  entradasVendidas: number;
  transaccionesPagadas: number;
  entradasGratuitas: number;
  totalRecaudado: number;
  comisionStripe: number;
  comisionStripeEsEstimada: boolean;
  transaccionesConFeeReal: number;
  comisionFestivall: number;
  totalTransferirLocal: number;
  festivallComisionPct: number;
  stripeFeePercent: number;
  stripeFeeFixedEur: number;
  stripeMode: string;
  nota: string;
};

@Injectable()
export class ComprasService {
  private readonly logger = new Logger(ComprasService.name);

  constructor(
    @InjectRepository(Compra) private compraRepo: Repository<Compra>,
    @InjectRepository(Evento) private eventoRepo: Repository<Evento>,
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
    private stripeService: StripeService,
    private mailService: MailService,
  ) {}

  private async assertEmailVerified(userId: number): Promise<Usuario> {
    const user = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!user) throw new ForbiddenException('Usuario no encontrado');
    if (!tieneAccesoAdmin(user.rol) && !user.emailVerificado) {
      throw new ForbiddenException(
        'Debes verificar tu email antes de comprar entradas. Revisa tu bandeja de entrada o solicita un nuevo enlace de verificación.',
      );
    }
    return user;
  }

  private scheduleNotifyPurchaseConfirmation(userId: number, compras: Compra[]): void {
    void this.notifyPurchaseConfirmation(userId, compras).catch((err) =>
      this.logger.error(`Confirmación por email fallida (usuario ${userId})`, err),
    );
  }

  private async notifyPurchaseConfirmation(userId: number, compras: Compra[]): Promise<void> {
    if (compras.length === 0) return;
    const user = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!user) return;

    const evento = compras[0].evento;
    const total = compras.reduce((sum, c) => sum + Number(c.totalPago), 0);
    const perfilUrl = `${this.stripeService.getFrontendUrl()}/perfil`;

    await this.mailService.sendPurchaseConfirmationEmail(user.email, user.nombre, {
      eventoTitulo: evento?.titulo ?? 'Evento',
      cantidad: compras.length,
      total,
      codigos: compras.map((c) => c.codigoAcceso),
      perfilUrl,
    });
  }

  private generarCodigo(): string {
    return `FA-${randomBytes(6).toString('hex').toUpperCase()}`;
  }

  private async resolvePrecioUnitarioPagado(
    precioCatalogo: number,
    cantidad: number,
    stripeCheckoutSessionId?: string,
    sessionPrecargada?: Stripe.Checkout.Session,
  ): Promise<number> {
    if (sessionPrecargada) {
      return precioUnitarioDesdeSesion(sessionPrecargada, cantidad, precioCatalogo);
    }
    if (!stripeCheckoutSessionId || cantidad < 1) {
      return precioCatalogo;
    }
    try {
      const stripe = this.stripeService.getClient();
      const session = await stripe.checkout.sessions.retrieve(stripeCheckoutSessionId);
      return precioUnitarioDesdeSesion(session, cantidad, precioCatalogo);
    } catch (err) {
      this.logger.warn(
        `No se pudo leer importe de sesión Stripe ${stripeCheckoutSessionId}, se usa precio catálogo`,
        err,
      );
      return precioCatalogo;
    }
  }

  private async findComprasBySession(stripeCheckoutSessionId: string): Promise<Compra[]> {
    return this.compraRepo.find({
      where: { stripeCheckoutSessionId },
      relations: ['evento', 'evento.categoria', 'evento.ubicacion', 'evento.imagenes'],
      order: { id: 'ASC' },
    });
  }

  /**
   * Webhook: sin bloqueo pesimista prolongado. Descuento de stock atómico (UPDATE condicional).
   * Sin llamadas a Stripe dentro de la transacción.
   */
  private async tryFulfillPurchaseWebhookFast(
    userId: number,
    idEvento: number,
    cantidad: number,
    stripeCheckoutSessionId: string,
    session: Stripe.Checkout.Session,
  ): Promise<FulfillPurchaseResult> {
    const yaProcesada = await this.compraRepo.count({
      where: { stripeCheckoutSessionId },
    });
    if (yaProcesada > 0) {
      return { status: 'already_processed', compras: await this.findComprasBySession(stripeCheckoutSessionId) };
    }

    const eventoLigero = await this.eventoRepo.findOne({ where: { id: idEvento } });
    if (!eventoLigero) return { status: 'event_not_found' };
    if (!eventoEstaActivo(eventoLigero)) return { status: 'event_ended' };
    if (eventoLigero.stock < cantidad) return { status: 'no_stock' };

    const precioUnitario = precioUnitarioDesdeSesion(
      session,
      cantidad,
      getPrecioUnitario(eventoLigero),
    );

    const updateResult = await this.eventoRepo
      .createQueryBuilder()
      .update(Evento)
      .set({ stock: () => `stock - ${cantidad}` })
      .where('id = :id', { id: idEvento })
      .andWhere('stock >= :cantidad', { cantidad })
      .execute();

    if (!updateResult.affected) {
      return { status: 'no_stock' };
    }

    const entradas = Array.from({ length: cantidad }, () =>
      this.compraRepo.create({
        idUsuario: userId,
        idEvento,
        cantidad: 1,
        totalPago: precioUnitario,
        codigoAcceso: this.generarCodigo(),
        stripeCheckoutSessionId,
      }),
    );

    const guardadas = await this.compraRepo.save(entradas);
    const compras = await this.compraRepo.find({
      where: { id: In(guardadas.map((c) => c.id)) },
      relations: ['evento', 'evento.categoria', 'evento.ubicacion', 'evento.imagenes'],
      order: { id: 'ASC' },
    });

    return { status: 'fulfilled', compras };
  }

  /**
   * Verificación en navegador / entradas gratis: bloqueo pesimista (el usuario espera la respuesta).
   */
  private async tryFulfillPurchaseWithLock(
    userId: number,
    idEvento: number,
    cantidad: number,
    stripeCheckoutSessionId?: string,
    sessionPrecargada?: Stripe.Checkout.Session,
  ): Promise<FulfillPurchaseResult> {
    if (stripeCheckoutSessionId) {
      const yaProcesada = await this.compraRepo.count({
        where: { stripeCheckoutSessionId },
      });
      if (yaProcesada > 0) {
        return {
          status: 'already_processed',
          compras: await this.findComprasBySession(stripeCheckoutSessionId),
        };
      }
    }

    return this.eventoRepo.manager.transaction(async (manager) => {
      const evento = await manager.findOne(Evento, {
        where: { id: idEvento },
        lock: { mode: 'pessimistic_write' },
      });
      if (!evento) return { status: 'event_not_found' as const };
      if (!eventoEstaActivo(evento)) return { status: 'event_ended' as const };
      if (evento.stock < cantidad) return { status: 'no_stock' as const };

      const precioUnitario = await this.resolvePrecioUnitarioPagado(
        getPrecioUnitario(evento),
        cantidad,
        stripeCheckoutSessionId,
        sessionPrecargada,
      );

      const entradas = Array.from({ length: cantidad }, () =>
        manager.create(Compra, {
          idUsuario: userId,
          idEvento,
          cantidad: 1,
          totalPago: precioUnitario,
          codigoAcceso: this.generarCodigo(),
          stripeCheckoutSessionId: stripeCheckoutSessionId || undefined,
        }),
      );

      evento.stock -= cantidad;
      await manager.save(Evento, evento);
      const guardadas = await manager.save(Compra, entradas);

      const compras = await manager.find(Compra, {
        where: { id: In(guardadas.map((c) => c.id)) },
        relations: ['evento', 'evento.categoria', 'evento.ubicacion', 'evento.imagenes'],
        order: { id: 'ASC' },
      });

      return { status: 'fulfilled' as const, compras };
    });
  }

  async fulfillPurchase(
    userId: number,
    idEvento: number,
    cantidad: number,
    stripeCheckoutSessionId?: string,
  ): Promise<Compra[]> {
    await this.assertEmailVerified(userId);

    const result = await this.tryFulfillPurchaseWithLock(
      userId,
      idEvento,
      cantidad,
      stripeCheckoutSessionId,
    );

    switch (result.status) {
      case 'fulfilled':
      case 'already_processed':
        if (result.status === 'fulfilled') {
          await this.notifyPurchaseConfirmation(userId, result.compras);
        }
        return result.compras;
      case 'event_not_found':
        throw new NotFoundException('Evento no encontrado');
      case 'event_ended':
        throw new BadRequestException('Este evento ya ha finalizado y no admite más compras');
      case 'no_stock':
        throw new BadRequestException('No hay suficiente stock disponible');
    }
  }

  private scheduleRefundPaidSession(
    session: Stripe.Checkout.Session,
    motivo: 'overbooking',
  ): void {
    setImmediate(() => {
      void this.refundPaidSession(session, motivo).catch((err) =>
        this.logger.error(`Reembolso async fallido (${session.id})`, err),
      );
    });
  }

  private async refundPaidSession(
    session: Stripe.Checkout.Session,
    motivo: 'overbooking',
  ): Promise<boolean> {
    const idPedido = session.metadata?.id_pedido_interno ?? session.id;
    try {
      const stripe = this.stripeService.getClient();
      const full = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['payment_intent'],
      });
      const pi = full.payment_intent;
      const paymentIntentId = typeof pi === 'string' ? pi : pi?.id;
      if (!paymentIntentId) {
        this.logger.error(
          `Reembolso imposible: sin payment_intent en sesión ${session.id} (${idPedido})`,
        );
        return false;
      }

      await stripe.refunds.create({
        payment_intent: paymentIntentId,
        metadata: {
          motivo,
          id_pedido_interno: idPedido,
          evento_id: session.metadata?.eventoId ?? '',
        },
      });

      this.logger.warn(
        `Reembolso automático (${motivo}) para pedido ${idPedido}, sesión ${session.id}`,
      );
      return true;
    } catch (err) {
      this.logger.error(`Error al reembolsar sesión ${session.id} (${idPedido})`, err);
      return false;
    }
  }

  private assertTerminosAceptados(aceptoTerminos: boolean) {
    if (aceptoTerminos !== true) {
      throw new BadRequestException(
        'Debes aceptar los términos del servicio y las condiciones de compra',
      );
    }
  }

  async create(userId: number, dto: CreateCompraDto) {
    this.assertTerminosAceptados(dto.aceptoTerminos);
    await this.assertEmailVerified(userId);
    const evento = await this.eventoRepo.findOne({ where: { id: dto.idEvento } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    if (!eventoEstaActivo(evento)) {
      throw new BadRequestException('Este evento ya ha finalizado y no admite más compras');
    }

    const precio = Number(evento.precio);
    if (precio > 0) {
      throw new BadRequestException(
        'Este evento requiere pago. Usa el flujo de pago con tarjeta (checkout).',
      );
    }

    return this.fulfillPurchase(userId, dto.idEvento, dto.cantidad);
  }

  async createCheckoutSession(userId: number, dto: CreateCompraDto) {
    this.assertTerminosAceptados(dto.aceptoTerminos);
    await this.assertEmailVerified(userId);

    const evento = await this.eventoRepo.findOne({
      where: { id: dto.idEvento },
      relations: ['ubicacion'],
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    if (!eventoEstaActivo(evento)) {
      throw new BadRequestException('Este evento ya ha finalizado y no admite más compras');
    }

    const precioUnitario = getPrecioUnitario(evento);
    if (precioUnitario <= 0) {
      return this.fulfillPurchase(userId, dto.idEvento, dto.cantidad).then((compras) => ({
        free: true as const,
        compras,
      }));
    }

    if (evento.stock < dto.cantidad) {
      throw new BadRequestException('No hay suficiente stock disponible');
    }

    const stripe = this.stripeService.getClient();
    const frontendUrl = this.stripeService.getFrontendUrl();
    const amountCents = Math.round(precioUnitario * 100);
    const descuentoActivo = aplicaDescuentoUltimasEntradas(evento.stock);
    const descripcion = descuentoActivo
      ? `Entrada · ${evento.fechaInicio} · 15% dto. últimas entradas`
      : `Entrada · ${evento.fechaInicio}`;

    const idPedidoInterno = generarIdPedidoInterno(evento.id, userId);
    const localId = evento.ubicacion
      ? buildLocalId(evento.ubicacion)
      : `evento_${evento.id}_sin_ubicacion`;

    const taxRateId = this.stripeService.getTaxRateId();
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      price_data: {
        currency: 'eur',
        product_data: {
          name: evento.titulo,
          description: descripcion,
        },
        unit_amount: amountCents,
      },
      quantity: dto.cantidad,
    };
    if (taxRateId) {
      lineItem.tax_rates = [taxRateId];
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [lineItem],
      metadata: buildCheckoutMetadata({
        userId,
        eventoId: dto.idEvento,
        cantidad: dto.cantidad,
        idPedidoInterno,
        localId,
      }),
      success_url: `${frontendUrl}/perfil?session_id={CHECKOUT_SESSION_ID}#entradas`,
      cancel_url: `${frontendUrl}/eventos/${
        evento.slug ?? buildEventoSlug(evento.id, evento.titulo, evento.ubicacion?.localidad)
      }?pago=cancelado`,
    });

    if (!session.url) {
      throw new BadRequestException('No se pudo iniciar el pago con Stripe');
    }

    this.logger.log(
      `Checkout ${session.id} · pedido ${idPedidoInterno} · local ${localId} · modo ${this.stripeService.getMode()}`,
    );

    return {
      free: false as const,
      url: session.url,
      sessionId: session.id,
      idPedidoInterno,
    };
  }

  /**
   * Responde 200 OK de inmediato; el procesamiento y los reembolsos van en segundo plano.
   */
  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const stripe = this.stripeService.getClient();
    const secret = this.stripeService.getWebhookSecret();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      this.logger.warn(
        `Webhook Stripe: firma inválida (modo ${this.stripeService.getMode()}). ¿STRIPE_WEBHOOK_SECRET_${this.stripeService.getMode().toUpperCase()} del endpoint correcto?`,
      );
      throw new BadRequestException('Firma de webhook inválida');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      setImmediate(() => {
        void this.processCompletedSessionAsync(session).catch((err) =>
          this.logger.error(`Error procesando webhook ${session.id}`, err),
        );
      });
    }

    return { received: true };
  }

  /** Trabajo en background tras ACK 200 a Stripe. */
  private async processCompletedSessionAsync(session: Stripe.Checkout.Session) {
    if (session.payment_status !== 'paid') return;

    const userId = Number(session.metadata?.userId);
    const eventoId = Number(session.metadata?.eventoId);
    const cantidad = Number(session.metadata?.cantidad);
    const idPedido = session.metadata?.id_pedido_interno ?? session.id;

    if (!userId || !eventoId || !cantidad) {
      this.logger.error(`Metadata incompleta en sesión ${session.id} (pedido ${idPedido})`);
      return;
    }

    const result = await this.tryFulfillPurchaseWebhookFast(
      userId,
      eventoId,
      cantidad,
      session.id,
      session,
    );

    if (result.status === 'fulfilled') {
      this.scheduleNotifyPurchaseConfirmation(userId, result.compras);
      return;
    }

    if (result.status === 'already_processed') {
      return;
    }

    if (
      result.status === 'no_stock' ||
      result.status === 'event_ended' ||
      result.status === 'event_not_found'
    ) {
      this.scheduleRefundPaidSession(session, 'overbooking');
      this.logger.warn(
        `Webhook overbooking (${result.status}): pedido ${idPedido}, evento ${eventoId}`,
      );
    }
  }

  async verifyCheckoutSession(userId: number, sessionId: string) {
    await this.assertEmailVerified(userId);

    const stripe = this.stripeService.getClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (Number(session.metadata?.userId) !== userId) {
      throw new ForbiddenException('Esta sesión de pago no pertenece a tu cuenta');
    }

    if (session.payment_status === 'paid') {
      const eventoId = Number(session.metadata!.eventoId);
      const cantidad = Number(session.metadata!.cantidad);
      const result = await this.tryFulfillPurchaseWithLock(
        userId,
        eventoId,
        cantidad,
        session.id,
        session,
      );

      if (result.status === 'fulfilled') {
        await this.notifyPurchaseConfirmation(userId, result.compras);
        return { status: 'paid' as const, compras: result.compras };
      }
      if (result.status === 'already_processed') {
        return { status: 'paid' as const, compras: result.compras };
      }
      if (
        result.status === 'no_stock' ||
        result.status === 'event_ended' ||
        result.status === 'event_not_found'
      ) {
        const refunded = await this.refundPaidSession(session, 'overbooking');
        const message =
          result.status === 'no_stock'
            ? 'El aforo se agotó mientras completabas el pago. Se ha iniciado el reembolso automático.'
            : 'El evento ya no admite entradas. Se ha iniciado el reembolso automático.';
        return {
          status: 'refunded_overbooking' as const,
          compras: [],
          refunded,
          message,
        };
      }
    }

    return { status: session.status ?? 'open', compras: [] };
  }

  async calcularCierreCaja(idEvento: number): Promise<CierreCajaReport> {
    const evento = await this.eventoRepo.findOne({
      where: { id: idEvento },
      relations: ['ubicacion'],
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');

    const compras = await this.compraRepo.find({ where: { idEvento } });

    let totalRecaudado = 0;
    let entradasGratuitas = 0;
    const sesionesPagadas = new Set<string>();

    for (const c of compras) {
      const importe = Number(c.totalPago);
      if (importe > 0) {
        totalRecaudado += importe;
        if (c.stripeCheckoutSessionId) {
          sesionesPagadas.add(c.stripeCheckoutSessionId);
        }
      } else {
        entradasGratuitas += 1;
      }
    }

    const transaccionesPagadas = sesionesPagadas.size;
    const { percent, fixedEur } = this.stripeService.getStripeFeeEstimate();
    const comisionEstimadaFallback =
      Math.round((totalRecaudado * (percent / 100) + transaccionesPagadas * fixedEur) * 100) /
      100;

    let comisionStripe = 0;
    let transaccionesConFeeReal = 0;
    const stripe = this.stripeService.isConfigured()
      ? this.stripeService.getClient()
      : null;

    if (stripe && sesionesPagadas.size > 0) {
      for (const sessionId of sesionesPagadas) {
        const feeReal = await obtenerComisionStripeRealEur(stripe, sessionId);
        if (feeReal != null) {
          comisionStripe += feeReal;
          transaccionesConFeeReal += 1;
        }
      }
      comisionStripe = Math.round(comisionStripe * 100) / 100;
    }

    const comisionStripeEsEstimada = transaccionesConFeeReal < transaccionesPagadas;
    if (comisionStripeEsEstimada) {
      const sesionesSinFee = transaccionesPagadas - transaccionesConFeeReal;
      const parteEstimada =
        Math.round(
          (totalRecaudado * (percent / 100) + sesionesSinFee * fixedEur) * 100,
        ) / 100;
      comisionStripe = Math.round((comisionStripe + parteEstimada) * 100) / 100;
      if (transaccionesConFeeReal === 0) {
        comisionStripe = comisionEstimadaFallback;
      }
    }

    const festivallComisionPct = this.stripeService.getFestivallCommissionPercent();
    const comisionFestivall =
      Math.round(totalRecaudado * (festivallComisionPct / 100) * 100) / 100;
    const totalTransferirLocal =
      Math.round((totalRecaudado - comisionStripe - comisionFestivall) * 100) / 100;

    const localNombre = evento.ubicacion
      ? `${evento.ubicacion.direccion}, ${evento.ubicacion.localidad}`
      : '—';

    const notaComision = comisionStripeEsEstimada
      ? `Comisión Stripe: ${transaccionesConFeeReal}/${transaccionesPagadas} transacciones con fee real (balance_transaction); el resto usa estimación (${percent}% + ${fixedEur} €). Tarjetas no-UE/Apple Pay internacional pueden variar.`
      : `Comisión Stripe obtenida de balance_transaction en todas las transacciones (${transaccionesConFeeReal}).`;

    return {
      eventoId: evento.id,
      eventoTitulo: evento.titulo,
      localNombre,
      entradasVendidas: compras.length,
      transaccionesPagadas,
      entradasGratuitas,
      totalRecaudado: Math.round(totalRecaudado * 100) / 100,
      comisionStripe,
      comisionStripeEsEstimada,
      transaccionesConFeeReal,
      comisionFestivall,
      totalTransferirLocal,
      festivallComisionPct,
      stripeFeePercent: percent,
      stripeFeeFixedEur: fixedEur,
      stripeMode: this.stripeService.getMode(),
      nota: notaComision,
    };
  }

  async findByUser(userId: number) {
    return this.compraRepo.find({
      where: { idUsuario: userId },
      relations: ['evento', 'evento.categoria', 'evento.ubicacion', 'evento.imagenes'],
      order: { fechaCompra: 'DESC', id: 'DESC' },
    });
  }

  async findOne(id: number, userId: number) {
    const compra = await this.compraRepo.findOne({
      where: { id, idUsuario: userId },
      relations: ['evento', 'evento.categoria', 'evento.ubicacion', 'evento.imagenes'],
    });
    if (!compra) throw new NotFoundException('Compra no encontrada');
    return compra;
  }

  /** Listado admin: cada fila es una entrada (compra con cantidad 1). */
  async findEntradasByEventoAdmin(idEvento: number) {
    const evento = await this.eventoRepo.findOne({ where: { id: idEvento } });
    if (!evento) throw new NotFoundException('Evento no encontrado');

    const compras = await this.compraRepo
      .createQueryBuilder('c')
      .leftJoin('c.usuario', 'u')
      .addSelect(['u.id', 'u.nombre', 'u.apellidos', 'u.email', 'u.rol', 'u.emailVerificado'])
      .where('c.idEvento = :idEvento', { idEvento })
      .orderBy('c.fechaCompra', 'DESC')
      .addOrderBy('c.id', 'DESC')
      .getMany();

    return compras.map((c) => ({
      id: c.id,
      idEvento: c.idEvento,
      idUsuario: c.idUsuario,
      cantidad: c.cantidad,
      totalPago: Number(c.totalPago),
      fechaCompra: c.fechaCompra,
      codigoAcceso: c.codigoAcceso,
      estadoEntrada: c.estadoEntrada,
      stripeCheckoutSessionId: c.stripeCheckoutSessionId ?? null,
      usuario: c.usuario
        ? {
            id: c.usuario.id,
            nombre: c.usuario.nombre,
            apellidos: c.usuario.apellidos,
            email: c.usuario.email,
          }
        : null,
    }));
  }

  async deleteEntradaAdmin(idCompra: number) {
    const compra = await this.compraRepo.findOne({
      where: { id: idCompra },
      relations: ['evento'],
    });
    if (!compra) throw new NotFoundException('Entrada no encontrada');
    if (compra.cantidad !== 1) {
      throw new BadRequestException(
        'Solo se pueden eliminar entradas individuales (cantidad 1). Contacta con soporte si el registro es antiguo.',
      );
    }

    await this.eventoRepo.increment({ id: compra.idEvento }, 'stock', 1);
    await this.compraRepo.remove(compra);
    return { message: 'Entrada eliminada y stock restaurado (+1)' };
  }

  async marcarEntradaAsistidaAdmin(idCompra: number) {
    const compra = await this.compraRepo.findOne({ where: { id: idCompra } });
    if (!compra) throw new NotFoundException('Entrada no encontrada');
    if (compra.estadoEntrada === 'asistida') {
      return { message: 'La entrada ya estaba marcada como asistida.' };
    }
    compra.estadoEntrada = 'asistida';
    await this.compraRepo.save(compra);
    return { message: 'Entrada marcada como asistida (validada en puerta).' };
  }

  async reasignarEntradaAdmin(idCompra: number, nuevoIdUsuario: number) {
    const compra = await this.compraRepo.findOne({ where: { id: idCompra } });
    if (!compra) throw new NotFoundException('Entrada no encontrada');

    const usuario = await this.usuarioRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.nombre', 'u.apellidos', 'u.email'])
      .where('u.id = :id', { id: nuevoIdUsuario })
      .getOne();
    if (!usuario) throw new BadRequestException('Usuario destino no encontrado');

    compra.idUsuario = nuevoIdUsuario;
    await this.compraRepo.save(compra);

    const actualizada = await this.compraRepo
      .createQueryBuilder('c')
      .leftJoin('c.usuario', 'u')
      .addSelect(['u.id', 'u.nombre', 'u.apellidos', 'u.email'])
      .where('c.id = :id', { id: idCompra })
      .getOne();

    return {
      message: 'Entrada reasignada al nuevo titular',
      entrada: {
        id: actualizada!.id,
        idUsuario: actualizada!.idUsuario,
        codigoAcceso: actualizada!.codigoAcceso,
        usuario: actualizada!.usuario
          ? {
              id: actualizada!.usuario.id,
              nombre: actualizada!.usuario.nombre,
              apellidos: actualizada!.usuario.apellidos,
              email: actualizada!.usuario.email,
            }
          : null,
      },
    };
  }
}
