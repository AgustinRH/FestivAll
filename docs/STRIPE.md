# Pagos con Stripe en FestivAll

Guía paso a paso para activar pagos reales (modo prueba) en local y en producción.

## 1. Crear cuenta y obtener claves (gratis en modo test)

1. Regístrate en [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register).
2. Activa el **modo prueba** (interruptor “Test mode” arriba a la derecha).
3. Ve a **Developers → API keys**.
4. Copia la **Secret key** (`sk_test_...`).

## 2. Configurar claves y modo test/live

Usa `STRIPE_MODE=test` en local y `STRIPE_MODE=live` en producción. Así mantienes ambos juegos de claves sin borrar el modo prueba:

```env
STRIPE_MODE=test
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
STRIPE_TAX_RATE_ID_TEST=txr_...

STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
STRIPE_TAX_RATE_ID_LIVE=txr_...
```

También puedes seguir usando `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (legacy); deben coincidir con el `STRIPE_MODE` activo.

**Desarrollo local** (`backend/.env`):

```env
STRIPE_MODE=test
STRIPE_SECRET_KEY_TEST=sk_test_tu_clave_aqui
STRIPE_WEBHOOK_SECRET_TEST=whsec_lo_obtendras_en_el_paso_4
FRONTEND_URL=http://localhost:4200
```

**Docker Compose** (`.env` en la raíz):

```env
STRIPE_MODE=test
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
FRONTEND_URL=http://localhost
```

En producción: `FRONTEND_URL=https://tu-dominio.com`

### IVA (tipo impositivo)

1. En Stripe: **Configuración → Impuestos** (o al crear el impuesto en el producto).
2. Copia el **ID del tipo impositivo** (`txr_...`).
3. Añádelo al `.env`:

```env
STRIPE_TAX_RATE_ID=txr_1TayvCLO2zXhVKm5n878GCo7
```

En cada Checkout se aplica ese IVA sobre el precio de la entrada (el precio del evento en la web es **sin IVA**; Stripe muestra base + impuesto al pagar). El importe guardado en `total_pago` tras el pago es el **total cobrado por entrada** (con IVA).

Reinicia el backend o `docker compose up -d --build` tras cambiar variables.

## 3. Migración de base de datos

Si la base de datos ya existía antes de Stripe:

```bash
docker compose exec mariadb mariadb -u root -p"" FestivAll < database/migrations/002_stripe_checkout.sql
```

(En local sin Docker, usa tu cliente MariaDB con el mismo SQL.)

## 4. Webhook (imprescindible para confirmar compras)

Stripe avisa al servidor cuando el pago termina. Sin webhook, el dinero puede cobrarse pero las entradas no se generan de forma fiable.

### Desarrollo local (Stripe CLI)

1. **Instalar la CLI en WSL/Linux** (si `stripe` no existe):

```bash
# Sin sudo: binario en ~/.local/bin
mkdir -p ~/.local/bin
curl -sL "$(curl -s https://api.github.com/repos/stripe/stripe-cli/releases/latest | grep -oP 'https://[^"]+linux_x86_64.tar.gz')" -o /tmp/stripe.tgz
tar -xzf /tmp/stripe.tgz -C /tmp stripe && mv /tmp/stripe ~/.local/bin/
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
stripe version
```

   O con apt (requiere sudo): [documentación oficial](https://stripe.com/docs/stripe-cli).

2. Inicia sesión: `stripe login`
3. Con el backend en el puerto 3000:

```bash
stripe listen --forward-to localhost:3000/compras/webhook/stripe
```

4. La CLI mostrará un **webhook signing secret** (`whsec_...`). Cópialo en `STRIPE_WEBHOOK_SECRET` y reinicia el backend.

Si usas el proxy de Angular (`npm start`, API en `/api`):

```bash
stripe listen --forward-to localhost:4200/api/compras/webhook/stripe
```

### Producción (Docker / EC2)

1. En Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. URL: `https://tu-dominio.com/api/compras/webhook/stripe`
3. Evento: `checkout.session.completed`
4. Copia el **Signing secret** en `STRIPE_WEBHOOK_SECRET` del servidor.

## 5. Probar un pago

1. Usuario registrado y logueado en la web.
2. Evento con **precio > 0** y stock disponible.
3. Detalle del evento → **COMPRAR** → **Pagar con tarjeta**.
4. En Stripe Checkout usa una tarjeta de prueba:

| Campo | Valor |
|--------|--------|
| Número | `4242 4242 4242 4242` |
| Fecha | Cualquier futura |
| CVC | Cualquier 3 dígitos |

5. Tras pagar, vuelves a `/compras/exito` y verás los códigos de entrada.

**Eventos con precio 0 €** no pasan por Stripe; la entrada se confirma al instante.

## 6. Flujo técnico (resumen)

```
Usuario → POST /compras/checkout → Stripe Checkout (página de pago)
       → Pago OK
       → Webhook checkout.session.completed → crea filas en `compra` y baja `stock`
       → Redirección a /compras/exito → GET /compras/checkout/verificar (por si el webhook tarda)
```

Las entradas **solo se crean cuando Stripe confirma el pago** (webhook o verificación de sesión).

## 7. Pasar a pagos reales

1. Completa la verificación de negocio en Stripe.
2. En el servidor: `STRIPE_MODE=live` y claves `STRIPE_*_LIVE`.
3. Configura el webhook de producción con la URL HTTPS real (`/api/compras/webhook/stripe`).
4. Mantén las claves test en `.env` para seguir desarrollando en local con `STRIPE_MODE=test`.

## 7b. Metadata, aforo y cierre de caja

- Cada checkout guarda en Stripe `metadata`: `id_pedido_interno`, `local_id`, `userId`, `eventoId`, `cantidad`. Si el servidor cae tras el pago, el webhook puede reconciliar el pedido.
- En `checkout.session.completed` el endpoint responde **200 OK al instante**; el procesamiento va en background. El stock se descuenta con un `UPDATE` atómico (sin bloqueo pesimista largo). Si no hay aforo, el **reembolso** se lanza en async (`setImmediate`).
- El cierre de caja intenta leer la comisión **real** de cada sesión vía `balance_transaction.fee`; si falla, usa la estimación de `STRIPE_FEE_*`.
- **Cierre de caja** (admin): botón “Cierre caja” en cada evento del panel, o por consola:

```bash
cd backend && npm run cierre-caja -- 3
```

Variables de liquidación en `.env`:

```env
FESTIVALL_COMMISSION_PERCENT=10
STRIPE_FEE_PERCENT=1.5
STRIPE_FEE_FIXED_EUR=0.25
```

## 8. Problemas frecuentes

| Síntoma | Solución |
|---------|----------|
| “Pagos no configurados” | Falta `STRIPE_SECRET_KEY` en `.env` |
| Pago OK pero sin entradas | Webhook no configurado o `STRIPE_WEBHOOK_SECRET` incorrecto |
| Error de firma webhook | Secret distinto al de `stripe listen` o del endpoint en Dashboard |
| Cancel URL incorrecta | Revisa `FRONTEND_URL` |

## 9. Comisiones

En modo test no se cobra dinero real. En producción Stripe aplica comisión por transacción (consulta [pricing](https://stripe.com/es/pricing)).
