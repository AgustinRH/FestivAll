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
import { RolUsuario, Usuario } from '../entities/usuario.entity';
import { CreateCompraDto } from './dto/create-compra.dto';
import { StripeService } from './stripe.service';
import { MailService } from '../mail/mail.service';
import { getPrecioUnitario, aplicaDescuentoUltimasEntradas } from '../eventos/precio.util';
import { eventoEstaActivo } from '../eventos/evento-activo.util';

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
    if (user.rol !== RolUsuario.ADMIN && !user.emailVerificado) {
      throw new ForbiddenException(
        'Debes verificar tu email antes de comprar entradas. Revisa tu bandeja de entrada o solicita un nuevo enlace de verificación.',
      );
    }
    return user;
  }

  private async notifyPurchaseConfirmation(userId: number, compras: Compra[]): Promise<void> {
    if (compras.length === 0) return;
    const user = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!user) return;

    const evento = compras[0].evento;
    const total = compras.reduce((sum, c) => sum + Number(c.totalPago), 0);
    const perfilUrl = `${this.stripeService.getFrontendUrl()}/perfil`;

    try {
      await this.mailService.sendPurchaseConfirmationEmail(user.email, user.nombre, {
        eventoTitulo: evento?.titulo ?? 'Evento',
        cantidad: compras.length,
        total,
        codigos: compras.map((c) => c.codigoAcceso),
        perfilUrl,
      });
    } catch (err) {
      this.logger.error(`No se pudo enviar confirmación de compra a ${user.email}`, err);
    }
  }

  private generarCodigo(): string {
    return `FA-${randomBytes(6).toString('hex').toUpperCase()}`;
  }

  /** Crea entradas y descuenta stock (eventos gratis o tras pago confirmado). */
  async fulfillPurchase(
    userId: number,
    idEvento: number,
    cantidad: number,
    stripeCheckoutSessionId?: string,
  ): Promise<Compra[]> {
    await this.assertEmailVerified(userId);

    if (stripeCheckoutSessionId) {
      const yaProcesada = await this.compraRepo.count({
        where: { stripeCheckoutSessionId },
      });
      if (yaProcesada > 0) {
        return this.compraRepo.find({
          where: { stripeCheckoutSessionId },
          relations: ['evento', 'evento.categoria', 'evento.ubicacion', 'evento.imagenes'],
          order: { id: 'ASC' },
        });
      }
    }

    const evento = await this.eventoRepo.findOne({ where: { id: idEvento } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    if (!eventoEstaActivo(evento)) {
      throw new BadRequestException('Este evento ya ha finalizado y no admite más compras');
    }

    if (evento.stock < cantidad) {
      throw new BadRequestException('No hay suficiente stock disponible');
    }

    const precioUnitario = getPrecioUnitario(evento);
    const entradas = Array.from({ length: cantidad }, () =>
      this.compraRepo.create({
        idUsuario: userId,
        idEvento,
        cantidad: 1,
        totalPago: precioUnitario,
        codigoAcceso: this.generarCodigo(),
        stripeCheckoutSessionId: stripeCheckoutSessionId || undefined,
      }),
    );

    evento.stock -= cantidad;
    await this.eventoRepo.save(evento);
    const guardadas = await this.compraRepo.save(entradas);

    const compras = await this.compraRepo.find({
      where: { id: In(guardadas.map((c) => c.id)) },
      relations: ['evento', 'evento.categoria', 'evento.ubicacion', 'evento.imagenes'],
      order: { id: 'ASC' },
    });

    await this.notifyPurchaseConfirmation(userId, compras);
    return compras;
  }

  async create(userId: number, dto: CreateCompraDto) {
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
    await this.assertEmailVerified(userId);

    const evento = await this.eventoRepo.findOne({ where: { id: dto.idEvento } });
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

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: evento.titulo,
              description: descripcion,
            },
            unit_amount: amountCents,
          },
          quantity: dto.cantidad,
        },
      ],
      metadata: {
        userId: String(userId),
        eventoId: String(dto.idEvento),
        cantidad: String(dto.cantidad),
      },
      success_url: `${frontendUrl}/compras/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/eventos/${dto.idEvento}?pago=cancelado`,
    });

    if (!session.url) {
      throw new BadRequestException('No se pudo iniciar el pago con Stripe');
    }

    return { free: false as const, url: session.url, sessionId: session.id };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const stripe = this.stripeService.getClient();
    const secret = this.stripeService.getWebhookSecret();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException('Firma de webhook inválida');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.processCompletedSession(session);
    }

    return { received: true };
  }

  private async processCompletedSession(session: Stripe.Checkout.Session) {
    if (session.payment_status !== 'paid') return;

    const userId = Number(session.metadata?.userId);
    const eventoId = Number(session.metadata?.eventoId);
    const cantidad = Number(session.metadata?.cantidad);

    if (!userId || !eventoId || !cantidad) {
      throw new BadRequestException('Metadata de sesión incompleta');
    }

    await this.fulfillPurchase(userId, eventoId, cantidad, session.id);
  }

  async verifyCheckoutSession(userId: number, sessionId: string) {
    await this.assertEmailVerified(userId);

    const stripe = this.stripeService.getClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (Number(session.metadata?.userId) !== userId) {
      throw new ForbiddenException('Esta sesión de pago no pertenece a tu cuenta');
    }

    if (session.payment_status === 'paid') {
      const compras = await this.fulfillPurchase(
        userId,
        Number(session.metadata!.eventoId),
        Number(session.metadata!.cantidad),
        session.id,
      );
      return { status: 'paid' as const, compras };
    }

    return { status: session.status ?? 'open', compras: [] };
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
}
