// ======================================================
// SCHOLARLINK - MÓDULO DE CONVOCATORIAS
// ======================================================


// ======================================================
// VERIFICAR USUARIO
// ======================================================

document.addEventListener("DOMContentLoaded", function () {

    const usuario = localStorage.getItem("usuario");

    const nombreUsuario = document.getElementById("nombreUsuario");

    // Si no existe una sesión activa,
    // regresar al inicio de sesión
    if (!usuario) {

        window.location.href = "index.html";

        return;
    }

    // Mostrar nombre del usuario
    if (nombreUsuario) {

        nombreUsuario.textContent = usuario;

    }

});


// ======================================================
// CERRAR SESIÓN
// ======================================================

function cerrarSesion() {

    localStorage.removeItem("usuario");

    localStorage.removeItem("token");

    localStorage.removeItem("usuarioLogueado");

    window.location.href = "index.html";

}


// ======================================================
// ELEMENTOS DE FILTRO
// ======================================================

const buscar = document.getElementById("buscar");

const categoria = document.getElementById("categoria");

const estado = document.getElementById("estado");

const tarjetas = document.querySelectorAll(".convocatoria-card");

const contador = document.getElementById("contador");


// ======================================================
// FILTRAR CONVOCATORIAS
// ======================================================

function filtrarConvocatorias() {

    const texto = buscar
        ? buscar.value.toLowerCase().trim()
        : "";

    const categoriaSeleccionada = categoria
        ? categoria.value
        : "todas";

    const estadoSeleccionado = estado
        ? estado.value
        : "todos";


    let cantidad = 0;


    tarjetas.forEach(function (tarjeta) {

        const tituloElemento =
            tarjeta.querySelector("h3");

        const titulo = tituloElemento
            ? tituloElemento.textContent.toLowerCase()
            : "";


        const institucionElemento =
            tarjeta.querySelector(".institucion");

        const institucion = institucionElemento
            ? institucionElemento.textContent.toLowerCase()
            : "";


        const categoriaTarjeta =
            tarjeta.dataset.categoria || "";


        const estadoTarjeta =
            tarjeta.dataset.estado || "";


        // Buscar por nombre o institución
        const coincideTexto =
            titulo.includes(texto) ||
            institucion.includes(texto);


        // Filtrar categoría
        const coincideCategoria =
            categoriaSeleccionada === "todas" ||
            categoriaTarjeta === categoriaSeleccionada;


        // Filtrar estado
        const coincideEstado =
            estadoSeleccionado === "todos" ||
            estadoTarjeta === estadoSeleccionado;


        // Mostrar u ocultar
        if (
            coincideTexto &&
            coincideCategoria &&
            coincideEstado
        ) {

            tarjeta.style.display = "";

            cantidad++;

        } else {

            tarjeta.style.display = "none";

        }

    });


    // Actualizar contador
    if (contador) {

        if (cantidad === 0) {

            contador.textContent =
                "No se encontraron convocatorias";

        } else if (cantidad === 1) {

            contador.textContent =
                "1 convocatoria encontrada";

        } else {

            contador.textContent =
                cantidad + " convocatorias encontradas";

        }

    }

}


// ======================================================
// EVENTOS DE LOS FILTROS
// ======================================================

if (buscar) {

    buscar.addEventListener(
        "input",
        filtrarConvocatorias
    );

}


if (categoria) {

    categoria.addEventListener(
        "change",
        filtrarConvocatorias
    );

}


if (estado) {

    estado.addEventListener(
        "change",
        filtrarConvocatorias
    );

}


// ======================================================
// MOSTRAR DETALLES
// ======================================================

