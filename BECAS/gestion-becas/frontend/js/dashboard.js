const usuario = localStorage.getItem("usuario");

const usuarioActual = document.getElementById("usuarioActual");

if (!usuario) {

    window.location.href = "index.html";

} else {

    usuarioActual.textContent = usuario;

}


const cerrarSesion = document.getElementById("cerrarSesion");

cerrarSesion.addEventListener("click", function() {

    localStorage.removeItem("usuario");

    window.location.href = "index.html";

});