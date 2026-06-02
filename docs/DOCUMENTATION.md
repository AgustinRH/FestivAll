# Documentación del proyecto FestivAll

Guía para generar y mantener la documentación técnica del monorepo.

## Resumen de herramientas

| Stack | Herramienta | Qué documenta | Dónde verlo |
|-------|-------------|---------------|-------------|
| **NestJS** | `@nestjs/swagger` (OpenAPI) | Endpoints, DTOs, query params, JWT | Local: `http://localhost:3000/docs` · Prod: `https://festivall.club/api/docs` |
| **Angular** | [Compodoc](https://compodoc.app/) | Componentes, servicios, módulos, grafos | `frontend/documentation/` (generado) |
| **Ambos** | TSDoc / JSDoc en código | Lógica interna, contratos no obvios | IDE + Comentarios en Swagger (plugin) |

Documentación de arquitectura y flujos: **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## NestJS — OpenAPI (Swagger)

### Arrancar la API con documentación

```bash
cd backend
npm install
npm run start:dev
```

Abre en el navegador:

- **Swagger UI (local):** [http://localhost:3000/docs](http://localhost:3000/docs)
- **Swagger UI (producción, tras desplegar):** `https://festivall.club/api/docs`
- **JSON OpenAPI:** `/docs-json` en local, `/api/docs-json` en producción

### Autenticación en Swagger

1. `POST /auth/login` o `POST /auth/admin/login` con email y contraseña.
2. Copia el `access_token` de la respuesta.
3. Pulsa **Authorize** en Swagger UI y pega: `Bearer <token>` (solo el token; Swagger añade el esquema).

### Desactivar en producción

En el entorno de producción, define:

```env
SWAGGER_ENABLED=false
```

Opcional: `SWAGGER_SERVER_URL=https://api.tudominio.com` para la URL base del spec.

### Cómo se mantiene

- **Controladores:** `@ApiTags`, `@ApiOperation`, `@ApiQuery` en `src/**/*.controller.ts`.
- **Auth:** decoradores `ApiJwtAuth()` / `ApiAdminAuth()` en `src/common/swagger.decorators.ts`.
- **DTOs:** el plugin de Swagger en `nest-cli.json` genera esquemas desde `class-validator`.
- **Comentarios:** JSDoc encima de clases DTO (`/** ... */`) aparece en la descripción del schema.

Ejemplo en un DTO:

```typescript
/** Credenciales de inicio de sesión */
export class LoginDto {
  @IsEmail()
  email: string;
  // ...
}
```

---

## Angular — Compodoc

### Generar documentación estática

```bash
cd frontend
npm install
npm run doc
```

Salida: carpeta `frontend/documentation/` (abre `documentation/index.html`).

### Servidor local con recarga

```bash
npm run doc:serve
```

Por defecto escucha en `http://127.0.0.1:8080`.

### Qué incluye Compodoc

- Árbol de **módulos** y **componentes**
- **Servicios** inyectables y sus dependencias
- **Grafos** de dependencias y cobertura de rutas (si está configurado)
- Página extra **Guías** desde `docs/compodoc/`

Configuración: `frontend/.compodocrc.json` y `frontend/tsconfig.doc.json`.

### Storybook (opcional, no instalado)

Para documentar componentes de forma visual e interactiva:

```bash
npx storybook@latest init
```

Útil para `shared/` (cards, formularios, carrusel). No es obligatorio si Compodoc cubre tu necesidad actual.

---

## TSDoc / JSDoc en el código

Usa comentarios `/** ... */` cuando la función no se explica sola:

- Reglas de negocio (elegibilidad valoraciones, cierre de caja).
- Integraciones (Stripe test/live, webhooks).
- Algoritmos (Haversine, slugs SEO, validación de fechas).

**Ubicaciones con TSDoc añadido o recomendado:**

| Archivo | Tema |
|---------|------|
| `backend/src/auth/auth.service.ts` | Registro, verificación, JWT |
| `backend/src/compras/stripe.service.ts` | Modo test/live y claves |
| `backend/src/auth/roles.util.ts` | Roles admin |
| `backend/src/eventos/*.util.ts` | Fechas, distancias, estado evento |
| `frontend/src/app/core/utils/evento-slug.util.ts` | URLs SEO |
| `frontend/src/app/core/services/auth.service.ts` | Sesión en cliente |

En VS Code / Cursor, al pasar el ratón sobre una función documentada verás el texto del TSDoc.

---

## Pruebas

| Tipo | Guía |
|------|------|
| Unitarias | **[TESTING.md](./TESTING.md)** |
| Carga / estrés | **[LOAD_TESTING.md](./LOAD_TESTING.md)** |

---

## Estructura de `docs/`

```
docs/
├── DOCUMENTATION.md   ← esta guía
├── ARCHITECTURE.md    ← diagramas y módulos
├── TESTING.md         ← Jest / Karma
├── STRIPE.md          ← pagos
└── compodoc/          ← markdown incluido en Compodoc
```

---

## Checklist al añadir una feature

- [ ] Endpoint nuevo → `@ApiTags` + `@ApiOperation` (+ `@ApiJwtAuth` si aplica)
- [ ] DTO nuevo → validadores `class-validator` + comentario de clase
- [ ] Componente/servicio Angular relevante → TSDoc breve si la lógica es compleja
- [ ] Regenerar Compodoc antes de release: `npm run doc`
- [ ] Probar Swagger: endpoint visible y “Try it out” funciona con JWT