function verDetalles(tipo) {

    const modal =
        document.getElementById("modalDetalles");

    const contenido =
        document.getElementById("contenidoModal");


    if (!modal || !contenido) {

        return;

    }


    let html = "";


    // ==================================================
    // BECA EXCELENCIA ACADÉMICA
    // ==================================================

    if (tipo === "excelencia") {

        html = `

            <span class="modal-etiqueta">
                Excelencia académica
            </span>

            <h2>
                Beca Excelencia Académica
            </h2>

            <p>
                Programa dirigido a estudiantes con alto
                rendimiento académico y compromiso con
                sus estudios.
            </p>


            <h3>
                Beneficios
            </h3>

            <ul>

                <li>
                    Cobertura completa de matrícula.
                </li>

                <li>
                    Apoyo para materiales educativos.
                </li>

                <li>
                    Acompañamiento académico.
                </li>

            </ul>


            <h3>
                Requisitos
            </h3>

            <ul>

                <li>
                    Promedio académico destacado.
                </li>

                <li>
                    Ser estudiante activo.
                </li>

                <li>
                    Presentar documentación académica.
                </li>

            </ul>


            <p>
                <strong>
                    Fecha de cierre:
                </strong>

                30/10/2026
            </p>


            <button
                class="btn-postular"
                onclick="postular('Beca Excelencia Académica')"
            >
                Postularme
            </button>

        `;

    }


    // ==================================================
    // BECA INNOVACIÓN TECNOLÓGICA
    // ==================================================

    else if (tipo === "tecnologia") {

        html = `

            <span class="modal-etiqueta">
                Tecnología
            </span>

            <h2>
                Beca Innovación Tecnológica
            </h2>

            <p>
                Oportunidad para estudiantes interesados
                en programación, tecnología e innovación.
            </p>


            <h3>
                Beneficios
            </h3>

            <ul>

                <li>
                    Apoyo económico.
                </li>

                <li>
                    Acceso a recursos tecnológicos.
                </li>

                <li>
                    Capacitaciones especializadas.
                </li>

            </ul>


            <h3>
                Requisitos
            </h3>

            <ul>

                <li>
                    Ser estudiante activo.
                </li>

                <li>
                    Interés demostrado en tecnología.
                </li>

                <li>
                    Presentar proyecto o propuesta.
                </li>

            </ul>


            <p>

                <strong>
                    Fecha de cierre:
                </strong>

                15/11/2026

            </p>


            <button
                class="btn-postular"
                onclick="postular('Beca Innovación Tecnológica')"
            >
                Postularme
            </button>

        `;

    }


    // ==================================================
    // BECA TALENTO DEPORTIVO
    // ==================================================

    else if (tipo === "deporte") {

        html = `

            <span class="modal-etiqueta">
                Deportes
            </span>

            <h2>
                Beca Talento Deportivo
            </h2>

            <p>
                Programa destinado a estudiantes con
                trayectoria deportiva destacada.
            </p>


            <h3>
                Beneficios
            </h3>

            <ul>

                <li>
                    Apoyo educativo.
                </li>

                <li>
                    Material deportivo.
                </li>

                <li>
                    Programas de entrenamiento.
                </li>

            </ul>


            <h3>
                Requisitos
            </h3>

            <ul>

                <li>
                    Ser estudiante activo.
                </li>

                <li>
                    Presentar trayectoria deportiva.
                </li>

                <li>
                    Presentar constancias deportivas.
                </li>

            </ul>


            <p>

                <strong>
                    Fecha de cierre:
                </strong>

                20/12/2026

            </p>


            <button
                class="btn-postular"
                onclick="postular('Beca Talento Deportivo')"
            >
                Postularme
            </button>

        `;

    }


    // ==================================================
    // BECA DESARROLLO COMUNITARIO
    // ==================================================

    else if (tipo === "social") {

        html = `

            <span class="modal-etiqueta">
                Desarrollo comunitario
            </span>

            <h2>
                Beca Desarrollo Comunitario
            </h2>

            <p>
                Programa para estudiantes comprometidos
                con proyectos de beneficio comunitario.
            </p>


            <h3>
                Beneficios
            </h3>

            <ul>

                <li>
                    Apoyo económico.
                </li>

                <li>
                    Capacitaciones.
                </li>

                <li>
                    Acompañamiento para proyectos sociales.
                </li>

            </ul>


            <h3>
                Requisitos
            </h3>

            <ul>

                <li>
                    Ser estudiante activo.
                </li>

                <li>
                    Participar en actividades comunitarias.
                </li>

                <li>
                    Presentar propuesta de proyecto.
                </li>

            </ul>


            <p>

                <strong>
                    Fecha de cierre:
                </strong>

                05/12/2026

            </p>


            <button
                class="btn-postular"
                onclick="postular('Beca Desarrollo Comunitario')"
            >
                Postularme
            </button>

        `;

    }


    // ==================================================
    // MOSTRAR MODAL
    // ==================================================

    contenido.innerHTML = html;

    modal.style.display = "flex";

    document.body.style.overflow = "hidden";

}


// ======================================================
// CERRAR MODAL
// ======================================================

function cerrarModal() {

    const modal =
        document.getElementById("modalDetalles");


    if (modal) {

        modal.style.display = "none";

    }


    document.body.style.overflow = "";

}


// ======================================================
// POSTULARSE
// ======================================================

function postular(nombreBeca) {

    alert(
        "Has seleccionado la convocatoria:\n\n" +
        nombreBeca +
        "\n\n" +
        "El módulo de postulaciones se conectará " +
        "posteriormente con la base de datos."
    );

}


// ======================================================
// CERRAR MODAL AL HACER CLIC FUERA
// ======================================================

window.addEventListener("click", function (event) {

    const modal =
        document.getElementById("modalDetalles");


    if (
        modal &&
        event.target === modal
    ) {

        cerrarModal();

    }

});


// ======================================================
// TECLA ESC PARA CERRAR MODAL
// ======================================================

document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {

        cerrarModal();

    }

});


// ======================================================
// FILTRO INICIAL
// ======================================================

document.addEventListener("DOMContentLoaded", function () {

    filtrarConvocatorias();

});
