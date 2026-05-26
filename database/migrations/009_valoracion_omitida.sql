-- Usuario declina valorar un evento (no volver a mostrar el formulario)
-- docker compose exec -T mariadb mariadb -u root -p$DB_PASSWORD FestivAll < database/migrations/009_valoracion_omitida.sql

USE FestivAll;

CREATE TABLE valoracion_omitida (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_evento INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_valoracion_omitida_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT fk_valoracion_omitida_evento FOREIGN KEY (id_evento)
        REFERENCES evento (id) ON DELETE CASCADE,
    CONSTRAINT uq_valoracion_omitida_usuario_evento UNIQUE (id_usuario, id_evento)
);

CREATE INDEX idx_valoracion_omitida_usuario ON valoracion_omitida (id_usuario);
