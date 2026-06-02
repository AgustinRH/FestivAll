-- Tipos de imagen: principal, cartelera, galería (hasta 5 por evento)
USE FestivAll;

ALTER TABLE imagen
  ADD COLUMN IF NOT EXISTS tipo ENUM('principal', 'cartelera', 'galeria') NOT NULL DEFAULT 'galeria' AFTER url,
  ADD COLUMN IF NOT EXISTS orden TINYINT UNSIGNED NULL AFTER tipo;

UPDATE imagen SET tipo = 'principal', orden = NULL WHERE es_principal = 1;
UPDATE imagen SET tipo = 'galeria', orden = 0 WHERE es_principal = 0 OR tipo = 'galeria';
