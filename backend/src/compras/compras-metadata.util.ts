import { randomBytes } from 'crypto';
import { Ubicacion } from '../entities/ubicacion.entity';

/** Identificador interno único por intento de compra (metadata Stripe). */
export function generarIdPedidoInterno(
  eventoId: number,
  userId: number,
): string {
  const sufijo = randomBytes(3).toString('hex').toUpperCase();
  return `ENTRADA_${eventoId}_U${userId}_${Date.now()}_${sufijo}`;
}

/** Slug estable del local para metadata (p. ej. ubi_3_roquetas_de_mar). */
export function buildLocalId(ubicacion: Ubicacion): string {
  const slug = ubicacion.localidad
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `ubi_${ubicacion.idUbicacion}_${slug || 'sin_nombre'}`.slice(0, 80);
}

export type CheckoutStripeMetadata = {
  userId: string;
  eventoId: string;
  cantidad: string;
  id_pedido_interno: string;
  local_id: string;
};

export function buildCheckoutMetadata(params: {
  userId: number;
  eventoId: number;
  cantidad: number;
  idPedidoInterno: string;
  localId: string;
}): CheckoutStripeMetadata {
  return {
    userId: String(params.userId),
    eventoId: String(params.eventoId),
    cantidad: String(params.cantidad),
    id_pedido_interno: params.idPedidoInterno,
    local_id: params.localId,
  };
}
