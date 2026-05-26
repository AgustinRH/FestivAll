-- Valoraciones verificadas + estado de asistencia en entradas
-- docker compose exec -T mariadb mariadb -u root -p$DB_PASSWORD FestivAll < database/migrations/008_valoraciones_entrada_asistida.sql

USE FestivAll;

ALTER TABLE compra
ADD COLUMN estado_entrada ENUM('pendiente', 'asistida') NOT NULL DEFAULT 'pendiente'
AFTER codigo_acceso;

CREATE TABLE valoracion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_evento INT NOT NULL,
    puntuacion TINYINT NOT NULL,
    comentario TEXT NULL,
    verificada BOOLEAN NOT NULL DEFAULT TRUE,
    estado_moderacion ENUM('pendiente', 'aprobado', 'rechazado') NOT NULL DEFAULT 'pendiente',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_valoracion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT fk_valoracion_evento FOREIGN KEY (id_evento)
        REFERENCES evento (id) ON DELETE CASCADE,
    CONSTRAINT uq_valoracion_usuario_evento UNIQUE (id_usuario, id_evento),
    CONSTRAINT chk_valoracion_puntuacion CHECK (puntuacion >= 1 AND puntuacion <= 5)
);

CREATE INDEX idx_valoracion_evento_estado ON valoracion (id_evento, estado_moderacion);
