CREATE DATABASE IF NOT EXISTS gestion_becas;

USE gestion_becas;

-- ==========================================
-- BASE DE DATOS - GESTIÓN DE BECAS
-- SPRINT 1
-- ==========================================

CREATE DATABASE IF NOT EXISTS gestion_becas;

USE gestion_becas;


-- ==========================================
-- TABLA: ROLES
-- ==========================================

CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);


-- ==========================================
-- TABLA: USUARIOS
-- ==========================================

CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol_id BIGINT NOT NULL,

    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (rol_id)
        REFERENCES roles(id)
);


-- ==========================================
-- TABLA: ESTUDIANTES
-- ==========================================

CREATE TABLE IF NOT EXISTS estudiantes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    carnet VARCHAR(50) NOT NULL UNIQUE,
    carrera VARCHAR(150),

    CONSTRAINT fk_estudiante_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
);


-- ==========================================
-- TABLA: BECAS
-- ==========================================

CREATE TABLE IF NOT EXISTS becas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(30) NOT NULL
);


-- ==========================================
-- TABLA: SOLICITUDES
-- ==========================================

CREATE TABLE IF NOT EXISTS solicitudes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id BIGINT NOT NULL,
    beca_id BIGINT NOT NULL,
    estado VARCHAR(30) NOT NULL,

    CONSTRAINT fk_solicitud_estudiante
        FOREIGN KEY (estudiante_id)
        REFERENCES estudiantes(id),

    CONSTRAINT fk_solicitud_beca
        FOREIGN KEY (beca_id)
        REFERENCES becas(id)
);