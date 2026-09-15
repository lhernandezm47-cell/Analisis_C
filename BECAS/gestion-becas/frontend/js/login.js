const loginForm = document.getElementById("loginForm");
const mensaje = document.getElementById("mensaje");

loginForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const usuario = document.getElementById("usuario").value;
    const password = document.getElementById("password").value;

    // Usuario temporal para probar la plataforma
    if (usuario === "admin" && password === "123456") {

        localStorage.setItem("usuario", usuario);

        window.location.href = "dashboard.html";

    } else {

        mensaje.textContent = "Usuario o contraseña incorrectos";
        mensaje.style.color = "red";

    }

});