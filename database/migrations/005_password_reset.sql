-- Recuperación de contraseña por enlace en email
-- docker compose exec mariadb mariadb -u root -p FestivAll < database/migrations/005_password_reset.sql

USE FestivAll;

ALTER TABLE usuario
ADD COLUMN password_reset_token VARCHAR(64) NULL AFTER email_verification_expires,
ADD COLUMN password_reset_expires DATETIME NULL AFTER password_reset_token;
