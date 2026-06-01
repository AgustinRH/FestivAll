-- Rol propietario (cuenta protegida). Ejecutar una vez en BD existente.
ALTER TABLE usuario
  MODIFY rol ENUM('owner', 'admin', 'cliente') DEFAULT 'cliente';

UPDATE usuario SET rol = 'owner' WHERE email = 'agusrubher@gmail.com';
