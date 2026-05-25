import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type StripeMode = 'test' | 'live';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;
  private readonly mode: StripeMode;

  constructor(private config: ConfigService) {
    this.mode = this.resolveMode();

    const stripeKey =
      this.mode === 'live'
        ? this.config.get<string>('STRIPE_SECRET_KEY_LIVE')?.trim()
        : this.config.get<string>('STRIPE_SECRET_KEY_TEST')?.trim();

    const key = stripeKey || this.legacySecretKeyFallback();

    if (key) {
      this.stripe = new Stripe(key);
      this.logger.log(`Stripe inicializado (STRIPE_MODE=${this.mode})`);
    }
  }

  getMode(): StripeMode {
    return this.mode;
  }

  isConfigured(): boolean {
    return !!this.stripe;
  }

  getClient(): Stripe {
    if (!this.stripe) {
      const varName =
        this.mode === 'live' ? 'STRIPE_SECRET_KEY_LIVE' : 'STRIPE_SECRET_KEY_TEST';
      throw new ServiceUnavailableException(
        `Pagos no configurados: define ${varName} con STRIPE_MODE=${this.mode}.`,
      );
    }
    return this.stripe;
  }

  getWebhookSecret(): string {
    const secret =
      this.mode === 'live'
        ? this.config.get<string>('STRIPE_WEBHOOK_SECRET_LIVE')?.trim()
        : this.config.get<string>('STRIPE_WEBHOOK_SECRET_TEST')?.trim();

    const resolved = secret || this.config.get<string>('STRIPE_WEBHOOK_SECRET')?.trim();
    if (!resolved) {
      throw new ServiceUnavailableException(
        `STRIPE_WEBHOOK_SECRET_${this.mode.toUpperCase()} no configurado`,
      );
    }
    return resolved;
  }

  getFrontendUrl(): string {
    return (this.config.get<string>('FRONTEND_URL') || 'http://localhost:4200').replace(/\/$/, '');
  }

  getTaxRateId(): string | undefined {
    const modeKey = this.mode === 'live' ? 'STRIPE_TAX_RATE_ID_LIVE' : 'STRIPE_TAX_RATE_ID_TEST';
    const id =
      this.config.get<string>(modeKey)?.trim() ||
      this.config.get<string>('STRIPE_TAX_RATE_ID')?.trim();
    return id || undefined;
  }

  getFestivallCommissionPercent(): number {
    const raw = this.config.get<string>('FESTIVALL_COMMISSION_PERCENT');
    const n = raw != null ? Number(raw) : 10;
    return Number.isFinite(n) && n >= 0 ? n : 10;
  }

  getStripeFeeEstimate(): { percent: number; fixedEur: number } {
    const percent = Number(this.config.get<string>('STRIPE_FEE_PERCENT') ?? 1.5);
    const fixedEur = Number(this.config.get<string>('STRIPE_FEE_FIXED_EUR') ?? 0.25);
    return {
      percent: Number.isFinite(percent) && percent >= 0 ? percent : 1.5,
      fixedEur: Number.isFinite(fixedEur) && fixedEur >= 0 ? fixedEur : 0.25,
    };
  }

  private resolveMode(): StripeMode {
    const raw = (this.config.get<string>('STRIPE_MODE') || 'test').toLowerCase();
    return raw === 'live' ? 'live' : 'test';
  }

  /** Solo si faltan las claves por modo (compatibilidad). */
  private legacySecretKeyFallback(): string | undefined {
    const legacy = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (!legacy) return undefined;

    if (this.mode === 'test' && legacy.startsWith('sk_live_')) {
      this.logger.warn('STRIPE_MODE=test: usa STRIPE_SECRET_KEY_TEST, no una clave live.');
    }
    if (this.mode === 'live' && legacy.startsWith('sk_test_')) {
      this.logger.warn('STRIPE_MODE=live: usa STRIPE_SECRET_KEY_LIVE, no una clave test.');
    }
    return legacy;
  }
}
