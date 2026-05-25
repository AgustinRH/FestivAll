# FestivAll

Aplicación web para descubrir y comprar entradas de eventos en la provincia de Almería (rock, festivales, reggaeton, techno, etc.).

## Stack

- **Frontend:** Angular 19
- **Backend:** NestJS 11
- **Base de datos:** MariaDB

## Estructura

```
proyecto-x/
├── backend/              # API REST NestJS (+ Dockerfile)
├── frontend/             # SPA Angular (+ Dockerfile + nginx)
├── database/             # schema.sql y seed.sql
├── docker-compose.yml    # Producción (BD + API + web)
└── docker-compose.dev.yml  # Solo MariaDB para dev
```

## Requisitos

- Node.js 20+
- MariaDB 10+

## Producción con Docker (todo en uno)

Levanta **MariaDB + API + web (nginx)** con un solo comando:

```bash
cp .env.example .env
# Edita .env: JWT_SECRET, DB_PASSWORD, APP_PORT, STRIPE_* (pagos)

docker compose up -d --build
```

Stripe puede ir en `.env` (raíz) o en `backend/.env`; con Docker se cargan ambos.

Abre **http://localhost** (o el puerto definido en `APP_PORT`).

| Servicio   | Contenedor      | Descripción                          |
|------------|-----------------|--------------------------------------|
| `frontend` | festivall-web   | Angular compilado + nginx (puerto 80) |
| `backend`  | festivall-api   | NestJS en modo producción            |
| `mariadb`  | festivall-db    | Base de datos + schema/seed inicial  |

El usuario administrador **no** se crea automáticamente al reiniciar Docker. Créalo una vez con el script (ver abajo) o desde el panel de usuarios si ya tienes otro admin.

Comandos útiles:

```bash
docker compose ps          # estado
docker compose logs -f     # logs
docker compose down        # parar
docker compose down -v     # parar y borrar datos BD
```

---

## Desarrollo local

### 1. Base de datos

**Solo MariaDB en Docker (desarrollo):**

```bash
docker compose -f docker-compose.dev.yml up -d
```

**O cliente local:**

```bash
sudo apt install mariadb-client-core
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Editar .env con credenciales de MariaDB
npm install
npm run start:dev
```

Crear usuario administrador:

```bash
cd backend
npx ts-node -r tsconfig-paths/register src/scripts/seed-admin.ts
```

Credenciales admin por defecto:
- Email: `info@festivall.club`
- Contraseña: `Admin1234!` (solo al crear el admin por primera vez; cámbiala en producción)

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

Abre http://localhost:4200

> **WSL + Windows:** el frontend usa un proxy (`/api` → `localhost:3000`) para evitar problemas de conexión. Reinicia `npm start` tras cambios en `proxy.conf.json`.

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión usuario |
| `/register` | Registro de usuario |
| `/` | Inicio (eventos populares) |
| `/eventos` | Listado con buscador y filtros |
| `/eventos/:id` | Detalle y compra de entradas |
| `/perfil` | Datos, historial y cambio de contraseña |
| `/compras/exito` | Confirmación tras pago Stripe |
| `/festivall-admin` | Login admin (estilo wp-admin) |
| `/festivall-admin/panel` | CRUD de eventos |

## Pagos con Stripe

Los eventos de pago usan **Stripe Checkout**. Guía completa: **[docs/STRIPE.md](docs/STRIPE.md)**.

Resumen: cuenta en [stripe.com](https://stripe.com) (modo test) → claves en `backend/.env` → migración `002_stripe_checkout.sql` → webhook con Stripe CLI en local.

## API (puerto 3000)

- `POST /auth/register` · `POST /auth/login` · `POST /auth/admin/login`
- `GET /auth/profile` · `PUT /auth/change-password`
- `GET /eventos` · `GET /eventos/popular` · `GET /eventos/:id`
- `POST /compras/checkout` · `GET /compras/checkout/verificar` · `POST /compras/webhook/stripe`
- `POST /compras` (solo eventos gratis) · `GET /compras/mis-compras`
- `GET /catalogo/categorias` · `GET /catalogo/ubicaciones`
- CRUD admin: `POST/PUT/DELETE /eventos` (requiere JWT admin)
