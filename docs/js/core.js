'use strict';

/* ===== Configuración de Supabase (Cliente Frontend) ===== */
const SUPABASE_URL = 'https://ykpxznpqqrgqxdzrxhj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcHh6bnBxcmdncXhkenJ4aGoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNTE2MzYwMzM5MSwiZXhwIjo2NzExN3d3NTA1MDU5MzE3OThfInpY4NwWqJwY1SrPXUNHBeJee';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ===== Utilidades ===== */
const LIMITE = 10000;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const uid = p => p + Math.random().toString(36).slice(2, 7).toUpperCase();
const now = () => new Date().toISOString();
const fmt = d => new Date(d).toLocaleDateString('es-GT');
const Q = n => 'Q' + Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2 });

const seed = () => ({
    cfg: { fallo: false },
    comites: [], convs: [], ests: [], sols: [], users: [], evals: [], notifs: [], audit: []
});

class Store {
    static #i;
    static get() { return Store.#i ??= new Store(); }
    constructor() { this.k = 'becas_v2'; this.d = JSON.parse(localStorage.getItem(this.k) || 'null') || seed(); this.save(); }
    save() { localStorage.setItem(this.k, JSON.stringify(this.d)); }
}

const D = () => Store.get().d, S = () => Store.get().save();

class Bus {
    static h = {};
    static on(e, f) { (Bus.h[e] ??= []).push(f); }
    static emit(e, p) { (Bus.h[e] || []).forEach(f => { try { f(p); } catch (x) { console.error('Observer', e, x); } }); }
}

/* ===== Auditoría en Supabase (tabla 'auditoria') ===== */
const hash = s => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(16); };
const SECRETO = /pass|token|secret|clave|i/;
const limpiar = o => JSON.parse(JSON.stringify(o ?? null, (k, v) => SECRETO.test(k) ? undefined : v));

/* ==========================================================================
   3. GESTIÓN DE AUTENTICACIÓN (Requerido por ui.js)
   ========================================================================== */
class Auth {
    static current() {
        // Recupera el usuario activo de la sesión o localStorage si tu app lo usa
        return JSON.parse(localStorage.getItem('usuario_actual') || 'null');
    }
    static login(user) {
        localStorage.setItem('usuario_actual', JSON.stringify(user));
    }
    static logout() {
        localStorage.removeItem('usuario_actual');
    }
}

/* ==========================================================================
   1. REGISTRO DE INTENTOS DE ACCESO (tabla 'intentos_acceso')
   ========================================================================== */
async function registrarIntentoAcceso(username, exitoso) {
    try {
        const { data, error } = await supabaseClient
            .from('intentos_acceso')
            .insert([
                { 
                    usuario: username, 
                    exitoso: exitoso, 
                    fecha: new Date().toISOString() 
                }
            ])
            .select();

        if (error) {
            console.error('Error al registrar intento de acceso:', error.message);
        } else {
            console.log('Intento de acceso registrado:', data);
        }
    } catch (err) {
        console.error('Excepción en registrarIntentoAcceso:', err);
    }
}

/* ==========================================================================
   2. REGISTRO SINCRONIZADO DE NOTIFICACIONES Y CANALES
   ========================================================================== */
async function registrarNotificacionConEnvios(solicitudId, estudianteId, evento, mensajeTexto, simularFalloEmail = false) {
    try {
        // A. Insertar la notificación principal
        const { data: notifData, error: notifError } = await supabaseClient
            .from('notificaciones')
            .insert([
                { 
                    solicitud_id: solicitudId,
                    estudiante_id: estudianteId,
                    evento: evento || 'CAMBIO_ESTADO',
                    mensaje: mensajeTexto,
                    fecha: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (notifError) {
            console.error('Error al insertar en notificaciones:', notifError.message);
            return null;
        }

        // B. Insertar los detalles en notificacion_envios asociados al ID recién obtenido
        const estadoEmail = simularFalloEmail ? 'fallo' : 'exito';
        const errorEmail = simularFalloEmail ? 'Servidor SMTP no disponible' : null;

        const canalesEnvio = [
            { 
                notificacion_id: notifData.id, 
                canal: 'app', 
                resultado: 'exito', 
                error_detalles: null 
            },
            { 
                notificacion_id: notifData.id, 
                canal: 'email', 
                resultado: estadoEmail, 
                error_detalles: errorEmail 
            }
        ];

        const { data: enviosData, error: enviosError } = await supabaseClient
            .from('notificacion_envios')
            .insert(canalesEnvio)
            .select();

        if (enviosError) {
            console.error('Error al insertar en notificacion_envios:', enviosError.message);
        } else {
            console.log('Notificación y canales registrados:', { notifData, enviosData });
        }

        return notifData;

    } catch (err) {
        console.error('Excepción inesperada en registrarNotificacionConEnvios:', err);
        return null;
    }
}