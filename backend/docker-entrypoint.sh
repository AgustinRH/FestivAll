#!/bin/sh
set -e

DB_HOST="${DB_HOST:-mariadb}"
DB_PORT="${DB_PORT:-3306}"

echo "Esperando a MariaDB en ${DB_HOST}:${DB_PORT}..."
while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  sleep 2
done
echo "MariaDB disponible."

if [ -f dist/scripts/seed-admin.js ]; then
  echo "Comprobando usuario administrador..."
  node dist/scripts/seed-admin.js || echo "Aviso: no se pudo ejecutar seed-admin (puede que ya exista)."
fi

echo "Iniciando API NestJS..."
exec node dist/main.js
