document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const mensajeDiv = document.getElementById('mensaje');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault(); // Evita que se recargue la página

      // Capturamos lo que escribas en las casillas
      const usuarioInput = document.getElementById('usuario').value;
      const passwordInput = document.getElementById('password').value;

      mensajeDiv.innerHTML = '<p style="color: blue;">Guardando en la base de datos...</p>';

      try {
        // Enviamos los datos a la nueva ruta POST /api/usuarios
        const respuesta = await fetch('http://localhost:3000/api/usuarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nombre: usuarioInput,
            correo: `${usuarioInput}@example.com`, // Correo de prueba
            profesion: passwordInput // Guardamos algo en profesión para probar
          })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
          mensajeDiv.innerHTML = `<p style="color: green; font-weight: bold;">${resultado.mensaje} (ID: ${resultado.id})</p>`;
        } else {
          mensajeDiv.innerHTML = `<p style="color: red;">Error: ${resultado.error}</p>`;
        }
      } catch (error) {
        console.error('Error al guardar:', error);
        mensajeDiv.innerHTML = '<p style="color: red;">No se pudo conectar con el servidor</p>';
      }
    });
  }
});
