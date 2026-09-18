CREATE DATABASE IF NOT EXISTS gestion_becas;
USE gestion_becas;

-- 1. Tabla de Roles
CREATE TABLE IF NOT EXISTS roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Tabla de Usuarios (Base para Estudiantes y Evaluadores)
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_rol INT,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
);

-- 3. Tabla de Estudiantes
CREATE TABLE IF NOT EXISTS estudiantes (
    id_estudiante INT PRIMARY KEY, -- Mismo ID de su usuario
    matricula VARCHAR(20) NOT NULL UNIQUE,
    carrera VARCHAR(100),
    FOREIGN KEY (id_estudiante) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- 4. Tabla de Convocatorias
CREATE TABLE IF NOT EXISTS convocatorias (
    id_convocatoria INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL
);

-- 5. Tabla de Becas (Depende de Convocatorias)
CREATE TABLE IF NOT EXISTS becas (
    id_beca INT AUTO_INCREMENT PRIMARY KEY,
    id_convocatoria INT,
    nombre_beca VARCHAR(150) NOT NULL,
    monto DECIMAL(10,2),
    FOREIGN KEY (id_convocatoria) REFERENCES convocatorias(id_convocatoria) ON DELETE CASCADE
);

-- 6. Tabla de Solicitudes (Une Estudiante y Beca)
CREATE TABLE IF NOT EXISTS solicitudes (
    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT,
    id_beca INT,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'Pendiente',
    FOREIGN KEY (id_estudiante) REFERENCES estudiantes(id_estudiante),
    FOREIGN KEY (id_beca) REFERENCES becas(id_beca)
);

-- 7. Tabla de Documentos (Depende de Solicitud)
CREATE TABLE IF NOT EXISTS documentos (
    id_documento INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT,
    nombre_documento VARCHAR(150) NOT NULL,
    url_archivo VARCHAR(255) NOT NULL,
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE
);

-- 8. Tabla de Comités
CREATE TABLE IF NOT EXISTS comites (
    id_comite INT AUTO_INCREMENT PRIMARY KEY,
    nombre_comite VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255)
);

-- 9. Tabla de Miembros del Comité (Relaciona Usuarios/Evaluadores con Comités)
CREATE TABLE IF NOT EXISTS miembros_comite (
    id_comite INT,
    id_usuario INT, -- Evaluador
    PRIMARY KEY (id_comite, id_usuario),
    FOREIGN KEY (id_comite) REFERENCES comites(id_comite) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- 10. Tabla de Evaluaciones (Depende de Solicitud)
CREATE TABLE IF NOT EXISTS evaluaciones (
    id_evaluacion INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT,
    id_usuario INT, -- Evaluador que califica
    puntaje INT,
    comentarios TEXT,
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- 11. Tabla de Resoluciones (Depende de Solicitud)
CREATE TABLE IF NOT EXISTS resoluciones (
    id_resolucion INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT UNIQUE,
    dictamen VARCHAR(50) NOT NULL, -- Ej: Aprobada, Rechazada
    fecha_resolucion DATE NOT NULL,
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE
);

-- 12. Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    mensaje TEXT NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);
