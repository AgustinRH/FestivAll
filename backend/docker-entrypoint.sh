#!/bin/sh
set -e

DB_HOST="${DB_HOST:-mariadb}"
DB_PORT="${DB_PORT:-3306}"

echo "Esperando a MariaDB en ${DB_HOST}:${DB_PORT}..."
while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  sleep 2
done
echo "MariaDB disponible."

echo "Iniciando API NestJS..."
exec node dist/main.js
