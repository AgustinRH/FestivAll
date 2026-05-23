import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;

  constructor(private config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new Stripe(key);
    }
  }

  isConfigured(): boolean {
    return !!this.stripe;
  }

  getClient(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Los pagos con tarjeta no están configurados. Añade STRIPE_SECRET_KEY en el servidor.',
      );
    }
    return this.stripe;
  }

  getWebhookSecret(): string {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('STRIPE_WEBHOOK_SECRET no configurado');
    }
    return secret;
  }

  getFrontendUrl(): string {
    return (this.config.get<string>('FRONTEND_URL') || 'http://localhost:4200').replace(/\/$/, '');
  }
}
