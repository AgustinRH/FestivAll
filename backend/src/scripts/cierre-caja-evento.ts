/**
 * Cierre de caja por consola.
 * Uso: npm run cierre-caja -- <idEvento>
 * Ejemplo: npm run cierre-caja -- 3
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ComprasService } from '../compras/compras.service';

if (process.env.NODE_ENV !== 'production') {
  config({ path: resolve(__dirname, '../../.env') });
  config({ path: resolve(__dirname, '../../../.env') });
}

async function main() {
  const idArg = process.argv[2];
  const idEvento = idArg ? Number(idArg) : NaN;
  if (!Number.isFinite(idEvento) || idEvento < 1) {
    console.error('Uso: npm run cierre-caja -- <idEvento>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const compras = app.get(ComprasService);

  try {
    const r = await compras.calcularCierreCaja(idEvento);
    console.log('\n=== CIERRE DE CAJA — FestivAll ===\n');
    console.log(`Evento: ${r.eventoTitulo} (ID ${r.eventoId})`);
    console.log(`Local: ${r.localNombre}`);
    console.log(`Modo Stripe: ${r.stripeMode}`);
    console.log('—'.repeat(40));
    console.log(
      `Entradas emitidas: ${r.entradasVendidas} (${r.entradasGratuitas} gratuitas)`,
    );
    console.log(`Transacciones Stripe: ${r.transaccionesPagadas}`);
    console.log(`Total recaudado: ${r.totalRecaudado.toFixed(2)} €`);
    const stripeLabel = r.comisionStripeEsEstimada ? 'est.' : 'real';
    console.log(
      `Comisión Stripe (${stripeLabel}, ${r.transaccionesConFeeReal}/${r.transaccionesPagadas} con fee real): -${r.comisionStripe.toFixed(2)} €`,
    );
    console.log(
      `Comisión FestivAll (${r.festivallComisionPct}%): -${r.comisionFestivall.toFixed(2)} €`,
    );
    console.log('—'.repeat(40));
    console.log(
      `TOTAL A TRANSFERIR AL LOCAL: ${r.totalTransferirLocal.toFixed(2)} €`,
    );
    console.log(`\n${r.nota}\n`);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

void main();
