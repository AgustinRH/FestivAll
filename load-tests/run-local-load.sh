#!/usr/bin/env bash
# Prueba de carga gradual (hasta 50 VUs) SOLO en Docker local.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOCKER_NETWORK="${DOCKER_NETWORK:-festivall_festivall-net}"

if ! docker compose ps --status running 2>/dev/null | grep -q festivall-api; then
  docker compose up -d
  sleep 5
fi

CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/eventos?limit=1" || true)
if [ "$CODE" != "200" ]; then
  echo "Error: API local no responde (HTTP $CODE)"
  exit 1
fi

echo "==> k6 load (~2m30s, hasta 50 usuarios virtuales, solo GET públicos)..."
echo "    DOCKER_NETWORK=$DOCKER_NETWORK"
docker run --rm --network "$DOCKER_NETWORK" \
  -v "$ROOT/load-tests:/scripts" \
  -e BASE_URL=http://festivall-web \
  -e API_PREFIX=/api \
  grafana/k6 run /scripts/k6-load.js
