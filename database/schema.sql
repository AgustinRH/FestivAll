CREATE DATABASE IF NOT EXISTS FestivAll;
USE FestivAll;

CREATE TABLE categoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_categoria VARCHAR(50) NOT NULL
);

CREATE TABLE ubicacion (
    id_ubicacion INT AUTO_INCREMENT PRIMARY KEY,
    direccion VARCHAR(255) NOT NULL,
    localidad VARCHAR(100) NOT NULL,
    provincia VARCHAR(100) NOT NULL DEFAULT 'Almería'
);

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

CREATE TABLE usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'cliente') DEFAULT 'cliente',
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(64) NULL,
    email_verification_expires DATETIME NULL,
    password_reset_token VARCHAR(64) NULL,
    password_reset_expires DATETIME NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE evento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_categoria INT NOT NULL,
    id_ubicacion INT NOT NULL,
    id_cliente INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NULL UNIQUE,
    descripcion TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    hora_inicio TIME,
    hora_fin TIME,
    precio DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL,
    destacado BOOLEAN NOT NULL DEFAULT FALSE,
    solo_mayores_edad BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_evento_categoria FOREIGN KEY (id_categoria)
        REFERENCES categoria (id) ON DELETE CASCADE,
    CONSTRAINT fk_evento_ubicacion FOREIGN KEY (id_ubicacion)
        REFERENCES ubicacion (id_ubicacion) ON DELETE CASCADE,
    CONSTRAINT fk_evento_cliente FOREIGN KEY (id_cliente)
        REFERENCES cliente (id) ON DELETE RESTRICT
);

CREATE TABLE imagen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento INT NOT NULL,
    url VARCHAR(255) NOT NULL,
    es_principal BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_imagen_evento FOREIGN KEY (id_evento)
        REFERENCES evento (id) ON DELETE CASCADE
);

CREATE TABLE compra (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_evento INT NOT NULL,
    cantidad INT NOT NULL,
    total_pago DECIMAL(10, 2) NOT NULL,
    fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    codigo_acceso VARCHAR(100) NOT NULL UNIQUE,
    stripe_checkout_session_id VARCHAR(255) NULL,
    CONSTRAINT fk_compra_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT fk_compra_evento FOREIGN KEY (id_evento)
        REFERENCES evento (id) ON DELETE CASCADE
);
