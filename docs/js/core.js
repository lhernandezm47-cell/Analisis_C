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

/* ===== SHA-256 en el navegador (requiere https o localhost) ===== */
async function sha256Hex(texto) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ==========================================================================
   REGISTRO DE INTENTOS DE ACCESO (tabla 'intentos_acceso')
   ========================================================================== */
async function registrarIntentoAcceso(username, exitoso) {
    try {
        // Columnas reales de la tabla: usuario_escrito, fecha_hora, resultado
        const { error } = await supabaseClient
            .from('intentos_acceso')
            .insert([{
                usuario_escrito: username || '(vacío)',
                fecha_hora: new Date().toISOString(),
                resultado: exitoso ? 'exito' : 'fallo'
            }]);

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

    // Valida contra la tabla 'usuarios' (columnas: usuario, contrasena_hash, activo, estudiante_id).
    // La contraseña se convierte a SHA-256 (hex) en el navegador y se compara con contrasena_hash.
    static async login(username, password, tipo) {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .ilike('usuario', String(username).replace(/[%_\\]/g, m => '\\' + m))
            .maybeSingle();

        if (error) {
            throw new Error('No se pudo conectar con el servidor: ' + error.message);
        }

        const hashIngresado = await sha256Hex(password);
        const ok = data && data.activo !== false &&
            String(data.contrasena_hash || '').toLowerCase() === hashIngresado;

        if (!ok) {
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

/* ==========================================================================
   LÓGICA DE NEGOCIO (guarda todo en Supabase)
   Define: AuditLog, PolicyFactory, sigPaso y Becas, que usa ui.js
   ========================================================================== */
const idNum = id => parseInt(String(id).replace(/\D/g, ''), 10);
const chk = (contexto, error) => { if (error) throw new Error(contexto + ': ' + error.message); };

/* ----- Auditoría (tabla 'auditoria') ----- */
window.AuditLog = {
    firma(usuario, op, sol, det) { return hash(JSON.stringify([usuario, op, sol, det])); },

    async registrar(user, op, solId, det) {
        try {
            const d = limpiar(det) || {};
            const sol = solId ? 'S' + idNum(solId) : '';
            const h = AuditLog.firma(user.nombre, op, sol, d);
            const { error } = await supabaseClient.from('auditoria').insert([{
                nombre_usuario: user.nombre,
                operacion: op,
                solicitud_id: solId ? idNum(solId) : null,
                fecha_hora: new Date().toISOString(),
                dato_modificado: JSON.stringify({ d, __h: h })
            }]);
            if (error) console.error('Auditoría:', error.message);
        } catch (err) {
            console.error('Auditoría:', err);
        }
    },

    // true si ningún registro fue alterado (los registros viejos sin huella se aceptan)
    verificar() {
        return (D().audit || []).every(a => !a.h || a.h === AuditLog.firma(a.usuario, a.op, a.sol, a.det));
    }
};

/* ----- Políticas de aprobación ----- */
window.PolicyFactory = {
    // Monto <= LIMITE: solo aprueba el comité. Monto > LIMITE: comité + autoridad.
    para(s) {
        const mayor = Number(s.monto) > LIMITE;
        const pasos = [{ tipo: 'Comité', rol: 'evaluador' }];
        if (mayor) pasos.push({ tipo: 'Autoridad', rol: 'autoridad' });
        return {
            nombre: mayor ? 'Mayor monto' : 'Estándar',
            pasos,
            check(user, sol, paso) {
                if (!paso) throw new Error('La solicitud no tiene aprobaciones pendientes');
                if (user.rol !== paso.rol) throw new Error('Esta aprobación le corresponde al rol: ' + paso.rol);
                if ((sol.aprob || []).some(a => a.tipo === paso.tipo && a.userId === user.id)) throw new Error('Ya registró esta aprobación');
                if (paso.tipo === 'Comité') {
                    const conv = (D().convs || []).find(c => c.id === sol.conv);
                    const com = (D().comites || []).find(k => k.id === conv?.comite);
                    if (com && com.miembros.length && !com.miembros.includes(user.id)) throw new Error('Usted no pertenece al comité de esta convocatoria');
                }
            }
        };
    }
};

// Primer paso que todavía no tiene una aprobación "Aprobada"
window.sigPaso = (pol, s) =>
    pol.pasos.find(p => !(s.aprob || []).some(a => a.tipo === p.tipo && a.resultado === 'Aprobada')) || null;

/* ----- Operaciones principales ----- */
window.Becas = {
    _rol(user, roles) {
        if (!user || !roles.includes(user.rol)) throw new Error('Su rol no tiene permiso para esta operación');
    },
    _sol(id) {
        const s = (D().sols || []).find(x => x.id === id);
        if (!s) throw new Error('Solicitud no encontrada');
        return s;
    },

    async crearConv(user, d) {
        Becas._rol(user, ['admin']);
        if (!String(d.nombre || '').trim()) throw new Error('Escriba el nombre de la convocatoria');
        if (!(d.cupo > 0)) throw new Error('El cupo debe ser mayor a 0');
        if (!d.cierre) throw new Error('Indique la fecha de cierre');
        const { data, error } = await supabaseClient.from('convocatorias').insert([{
            nombre: d.nombre.trim(),
            nivel: d.nivel,
            cupo: d.cupo,
            fecha_cierre: d.cierre,
            comite_id: d.comite ? idNum(d.comite) : null
        }]).select().single();
        chk('No se pudo crear la convocatoria', error);
        await AuditLog.registrar(user, 'CREAR_CONVOCATORIA', null, { id: data.id, nombre: data.nombre, cupo: data.cupo });
    },

    async crearEst(user, d) {
        Becas._rol(user, ['admin']);
        if (!String(d.nombre || '').trim()) throw new Error('Escriba el nombre del estudiante');
        const { data, error } = await supabaseClient.from('estudiantes').insert([{
            nombre: d.nombre.trim(),
            correo: d.correo.trim(),
            nivel: d.nivel,
            institucion: d.inst || ''
        }]).select().single();
        chk('No se pudo registrar al estudiante', error);
        await AuditLog.registrar(user, 'CREAR_ESTUDIANTE', null, { id: data.id, nombre: data.nombre });
    },

    async crearComite(user, d) {
        Becas._rol(user, ['admin']);
        if (!String(d.nombre || '').trim()) throw new Error('Escriba el nombre del comité');
        const { data, error } = await supabaseClient.from('comites').insert([{ nombre: d.nombre.trim() }]).select().single();
        chk('No se pudo crear el comité', error);
        if ((d.miembros || []).length) {
            const filas = d.miembros.map(m => ({ comite_id: data.id, usuario_id: idNum(m) }));
            const { error: e2 } = await supabaseClient.from('comite_miembros').insert(filas);
            chk('El comité se creó, pero fallaron los miembros', e2);
        }
        await AuditLog.registrar(user, 'CREAR_COMITE', null, { id: data.id, nombre: data.nombre, miembros: d.miembros || [] });
    },

    async crearSol(user, d) {
        Becas._rol(user, ['admin', 'estudiante']);
        const estId = user.rol === 'estudiante' ? user.est : d.est;
        if (!estId) throw new Error('Su usuario no está vinculado a un estudiante. Pida al administrador que lo asocie.');
        const monto = Number(d.monto);
        if (!(monto > 0)) throw new Error('El monto debe ser mayor a 0');
        const conv = (D().convs || []).find(c => c.id === d.conv);
        if (!conv) throw new Error('Seleccione una convocatoria');
        if (conv.cierre && conv.cierre < now().slice(0, 10)) throw new Error('La convocatoria ya cerró');
        const { data, error } = await supabaseClient.from('solicitudes').insert([{
            estudiante_id: idNum(estId),
            convocatoria_id: idNum(conv.id),
            monto,
            descripcion: String(d.desc || '').trim(),
            estado: 'Enviada'
        }]).select().single();
        chk('No se pudo enviar la solicitud', error);
        await supabaseClient.from('historial_estados').insert([{
            solicitud_id: data.id, estado: 'Enviada', fecha: now(), usuario_o_sistema: user.nombre
        }]);
        await registrarNotificacionConEnvios(data.id, data.estudiante_id, 'CAMBIO_ESTADO',
            'Su solicitud S' + data.id + ' fue enviada correctamente.', D().cfg.fallo);
        await AuditLog.registrar(user, 'CREAR_SOLICITUD', data.id, { monto, convocatoria: conv.nombre });
    },

    async editarSol(user, id, campo, valor) {
        Becas._rol(user, ['admin', 'estudiante']);
        const s = Becas._sol(id);
        if (user.rol === 'estudiante' && s.est !== user.est) throw new Error('Solo puede editar sus propias solicitudes');
        if (s.estado !== 'Enviada') throw new Error('Solo se puede editar una solicitud en estado Enviada');
        if (campo !== 'monto') throw new Error('Campo no editable');
        const nuevo = Number(valor);
        if (!(nuevo > 0)) throw new Error('El monto debe ser mayor a 0');
        const { error } = await supabaseClient.from('solicitudes').update({ monto: nuevo }).eq('id', idNum(id));
        chk('No se pudo editar el monto', error);
        await AuditLog.registrar(user, 'EDITAR_MONTO', id, { antes: s.monto, despues: nuevo });
    },

    async adjuntar(user, id, f) {
        Becas._rol(user, ['admin', 'estudiante']);
        const s = Becas._sol(id);
        if (user.rol === 'estudiante' && s.est !== user.est) throw new Error('Solo puede adjuntar a sus propias solicitudes');
        if (f.size > 10 * 1024 * 1024) throw new Error('El archivo no debe pasar de 10 MB');

        // Ruta dentro del bucket 'documentos' de Supabase Storage: <id_solicitud>/<fecha>_<nombre>
        const limpio = f.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.\-]+/g, '_');
        const ruta = idNum(id) + '/' + Date.now() + '_' + limpio;

        if (f.file) {
            const { error: eUp } = await supabaseClient.storage
                .from('documentos')
                .upload(ruta, f.file, { contentType: f.file.type || 'application/octet-stream' });
            chk('No se pudo subir el archivo al almacenamiento', eUp);
        }

        const { error } = await supabaseClient.from('documentos').insert([{
            solicitud_id: idNum(id), nombre_archivo: f.name, tamano: f.size, ruta
        }]);
        chk('No se pudo adjuntar el documento', error);
        await AuditLog.registrar(user, 'ADJUNTAR_DOCUMENTO', id, { nombre: f.name, tamano: f.size });
    },

    async evaluar(user, id, puntaje, coment) {
        Becas._rol(user, ['evaluador']);
        const s = Becas._sol(id);
        if (['Autorizada', 'Rechazada'].includes(s.estado)) throw new Error('La solicitud ya está cerrada');
        if (!Number.isFinite(puntaje) || puntaje < 0 || puntaje > 100) throw new Error('El puntaje debe estar entre 0 y 100');
        const { error } = await supabaseClient.from('evaluaciones').insert([{
            solicitud_id: idNum(id), evaluador_id: idNum(user.id), puntaje, comentario: coment || '', fecha: now()
        }]);
        chk('No se pudo guardar la evaluación', error);
        await AuditLog.registrar(user, 'EVALUAR', id, { puntaje });
        if (s.estado === 'Enviada') await Becas._estado(user, s, 'En evaluación');
    },

    async decidir(user, id, aprobar, coment) {
        const s = Becas._sol(id);
        if (s.estado !== 'En evaluación') throw new Error('La solicitud debe estar En evaluación');
        const pol = PolicyFactory.para(s), paso = sigPaso(pol, s);
        pol.check(user, s, paso);
        const resultado = aprobar ? 'Aprobada' : 'Rechazada';
        const { error } = await supabaseClient.from('aprobaciones').insert([{
            solicitud_id: idNum(id), tipo: paso.tipo, usuario_id: idNum(user.id),
            fecha_hora: now(), resultado, comentario: coment || ''
        }]);
        chk('No se pudo registrar la decisión', error);
        await AuditLog.registrar(user, aprobar ? 'APROBAR' : 'RECHAZAR', id, { tipo: paso.tipo, comentario: coment || '' });
        if (!aprobar) return Becas._estado(user, s, 'Rechazada');
        const simulada = { aprob: [...(s.aprob || []), { tipo: paso.tipo, resultado: 'Aprobada' }] };
        if (!sigPaso(pol, simulada)) await Becas._estado(user, s, 'Autorizada');
    },

    // Cambia el estado, deja historial, notifica y audita
    async _estado(user, s, nuevo) {
        const { error } = await supabaseClient.from('solicitudes').update({ estado: nuevo }).eq('id', idNum(s.id));
        chk('No se pudo cambiar el estado', error);
        await supabaseClient.from('historial_estados').insert([{
            solicitud_id: idNum(s.id), estado: nuevo, fecha: now(), usuario_o_sistema: user.nombre
        }]);
        await registrarNotificacionConEnvios(idNum(s.id), idNum(s.est), 'CAMBIO_ESTADO',
            'Su solicitud ' + s.id + ' cambió a estado: ' + nuevo, D().cfg.fallo);
        await AuditLog.registrar(user, 'CAMBIO_ESTADO', s.id, { de: s.estado, a: nuevo });
    }
};