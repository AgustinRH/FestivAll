-- Ejecutar si la BD ya existía antes de añadir el campo destacado:
-- docker compose exec mariadb mariadb -u root -p FestivAll < database/migrations/001_add_destacado.sql

USE FestivAll;

ALTER TABLE evento
ADD COLUMN destacado BOOLEAN NOT NULL DEFAULT FALSE AFTER stock;

UPDATE evento SET destacado = TRUE WHERE id IN (1, 2, 3);
