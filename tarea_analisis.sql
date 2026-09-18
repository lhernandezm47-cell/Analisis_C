CREATE DATABASE IF NOT EXISTS tarea_analisis;
USE tarea_analisis;

-- Crear tabla de prueba
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50),
    correo VARCHAR(50)
);

-- Insertar un registro
INSERT INTO usuarios (nombre, correo) 
VALUES ('Juan Pérez', 'juan@example.com');

-- Consultar la tabla
SELECT * FROM usuarios;