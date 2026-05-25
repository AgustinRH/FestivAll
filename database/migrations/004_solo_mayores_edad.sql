-- Eventos restringidos a mayores de 18 años
-- docker compose exec mariadb mariadb -u root -p FestivAll < database/migrations/004_solo_mayores_edad.sql

USE FestivAll;

ALTER TABLE evento
ADD COLUMN solo_mayores_edad BOOLEAN NOT NULL DEFAULT FALSE AFTER destacado;
