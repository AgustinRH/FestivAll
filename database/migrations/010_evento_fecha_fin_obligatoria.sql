-- fecha_fin obligatoria: un día = misma fecha que inicio
-- docker compose exec -T mariadb mariadb -u root -p$DB_PASSWORD FestivAll < database/migrations/010_evento_fecha_fin_obligatoria.sql

USE FestivAll;

UPDATE evento SET fecha_fin = fecha_inicio WHERE fecha_fin IS NULL;

ALTER TABLE evento
MODIFY COLUMN fecha_fin DATE NOT NULL;
