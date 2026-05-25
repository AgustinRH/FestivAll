import Stripe from 'stripe';

/** Comisión real de Stripe en euros (desde balance_transaction.fee). */
export async function obtenerComisionStripeRealEur(
  stripe: Stripe,
  checkoutSessionId: string,
): Promise<number | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ['payment_intent.latest_charge.balance_transaction'],
    });

    const pi = session.payment_intent;
    if (!pi || typeof pi === 'string') return null;

    const charge = pi.latest_charge;
    if (!charge || typeof charge === 'string') return null;

    const bt = charge.balance_transaction;
    if (!bt || typeof bt === 'string') return null;

    const feeCents = bt.fee ?? 0;
    return Math.round((feeCents / 100) * 100) / 100;
  } catch {
    return null;
  }
}

/** Precio unitario pagado a partir del total de la sesión (sin llamada extra si ya viene en el objeto). */
export function precioUnitarioDesdeSesion(
  session: Stripe.Checkout.Session,
  cantidad: number,
  precioCatalogoFallback: number,
): number {
  if (session.amount_total != null && session.amount_total > 0 && cantidad > 0) {
    return Math.round((session.amount_total / 100 / cantidad) * 100) / 100;
  }
  return precioCatalogoFallback;
}
