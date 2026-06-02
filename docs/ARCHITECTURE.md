# Arquitectura FestivAll

## Vista general

```mermaid
flowchart TB
  subgraph cliente [Cliente]
    Browser[Navegador Angular]
  end
  subgraph api [Backend NestJS]
    REST[Controllers REST]
    SVC[Servicios]
    ORM[TypeORM]
  end
  subgraph datos [Datos y externos]
    DB[(MariaDB)]
    Stripe[Stripe]
    Mail[SMTP]
    Maps[Nominatim / mapas]
  end
  Browser -->|HTTP JSON + JWT| REST
  REST --> SVC
  SVC --> ORM
  ORM --> DB
  SVC --> Stripe
  SVC --> Mail
  SVC --> Maps
```

## Módulos backend

| Módulo | Responsabilidad |
|--------|-----------------|
| `AuthModule` | Registro, login, JWT, verificación email, contraseñas |
| `EventosModule` | CRUD eventos, imágenes, mapa, geocodificación |
| `ComprasModule` | Checkout Stripe, entradas gratis, webhook, admin entradas |
| `ValoracionesModule` | Opiniones, moderación, elegibilidad |
| `CatalogoModule` | Categorías y ubicaciones |
| `UsuariosModule` / `ClientesModule` | Administración |
| `SitemapModule` | XML SEO |

## Capas frontend

| Capa | Ubicación | Rol |
|------|-----------|-----|
| Páginas | `src/app/pages/` | Rutas y pantallas |
| Compartidos | `src/app/shared/` | Navbar, cards, formularios reutilizables |
| Core | `src/app/core/` | Servicios HTTP, guards, modelos, utils |
| Entornos | `src/environments/` | URL de API |

## Autenticación

```mermaid
sequenceDiagram
  participant U as Usuario
  participant F as Angular AuthService
  participant A as POST /auth/login
  participant API as API protegida
  U->>F: email + password
  F->>A: credenciales
  A-->>F: JWT + user
  F->>F: localStorage token
  F->>API: Authorization Bearer
```

## Compra de entradas (pago)

```mermaid
sequenceDiagram
  participant U as Usuario
  participant F as ComprasService
  participant API as Nest Compras
  participant S as Stripe
  U->>F: checkout evento de pago
  F->>API: POST /compras/checkout
  API->>S: crear sesión
  S-->>U: redirect Checkout
  S->>API: webhook checkout.session.completed
  API->>API: confirmar compra en BD
```

## Documentación generada

| Herramienta | Salida | Contenido |
|-------------|--------|-----------|
| Swagger | `http://localhost:3000/api/docs` | Endpoints, DTOs, auth JWT |
| Compodoc | `frontend/documentation/` | Componentes, servicios, diagramas |
| TSDoc en código | — | Lógica compleja en utils/servicios |
