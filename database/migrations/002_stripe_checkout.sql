-- Ejecutar si la BD ya existía antes de integrar Stripe:
-- docker compose exec mariadb mariadb -u root -p FestivAll < database/migrations/002_stripe_checkout.sql

USE FestivAll;

ALTER TABLE compra
ADD COLUMN stripe_checkout_session_id VARCHAR(255) NULL AFTER codigo_acceso,
ADD INDEX idx_compra_stripe_session (stripe_checkout_session_id);
