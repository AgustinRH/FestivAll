#!/usr/bin/env bash
# Prueba de humo (carga ligera) SOLO en el stack Docker local.
# No usa festivall.club ni endpoints de escritura (register, checkout, etc.).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Comprobando servicios Docker..."
if ! docker compose ps --status running 2>/dev/null | grep -q festivall-api; then
  echo "Levantando stack local..."
  docker compose up -d
  sleep 5
fi

CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/eventos?limit=1" || true)
if [ "$CODE" != "200" ]; then
  echo "Error: la API local no responde 200 (got $CODE). Revisa: docker compose logs backend"
  exit 1
fi

echo "==> Ejecutando k6 smoke (5 usuarios, 30s, solo GET públicos)..."
docker run --rm --network proyecto-x_festivall-net \
  -v "$ROOT/load-tests:/scripts" \
  -e BASE_URL=http://festivall-web \
  -e API_PREFIX=/api \
  grafana/k6 run /scripts/k6-smoke.js

echo "==> Listo. Para más carga local (opcional): BASE_URL=http://localhost k6 run load-tests/k6-load.js"
