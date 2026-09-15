USE PruebaDB;

CREATE TABLE Personas (
    IdPersona INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Edad INT,
    Correo VARCHAR(100)
);
SHOW TABLES;
INSERT INTO Personas (Nombre, Edad, Correo)
VALUES ('Juan', 20, 'juan@gmail.com');

SELECT * FROM Personas;