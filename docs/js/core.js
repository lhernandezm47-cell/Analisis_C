'use strict';

/* ===== Configuración de Supabase (Cliente Frontend) =====
   IMPORTANTE: copia estos dos valores EXACTOS desde
   Supabase → Project Settings → API
   (Project URL y la clave "anon public").
   La URL anterior daba ERR_NAME_NOT_RESOLVED porque no existe ese dominio. */
const SUPABASE_URL = 'https://ykpxznpqqrgqgxdzrxhj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcHh6bnBxcXJncWd4ZHpyeGhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNTA4MzgsImV4cCI6MjEwODcyNjgzOH0.J8FQaw9Zj-29JzHP0z7wx4NqWjqwYX1SrPXuNNHBjeE';

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
    constructor() {
        this.k = 'becas_v2';
        this.d = JSON.parse(localStorage.getItem(this.k) || 'null') || seed();
        this.save();
    }
    save() { localStorage.setItem(this.k, JSON.stringify(this.d)); }
}

const D = () => Store.get().d, S = () => Store.get().save();

class Bus {
    static h = {};
    static on(e, f) { (Bus.h[e] ??= []).push(f); }
    static emit(e, p) {
        (Bus.h[e] || []).forEach(f => {
            try { f(p); } catch (x) { console.error('Observer', e, x); }
        });
    }
}

/* ===== Auditoría ===== */
const hash = s => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(16); };
// CORREGIDO: antes era /pass|token|secret|clave|i/ y borraba cualquier clave con la letra "i"
const SECRETO = /pass|token|secret|clave/i;
const limpiar = o => JSON.parse(JSON.stringify(o ?? null, (k, v) => SECRETO.test(k) ? undefined : v));

/* ==========================================================================
   REGISTRO DE INTENTOS DE ACCESO (tabla 'intentos_acceso')
   ========================================================================== */
async function registrarIntentoAcceso(username, exitoso) {
    try {
        const { error } = await supabaseClient
            .from('intentos_acceso')
            .insert([{ usuario: username, exitoso: exitoso, fecha: new Date().toISOString() }]);

        if (error) {
            console.error('Error al registrar intento de acceso:', error.message);
        }
    } catch (err) {
        console.error('Excepción en registrarIntentoAcceso:', err);
    }
}

/* ==========================================================================
   GESTIÓN DE AUTENTICACIÓN
   ========================================================================== */
class Auth {
    static actual() {
        return JSON.parse(localStorage.getItem('usuario_actual') || 'null');
    }

    // Valida contra la tabla 'usuarios' de Supabase.
    // AJUSTA 'password' y 'estudiante_id' si en tu tabla se llaman distinto.
    static async login(username, password, tipo) {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('usuario', username)
            .maybeSingle();

        if (error) {
            throw new Error('No se pudo conectar con el servidor: ' + error.message);
        }

        if (!data || data.password !== password) {
            registrarIntentoAcceso(username, false);
            throw new Error('Usuario o contraseña incorrectos');
        }

        const user = {
            id: 'u' + data.id,
            usuario: data.usuario,
            nombre: data.nombre,
            rol: data.rol,
            est: data.estudiante_id ? 'e' + data.estudiante_id : undefined
        };

        localStorage.setItem('usuario_actual', JSON.stringify(user));
        registrarIntentoAcceso(username, true);
        return user;
    }

    // CORREGIDO: ui.js llama a Auth.salir(), antes solo existía logout()
    static salir() {
        localStorage.removeItem('usuario_actual');
    }

    static logout() { Auth.salir(); }
}

window.Auth = Auth;

/* ==========================================================================
   REGISTRO SINCRONIZADO DE NOTIFICACIONES Y CANALES
   ========================================================================== */
async function registrarNotificacionConEnvios(solicitudId, estudianteId, evento, mensajeTexto, simularFalloEmail = false) {
    try {
        const { data: notifData, error: notifError } = await supabaseClient
            .from('notificaciones')
            .insert([{
                solicitud_id: solicitudId,
                estudiante_id: estudianteId,
                evento: evento || 'CAMBIO_ESTADO',
                mensaje: mensajeTexto,
                fecha: new Date().toISOString()
            }])
            .select()
            .single();

        if (notifError) {
            console.error('Error al insertar en notificaciones:', notifError.message);
            return null;
        }

        const estadoEmail = simularFalloEmail ? 'fallo' : 'exito';
        const errorEmail = simularFalloEmail ? 'Servidor SMTP no disponible' : null;

        const canalesEnvio = [
            { notificacion_id: notifData.id, canal: 'app', resultado: 'exito', error_detalles: null },
            { notificacion_id: notifData.id, canal: 'email', resultado: estadoEmail, error_detalles: errorEmail }
        ];

        const { error: enviosError } = await supabaseClient
            .from('notificacion_envios')
            .insert(canalesEnvio);

        if (enviosError) {
            console.error('Error al insertar en notificacion_envios:', enviosError.message);
        }

        return notifData;

    } catch (err) {
        console.error('Excepción inesperada en registrarNotificacionConEnvios:', err);
        return null;
    }
}