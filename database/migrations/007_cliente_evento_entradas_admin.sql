-- Organizadores (clientes) y vínculo obligatorio con evento
-- docker compose exec -T mariadb mariadb -u root -p"" FestivAll < database/migrations/007_cliente_evento_entradas_admin.sql

USE FestivAll;

CREATE TABLE cliente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    nombre_fiscal VARCHAR(200) NULL,
    cif VARCHAR(20) NULL,
    email_contacto VARCHAR(120) NULL,
    telefono VARCHAR(40) NULL,
    notas TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO cliente (nombre, activo) VALUES ('Organizador genérico', TRUE);

ALTER TABLE evento
ADD COLUMN id_cliente INT NOT NULL DEFAULT 1 AFTER id_ubicacion,
ADD CONSTRAINT fk_evento_cliente FOREIGN KEY (id_cliente) REFERENCES cliente (id) ON DELETE RESTRICT;

UPDATE evento SET id_cliente = 1 WHERE id_cliente IS NULL OR id_cliente = 0;

ALTER TABLE evento MODIFY id_cliente INT NOT NULL;
