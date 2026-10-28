CREATE DATABASE IF NOT EXISTS gestion_becas;
USE gestion_becas;

CREATE TABLE IF NOT EXISTS roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_rol INT,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
);

CREATE TABLE IF NOT EXISTS estudiantes (
    id_estudiante INT PRIMARY KEY, 
    matricula VARCHAR(20) NOT NULL UNIQUE,
    carrera VARCHAR(100),
    FOREIGN KEY (id_estudiante) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS convocatorias (
    id_convocatoria INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS becas (
    id_beca INT AUTO_INCREMENT PRIMARY KEY,
    id_convocatoria INT,
    nombre_beca VARCHAR(150) NOT NULL,
    monto DECIMAL(10,2),
    FOREIGN KEY (id_convocatoria) REFERENCES convocatorias(id_convocatoria) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS solicitudes (
    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT,
    id_beca INT,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'Pendiente',
    FOREIGN KEY (id_estudiante) REFERENCES estudiantes(id_estudiante),
    FOREIGN KEY (id_beca) REFERENCES becas(id_beca)
);

CREATE TABLE IF NOT EXISTS documentos (
    id_documento INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT,
    nombre_documento VARCHAR(150) NOT NULL,
    url_archivo VARCHAR(255) NOT NULL,
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comites (
    id_comite INT AUTO_INCREMENT PRIMARY KEY,
    nombre_comite VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS miembros_comite (
    id_comite INT,
    id_usuario INT, 
    PRIMARY KEY (id_comite, id_usuario),
    FOREIGN KEY (id_comite) REFERENCES comites(id_comite) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evaluaciones (
    id_evaluacion INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT,
    id_usuario INT, 
    puntaje INT,
    comentarios TEXT,
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS resoluciones (
    id_resolucion INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT UNIQUE,
    dictamen VARCHAR(50) NOT NULL, 
    fecha_resolucion DATE NOT NULL,
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notificaciones (
    id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    mensaje TEXT NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);
