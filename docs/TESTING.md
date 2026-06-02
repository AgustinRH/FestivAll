# Pruebas unitarias en FestivAll

Guía para escribir, ejecutar y mantener tests en el monorepo (`backend` + `frontend`).

## Resumen

| Parte      | Framework              | Ubicación de los tests        | Comando principal   |
|-----------|------------------------|-------------------------------|---------------------|
| Backend   | Jest + ts-jest         | `backend/src/**/*.spec.ts`    | `npm test`          |
| Frontend  | Jasmine + Karma (Angular) | `frontend/src/**/*.spec.ts` | `npm test`          |
| E2E API   | Jest + Supertest       | `backend/test/*.e2e-spec.ts`  | `npm run test:e2e`  |

Los archivos de prueba están **junto al código** (`*.spec.ts`).  
En `docs/` se documenta **cómo** probar y **qué** conviene cubrir.

## Requisitos

- Node.js 20+
- Dependencias instaladas en cada carpeta:

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Backend (NestJS + Jest)

### Ejecutar

```bash
cd backend
npm test              # una pasada
npm run test:watch    # modo interactivo
npm run test:cov      # informe de cobertura en backend/coverage/
npm run test:e2e      # pruebas HTTP contra la app (carpeta test/)
```

Jest está configurado en `backend/package.json`: busca archivos `*.spec.ts` bajo `src/`.

### Qué probar primero

Prioriza **funciones puras** (sin base de datos ni HTTP):

- `src/eventos/haversine.util.ts` — distancias
- `src/eventos/evento-fechas.util.ts` — validación de fechas
- `src/eventos/evento-activo.util.ts`, `evento-pasado.util.ts`
- `src/auth/roles.util.ts`

Después, **servicios** con dependencias mockeadas (`@nestjs/testing`):

```typescript
const module = await Test.createTestingModule({
  providers: [
    MiService,
    { provide: getRepositoryToken(Evento), useValue: mockRepo },
  ],
}).compile();
```

### Ejemplo: util pura

Ver `backend/src/eventos/haversine.util.spec.ts`.

## Frontend (Angular + Jasmine)

### Ejecutar

**En tu PC (con Chrome instalado):**

```bash
cd frontend
npm test              # Karma en modo watch; abre Chrome
```

**En servidor Linux (sin navegador en pantalla):**

1. Instala Chromium: `sudo apt install chromium-browser` (o `snap install chromium`).
2. Ejecuta el script pensado para CI/servidor:

```bash
cd frontend
npm run test:ci
```

Si falla con `No binary for Chrome`, indica la ruta del ejecutable:

```bash
export CHROME_BIN=/snap/bin/chromium   # o /usr/bin/google-chrome
npm run test:ci
```

`test:ci` usa **ChromeHeadlessCI** con `--no-sandbox` (necesario si corres como `root` en el servidor).

### Qué probar primero

1. **Utils** sin DOM: `core/utils/*.util.ts`, `validators/*.ts`
2. **Componentes** ligeros: crear el componente con `TestBed`, comprobar bindings y métodos públicos
3. **Servicios HTTP**: mockear `HttpClient` con `HttpClientTestingModule`

Evita en unit tests: mapas Leaflet completos, Stripe en vivo, llamadas reales al API.

### Ejemplo: util de slugs

Ver `frontend/src/app/core/utils/evento-slug.util.spec.ts`.

## Convenciones del proyecto

1. **Nombre del archivo:** `nombre-del-modulo.spec.ts` al lado de `nombre-del-modulo.ts`.
2. **Estructura:** `describe` → bloques por función → `it('debería ...')` con expectativas claras.
3. **Un concepto por test:** un `it` = un comportamiento; si falla, el mensaje debe decir qué rompió.
4. **Datos de prueba:** constantes pequeñas en el mismo spec; fixtures grandes solo si se reutilizan.
5. **No duplicar documentación:** este archivo es la guía; en el README principal basta un enlace aquí.

## Cobertura (opcional)

Backend:

```bash
cd backend && npm run test:cov
```

Frontend: Karma puede generar cobertura si se activa en `angular.json` (`codeCoverage: true` en el target `test`). No es obligatorio al empezar; es más útil cuando ya hay una batería estable.

## Añadir un test nuevo (checklist)

1. Identifica el módulo (util, servicio, componente).
2. Crea `*.spec.ts` en la misma carpeta.
3. Importa solo lo necesario; mockea DB, HTTP, `ConfigService`, etc.
4. Ejecuta `npm test` en `backend` o `frontend`.
5. Si el módulo es crítico para negocio, añade una línea en la tabla siguiente.

## Inventario de tests (actualizar al añadir specs)

| Módulo | Ruta del spec | Qué verifica |
|--------|---------------|--------------|
| Haversine | `backend/src/eventos/haversine.util.spec.ts` | Distancia entre coordenadas conocidas |
| Slugs de evento | `frontend/src/app/core/utils/evento-slug.util.spec.ts` | `buildEventoSlug`, `parseEventoIdFromSlug` |
| App shell | `frontend/src/app/app.component.spec.ts` | El componente raíz se instancia |

## Integración en CI (futuro)

Ejemplo para GitHub Actions:

```yaml
- run: cd backend && npm ci && npm test
- run: cd frontend && npm ci && npm test -- --no-watch --browsers=ChromeHeadless
```

## Relación con otras carpetas

- `docs/STRIPE.md` — configuración de pagos (no sustituye tests de `stripe.service`).
- `backend/test/` — pruebas **e2e** de la API, no unitarias.
- `database/` — datos de integración manual; los unit tests no deben depender de MariaDB salvo en e2e.

## Recursos

- [Jest](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Angular Testing](https://angular.dev/guide/testing)
