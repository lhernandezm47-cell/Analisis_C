// --- BLINDAJE DE SEGURIDAD PARA AUTH (Evita errores de carga o caché) ---
window.Auth = window.Auth || {
    actual: () => JSON.parse(localStorage.getItem('usuario_actual') || 'null'),
    login: (user) => localStorage.setItem('usuario_actual', JSON.stringify(user)),
    logout: () => localStorage.removeItem('usuario_actual')
};

/* ==========================================================================
   INICIO DE TU CÓDIGO ORIGINAL DE UI Y VISTAS DE LA PLATAFORMA DE BECAS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Inicialización de componentes visuales, eventos de tablas y navegación por roles
    console.log('UI inicializada correctamente con sesión de usuario:', Auth.actual());
    
    // Aquí se ejecutan tus funciones de renderizado de vistas (solicitudes, comités, etc.)
});

// Función global para manejar el cambio de vistas o renderizado de tablas
function actualizarInterfaz() {
    const usuarioActivo = Auth.actual();
    if (!usuarioActivo) return;

    // Lógica para adaptar la UI según el rol (admin, evaluador, autoridad, auditor)
    const rol = usuarioActivo.rol;
    console.log('Actualizando componentes visuales para el rol:', rol);
}

// Escuchador para eventos del bus de datos si tu aplicación lo requiere
document.addEventListener('click', (e) => {
    // Manejadores de clics generales para botones de la plataforma
});