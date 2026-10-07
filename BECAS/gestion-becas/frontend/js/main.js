// Función para consumir los datos desde la API local
async function cargarUsuarios() {
  try {
    const respuesta = await fetch('http://localhost:3000/api/datos');
    const usuarios = await respuesta.json();
    
    console.log('Datos recibidos de la API:', usuarios);

    // Si tienes un contenedor o tabla en tu HTML con id="tabla-usuarios" o id="contenedor-datos",
    // puedes renderizar los usuarios aquí. Por ejemplo:
    const contenedor = document.getElementById('contenedor-datos');
    if (contenedor) {
      contenedor.innerHTML = '';
      usuarios.forEach(usuario => {
        contenedor.innerHTML += `
          <div class="usuario-card">
            <h3>${usuario.nombre}</h3>
            <p><strong>Correo:</strong> ${usuario.correo}</p>
            <p><strong>Profesión:</strong> ${usuario.profesion}</p>
          </div>
        `;
      });
    }
  } catch (error) {
    console.error('Error al conectar con la API:', error);
  }
}

// Ejecutar la función en cuanto cargue la página
document.addEventListener('DOMContentLoaded', cargarUsuarios);
