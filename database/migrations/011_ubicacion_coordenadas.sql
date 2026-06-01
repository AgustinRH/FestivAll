-- Coordenadas GPS por ubicación (recinto del evento) para el mapa Leaflet
-- docker compose exec -T mariadb mariadb -u root -p$DB_PASSWORD FestivAll < database/migrations/011_ubicacion_coordenadas.sql

USE FestivAll;

ALTER TABLE ubicacion
ADD COLUMN latitud DECIMAL(10, 8) NULL AFTER provincia,
ADD COLUMN longitud DECIMAL(11, 8) NULL AFTER latitud;

CREATE INDEX idx_ubicacion_coords ON ubicacion (latitud, longitud);

-- Aproximación por localidad (Almería provincia)
UPDATE ubicacion SET latitud = 36.76404700, longitud = -2.61471300 WHERE localidad LIKE '%Roquetas%';
UPDATE ubicacion SET latitud = 36.77060000, longitud = -2.60950000 WHERE localidad LIKE '%Aguadulce%';
UPDATE ubicacion SET latitud = 36.77600000, longitud = -2.81440000 WHERE localidad LIKE '%Ejido%';
UPDATE ubicacion SET latitud = 36.96600000, longitud = -2.20600000 WHERE localidad LIKE '%Níjar%' OR localidad LIKE '%Nijar%';
UPDATE ubicacion SET latitud = 36.74600000, longitud = -2.77700000 WHERE localidad LIKE '%Adra%';
UPDATE ubicacion SET latitud = 37.00200000, longitud = -2.42900000 WHERE localidad LIKE '%Garrucha%';
UPDATE ubicacion SET latitud = 36.83404700, longitud = -2.46371300
  WHERE (localidad LIKE '%Almería%' OR localidad LIKE '%Almeria%') AND latitud IS NULL;
UPDATE ubicacion SET latitud = 36.83810000, longitud = -2.45970000 WHERE latitud IS NULL;
