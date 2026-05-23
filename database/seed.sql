USE FestivAll;

INSERT INTO categoria (nombre_categoria) VALUES
('Rock'), ('Festivales'), ('Reggaeton'), ('Techno'), ('Flamenco'), ('Indie');

INSERT INTO ubicacion (direccion, localidad, provincia) VALUES
('Paseo Marítimo s/n', 'Roquetas de Mar', 'Almería'),
('Plaza de la Constitución 1', 'Almería', 'Almería'),
('Av. del Mediterráneo 200', 'El Ejido', 'Almería'),
('Calle Real 45', 'Níjar', 'Almería'),
('Recinto Ferial', 'Vera', 'Almería');

-- Usuario admin: ejecutar backend/src/scripts/seed-admin.ts tras crear la BD

INSERT INTO evento (id_categoria, id_ubicacion, titulo, descripcion, fecha_inicio, fecha_fin, hora_inicio, hora_fin, precio, stock, destacado) VALUES
(2, 1, 'Festival del Sol 2026', 'El mayor festival de música de la costa almeriense. Tres días de rock, indie y electrónica junto al mar.', '2026-07-15', '2026-07-17', '18:00:00', '04:00:00', 45.00, 500, TRUE),
(4, 2, 'Techno Night Almería', 'Noche de techno con DJs internacionales en el centro de Almería.', '2026-06-20', NULL, '23:00:00', '06:00:00', 25.00, 200, TRUE),
(3, 3, 'Reggaeton Beach Party', 'Fiesta reggaeton en la playa de El Ejido con artistas invitados.', '2026-08-10', NULL, '20:00:00', '03:00:00', 20.00, 350, TRUE),
(1, 4, 'Rock en las Alpujarras', 'Concierto de rock alternativo en un entorno único de Níjar.', '2026-05-25', NULL, '21:00:00', '01:00:00', 18.00, 150, FALSE),
(5, 5, 'Noche Flamenca Vera', 'Espectáculo flamenco con cena opcional en Vera.', '2026-09-05', NULL, '21:30:00', '00:30:00', 30.00, 100, FALSE);

INSERT INTO imagen (id_evento, url, es_principal) VALUES
(1, 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800', TRUE),
(2, 'https://images.unsplash.com/photo-1571266023766-ef4f5f25ed8a?w=800', TRUE),
(3, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800', TRUE),
(4, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800', TRUE),
(5, 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800', TRUE);
