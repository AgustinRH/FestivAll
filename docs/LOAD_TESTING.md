# Pruebas de estrés y carga — FestivAll

Guía para medir cómo aguanta la aplicación bajo muchas peticiones simultáneas.

## Qué probar (y qué no)

| Capa | Herramienta recomendada | Ejemplo |
|------|-------------------------|---------|
| **API REST** (NestJS) | [k6](https://k6.io/) | `GET /api/eventos`, catálogo, detalle |
| **Sitio completo** (HTML + assets) | k6 o [Gatling](https://gatling.io/) | `GET https://festivall.club/` |
| **Navegador real** | [Playwright](https://playwright.dev/) + trazas | Flujos críticos (pocos usuarios virtuales) |

**No hagas carga masiva en producción** (`festivall.club`) sin plan:

- Puede saturar **MariaDB**, **Stripe**, **SMTP** y el propio servidor.
- `POST /auth/register`, webhooks o checkout pueden generar emails, pagos de prueba o bloqueos.

**Recomendación:** prueba en **local** (`docker compose`) o en un **clon/staging** con datos de prueba.

---

## Herramienta recomendada: k6

k6 usa scripts en JavaScript, genera métricas claras (latencia p95, errores, RPS) y encaja bien con tu API detrás de `/api/`.

### Instalación (Linux)

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt update && sudo apt install k6
```

O con Docker (sin instalar):

```bash
docker run --rm -i grafana/k6 run - <load-tests/k6-smoke.js
```

---

## Scripts incluidos en el repo

Carpeta [`load-tests/`](../load-tests/):

| Script | Objetivo |
|--------|----------|
| `k6-smoke.js` | Comprobación ligera (pocos usuarios, 30 s) |
| `k6-load.js` | Carga gradual hasta ~50 VUs (ajustable) |

### Variables de entorno

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `BASE_URL` | `http://localhost` | Origen (con nginx local en puerto 80) |
| `API_PREFIX` | `/api` | Prefijo de la API en nginx |

**Local con Docker** (forma más segura, recomendada):

```bash
cd /path/to/app
./load-tests/run-local-smoke.sh
```

El script comprueba que el stack esté arriba, valida `GET /api/eventos` y lanza k6 **solo** contra la red Docker interna (`festivall-web`), sin tocar producción.

Manual equivalente:

```bash
docker compose up -d
export DOCKER_NETWORK="${DOCKER_NETWORK:-festivall_festivall-net}"
docker run --rm --network "$DOCKER_NETWORK" \
  -v "$(pwd)/load-tests:/scripts" \
  -e BASE_URL=http://festivall-web -e API_PREFIX=/api \
  grafana/k6 run /scripts/k6-smoke.js
```

**Solo API en dev** (backend en 3000, sin prefijo `/api`):

```bash
BASE_URL=http://127.0.0.1:3000 API_PREFIX="" k6 run load-tests/k6-smoke.js
```

**Staging / producción** (úsalo con cuidado):

```bash
BASE_URL=https://festivall.club k6 run load-tests/k6-smoke.js
```

### Prueba de carga más exigente

```bash
BASE_URL=http://localhost k6 run load-tests/k6-load.js
```

Edita en el script `stages` para subir o bajar usuarios virtuales (VUs).

---

## Métricas que mirar

Durante y después del test:

1. **k6:** `http_req_duration` (p95, p99), `http_req_failed`, `iterations/s`.
2. **Servidor:** `docker stats`, CPU/RAM de `festivall-api`, `festivall-db`, `festivall-web`.
3. **Logs:** `docker compose logs -f backend` (errores 5xx, timeouts TypeORM).
4. **MariaDB:** conexiones activas, consultas lentas.

Umbrales orientativos para lectura pública (ajústalos a tu máquina):

- p95 &lt; 500 ms en `GET /eventos` con poca carga.
- Tasa de error &lt; 1 % en smoke test.
- Si p95 sube mucho o hay 502/503 de nginx → cuello de botella (BD, CPU, pool de conexiones).

---

## Otras herramientas (alternativas)

| Herramienta | Cuándo usarla |
|-------------|----------------|
| **Apache Bench (`ab`)** | Un solo endpoint, prueba rápida: `ab -n 1000 -c 10 https://festivall.club/api/eventos` |
| **wrk** | HTTP muy rápido, pocos scripts |
| **Artillery** | YAML, equipos que prefieren Node |
| **Locust** | Python, UI web para VUs |

Para FestivAll, **k6 en la API** suele ser el mejor punto de partida; el Angular estático aguanta mucho en nginx; el límite suele estar en **Nest + MariaDB**.

---

## Escenarios útiles para FestivAll

1. **Home / listado:** `GET /eventos`, `GET /eventos/popular`, `GET /catalogo/categorias`.
2. **Detalle:** `GET /eventos/{id-slug}` (usa un id real de tu BD).
3. **Mapa:** `GET /eventos/mapa?lat=36.83&lng=-2.46&radio=25`.
4. **Con JWT (poco volumen):** login una vez en `setup()`, luego `GET /auth/profile` o `GET /compras/mis-compras`.

Evita en bucle masivo: `POST /auth/register`, `POST /compras/checkout`, `POST /compras/webhook/stripe`.

---

## Monitorizar durante el test

```bash
# Recursos contenedores
docker stats festivall-api festivall-db festivall-web

# Errores API
docker compose logs -f --tail=100 backend
```

---

## Relación con otras guías

- Pruebas unitarias: [TESTING.md](./TESTING.md)
- Arquitectura: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Documentación API (local): Swagger en `http://localhost:3000/docs` con `SWAGGER_ENABLED=true`
