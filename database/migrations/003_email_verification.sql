-- Verificación de email en registro
-- docker compose exec mariadb mariadb -u root -p FestivAll < database/migrations/003_email_verification.sql

USE FestivAll;

ALTER TABLE usuario
ADD COLUMN email_verificado BOOLEAN NOT NULL DEFAULT FALSE AFTER rol,
ADD COLUMN email_verification_token VARCHAR(64) NULL AFTER email_verificado,
ADD COLUMN email_verification_expires DATETIME NULL AFTER email_verification_token;

-- Usuarios ya existentes (incl. admin) pueden seguir entrando
UPDATE usuario SET email_verificado = TRUE WHERE email_verificado = FALSE;
