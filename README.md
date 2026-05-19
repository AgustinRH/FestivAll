# FestivAll

Aplicación web para descubrir y comprar entradas de eventos en la provincia de Almería (rock, festivales, reggaeton, techno, etc.).

## Stack

- **Frontend:** Angular 19
- **Backend:** NestJS 11
- **Base de datos:** MariaDB

## Estructura

```
proyecto-x/
├── backend/          # API REST NestJS
├── frontend/         # SPA Angular
└── database/         # schema.sql y seed.sql
```

## Requisitos

- Node.js 20+
- MariaDB 10+

## Configuración

### 1. Base de datos

**Opción A – Docker (recomendado en WSL, no requiere `mysql` instalado):**

```bash
docker compose up -d
```

Esto levanta MariaDB en el puerto 3306 y ejecuta automáticamente `schema.sql` y `seed.sql`.

**Opción B – Cliente local:**

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
- Email: `admin@festivall.es`
- Contraseña: `Admin123!`

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

Abre http://localhost:4200

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión usuario |
| `/register` | Registro de usuario |
| `/` | Inicio (eventos populares) |
| `/eventos` | Listado con buscador y filtros |
| `/eventos/:id` | Detalle y compra de entradas |
| `/perfil` | Datos, historial y cambio de contraseña |
| `/festivall-admin` | Login admin (estilo wp-admin) |
| `/festivall-admin/panel` | CRUD de eventos |

## API (puerto 3000)

- `POST /auth/register` · `POST /auth/login` · `POST /auth/admin/login`
- `GET /auth/profile` · `PUT /auth/change-password`
- `GET /eventos` · `GET /eventos/popular` · `GET /eventos/:id`
- `POST /compras` · `GET /compras/mis-compras`
- `GET /catalogo/categorias` · `GET /catalogo/ubicaciones`
- CRUD admin: `POST/PUT/DELETE /eventos` (requiere JWT admin)
