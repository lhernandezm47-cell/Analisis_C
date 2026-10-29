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
   NUEVA FUNCIÓN: Registro sincronizado de notificaciones y canales
   ========================================================================== */
async function registrarNotificacionConEnvios(solicitudId, mensajeTexto, simularFalloEmail = false) {
    try {
        // 1. Insertar la notificación principal y obtener el registro creado con su ID
        const { data: notifData, error: notifError } = await supabaseClient
            .from('notificaciones')
            .insert([
                { 
                    solicitud_id: solicitudId, 
                    mensaje: mensajeTexto 
                }
            ])
            .select()
            .single();

        if (notifError) {
            console.error('Error al insertar en notificaciones:', notifError.message);
            return null;
        }

        // 2. Definir los resultados de los canales (simulando estado de app y email)
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

        // 3. Insertar los registros detallados en la tabla notificacion_envios
        const { data: enviosData, error: enviosError } = await supabaseClient
            .from('notificacion_envios')
            .insert(canalesEnvio)
            .select();

        if (enviosError) {
            console.error('Error al insertar en notificacion_envios:', enviosError.message);
        } else {
            console.log('Notificación y detalles de envío registrados correctamente:', {
                notificacion: notifData,
                envios: enviosData
            });
        }

        return notifData;

    } catch (err) {
        console.error('Excepción inesperada en registrarNotificacionConEnvios:', err);
        return null;
    }
}