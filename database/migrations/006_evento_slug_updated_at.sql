-- Slug SEO y fecha de última modificación en eventos
-- docker compose exec -T mariadb mariadb -u root -p"" FestivAll < database/migrations/006_evento_slug_updated_at.sql

USE FestivAll;

ALTER TABLE evento
ADD COLUMN slug VARCHAR(180) NULL AFTER titulo,
ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER solo_mayores_edad;

CREATE UNIQUE INDEX idx_evento_slug ON evento (slug);

-- Los slugs de eventos existentes se rellenan al arrancar el backend (backfill en EventosService).
