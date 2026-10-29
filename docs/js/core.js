'use strict';

/* ===== Configuración de Supabase (Cliente Frontend) ===== */
const SUPABASE_URL = 'https://ykpxznpqqrgqgxdzrxhj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcHh6bnBxcXJncWd4ZHpyeGhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNTA4MzgsImV4cCI6MjEwODcyNjgzOH0.J8FQaw9Zj-29JzHP0z7wx4NqWjqwYX1SrPXuNNHBjeE';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ===== Utilidades ===== */
const LIMITE = 10000;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const uid = p => p + Math.random().toString(36).slice(2, 7).toUpperCase();
const now = () => new Date().toISOString();
const fmt = d => new Date(d).toLocaleString('es-GT');
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
const SECRETO = /pass|token|secret|clave/i;
const limpiar = o => JSON.parse(JSON.stringify(o ?? null, (k, v) => SECRETO.test(k) ? undefined : v));

const AuditLog = {
  async add(u, op, sol, det) {
    const a = D().audit, p = a.at(-1);
    const r = { id: uid('A'), fecha: now(), usuarioId: u.id, usuario: u.nombre, op, sol: sol || '', det: limpiar(det), prev: p ? p.h : '0' };
    r.h = hash(r.prev + JSON.stringify([r.id, r.fecha, r.usuarioId, r.op, r.sol, r.det]));
    a.push(r);

    const userId = parseInt(String(u.id).replace(/\D/g, '')) || 1;
    const solIdClean = sol ? parseInt(String(sol).replace(/\D/g, '')) || null : null;

    await supabaseClient.from('auditoria').insert([{
      usuario_id: userId,
      nombre_usuario: u.nombre,
      operacion: op,
      solicitud_id: solIdClean,
      dato_modificado: JSON.stringify(det)
    }]);
  },
  verificar() {
    let prev = '0';
    return D().audit.every(r => { const ok = r.prev === prev && r.h === hash(prev + JSON.stringify([r.id, r.fecha, r.usuarioId, r.op, r.sol, r.det])); prev = r.h; return ok; });
  }
};

class PolSimple {
  pasos = ['unica'];
  check(u) { if (!['evaluador', 'autoridad'].includes(u.rol)) throw Error('Su rol no puede aprobar solicitudes'); }
}
class PolDoble {
  pasos = ['evaluacion', 'autoridad'];
  check(u, s, p) {
    if (p === 'evaluacion' && u.rol !== 'evaluador') throw Error('La primera aprobación corresponde al responsable de evaluación');
    if (p === 'autoridad' && u.rol !== 'autoridad') throw Error('La segunda aprobación corresponde a la autoridad autorizadora');
    if (p === 'autoridad' && !s.aprob.some(a => a.tipo === 'evaluacion' && a.resultado === 'aprobada')) throw Error('Falta la aprobación del responsable de evaluación');
    if (s.aprob.some(a => a.userId === u.id)) throw Error('La misma persona no puede completar ambas aprobaciones');
  }
}
const PolicyFactory = { para: s => s.monto > LIMITE ? new PolDoble() : new PolSimple() };
const sigPaso = (pol, s) => pol.pasos.find(p => !s.aprob.some(a => a.tipo === p));

/* ===== Canales de Notificación (Supabase: 'notificaciones' y 'notificacion_envios') ===== */
const ChannelFactory = {
  reg: {
    app: class { nombre = 'En la aplicación'; send() { } },
    email: class { nombre = 'Correo (simulado)'; send() { if (D().cfg.fallo) throw Error('Servicio de correo no disponible'); } }
  },
  register(k, cls) { this.reg[k] = cls; },
  crear() { return Object.values(this.reg).map(C => new C()); }
};

Bus.on('estado', async ({ s, de, a }) => {
  const ev = { id: uid('N'), fecha: now(), sol: s.id, est: s.est, evento: 'CAMBIO_ESTADO: ' + (de ?? 'nueva') + ' → ' + a, msg: 'Su solicitud ' + s.id + ' cambió al estado: ' + a, canales: [] };
  
  ChannelFactory.crear().forEach(c => {
    try { c.send(ev); ev.canales.push({ c: c.nombre, ok: true }); }
    catch (x) { ev.canales.push({ c: c.nombre, ok: false, err: x.message }); }
  });

  D().notifs.push(ev);

  const solId = parseInt(String(s.id).replace(/\D/g, '')) || 1;
  const estId = parseInt(String(s.est).replace(/\D/g, '')) || 1;

  const { data: notifData } = await supabaseClient.from('notificaciones').insert([{
    solicitud_id: solId,
    estudiante_id: estId,
    evento: 'CAMBIO_ESTADO',
    mensaje: ev.msg
  }]).select().single();

  if (notifData) {
    const notifId = notifData.id;
    const envios = ev.canales.map(ch => ({
      notificacion_id: notifId,
      canal: ch.c,
      resultado: ch.ok ? 'enviada' : 'falló',
      error_detalles: ch.err || null
    }));
    await supabaseClient.from('notificacion_envios').insert(envios);
  }
});

const audited = (op, fn) => async (u, ...a) => { const r = fn(u, ...a); await AuditLog.add(u, op, r.sol, r.det); S(); return r; };
const need = (u, ...roles) => { if (!roles.includes(u.rol)) throw Error('No tiene permisos para esta operación'); };
const sol = id => D().sols.find(s => s.id === id) || (() => { throw Error('Solicitud no encontrada'); })();
const duenio = (u, s) => { need(u, 'admin', 'estudiante'); if (u.rol === 'estudiante' && u.est !== s.est) throw Error('Solo puede operar sus propias solicitudes'); };

const cambiar = async (s, nuevo, u) => { 
  const de = s.estado; 
  s.estado = nuevo; 
  s.hist.push({ estado: nuevo, fecha: now(), por: u.nombre }); 

  const solId = parseInt(String(s.id).replace(/\D/g, '')) || 1;
  await supabaseClient.from('solicitudes').update({ estado: nuevo }).eq('id', solId);
  await supabaseClient.from('historial_estados').insert([{
    solicitud_id: solId,
    estado: nuevo,
    usuario_o_sistema: u.nombre
  }]);

  Bus.emit('estado', { s, de, a: nuevo }); 
};

/* ===== Facade de Operaciones con Supabase ===== */
const Becas = {
  async crearConv(u, c) {
    need(u, 'admin'); 
    if (!c.nombre || !(c.cupo > 0)) throw Error('Nombre y cupo válidos son obligatorios');
    const comiteId = parseInt(String(c.comite).replace(/\D/g, '')) || 1;
    const { error } = await supabaseClient.from('convocatorias').insert([{ nombre: c.nombre, nivel: c.nivel, cupo: +c.cupo, fecha_cierre: c.cierre, comite_id: comiteId }]);
    if (error) throw Error('Error al guardar la convocatoria: ' + error.message);
  },

  async crearEst(u, e) {
    need(u, 'admin'); 
    if (!e.nombre || !e.correo) throw Error('Nombre y correo son obligatorios');
    const { error } = await supabaseClient.from('estudiantes').insert([{ nombre: e.nombre, correo: e.correo, nivel: e.nivel, institucion: e.inst }]);
    if (error) throw Error('Error al registrar estudiante: ' + error.message);
  },

  async crearComite(u, k) { 
    need(u, 'admin'); 
    if (!k.nombre || !k.miembros || k.miembros.length === 0) throw Error('Indique nombre y miembros');
    
    const { data: comiteData, error: errComite } = await supabaseClient
      .from('comites')
      .insert([{ nombre: k.nombre }])
      .select()
      .single();

    if (errComite || !comiteData) throw Error('Error al crear comité: ' + (errComite?.message || 'Error de BD'));

    const comiteId = comiteData.id;
    const rels = k.miembros.map(m => ({ 
      comite_id: comiteId, 
      usuario_id: parseInt(String(m).replace(/\D/g, '')) || 1 
    }));

    const { error: errMiembros } = await supabaseClient.from('comite_miembros').insert(rels);
    if (errMiembros) console.error("Error al insertar miembros del comité:", errMiembros);
  },
  
  async crearSol(u, f) {
    need(u, 'admin', 'estudiante'); 
    if (u.rol === 'estudiante') f.est = u.est;
    if (!(f.monto > 0)) throw Error('El monto debe ser mayor que cero');
    
    const estId = parseInt(String(f.est).replace(/\D/g, '')) || 1;
    const convId = parseInt(String(f.conv).replace(/\D/g, '')) || 1;
    
    const { data: solData, error: errSol } = await supabaseClient
      .from('solicitudes')
      .insert([{ estudiante_id: estId, convocatoria_id: convId, monto: +f.monto, descripcion: f.desc, estado: 'Enviada' }])
      .select()
      .single();

    if (errSol || !solData) throw Error('Error al enviar la solicitud: ' + (errSol?.message || 'Error de BD'));

    const solId = solData.id;

    await supabaseClient.from('historial_estados').insert([{
      solicitud_id: solId,
      estado: 'Enviada',
      usuario_o_sistema: u.nombre || 'Sistema'
    }]);
  },

  async editarSol(u, id, campo, valor) {
    const s = sol(id); duenio(u, s); if (s.estado !== 'Enviada') throw Error('Solo solicitudes en estado Enviada');
    if (!['monto', 'desc'].includes(campo)) throw Error('Campo no modificable');
    if (campo === 'monto') { valor = +valor; if (!(valor > 0)) throw Error('Monto inválido'); }
    
    const solId = parseInt(String(id).replace(/\D/g, '')) || 1;
    const updateObj = campo === 'monto' ? { monto: valor } : { descripcion: valor };
    
    const { error } = await supabaseClient.from('solicitudes').update(updateObj).eq('id', solId);
    if (error) throw Error('Error al actualizar la solicitud');

    await AuditLog.add(u, 'MODIFICAR_SOLICITUD', id, { campo, despues: valor });
  },

  async adjuntar(u, id, f) { 
    const s = sol(id); duenio(u, s); 
    if (['Autorizada', 'Rechazada'].includes(s.estado)) throw Error('Solicitud cerrada'); 
    
    const solId = parseInt(String(id).replace(/\D/g, '')) || 1;
    const { error } = await supabaseClient.from('documentos').insert([{ 
      solicitud_id: solId, 
      nombre_archivo: f.name, 
      tamano: f.size, 
      ruta: 'docs/' + f.name 
    }]);

    if (error) throw Error('Error al guardar documento en Supabase');
    await AuditLog.add(u, 'CARGAR_DOCUMENTO', id, { documento: f.name });
  },
  
  async evaluar(u, id, puntaje, coment) {
    need(u, 'evaluador'); const s = sol(id);
    if (!(puntaje >= 0 && puntaje <= 100)) throw Error('Puntaje entre 0 y 100');
    if (['Autorizada', 'Rechazada'].includes(s.estado)) throw Error('Solicitud cerrada');
    
    const solId = parseInt(String(id).replace(/\D/g, '')) || 1;
    const userId = parseInt(String(u.id).replace(/\D/g, '')) || 1;

    const { error: errEval } = await supabaseClient.from('evaluaciones').insert([{ 
      solicitud_id: solId, 
      evaluador_id: userId, 
      puntaje, 
      comentario: coment 
    }]);

    if (errEval) throw Error('Error al guardar la evaluación');

    if (s.estado === 'Enviada') {
      await cambiar(s, 'En evaluación', u);
    }

    await AuditLog.add(u, 'EVALUAR', id, { puntaje });
  },

  async decidir(u, id, ok, coment) {
    const s = sol(id); if (s.estado !== 'En evaluación') throw Error('Debe estar En evaluación');
    const pol = PolicyFactory.para(s), paso = sigPaso(pol, s); pol.check(u, s, paso);
    
    const solId = parseInt(String(id).replace(/\D/g, '')) || 1;
    const userId = parseInt(String(u.id).replace(/\D/g, '')) || 1;
    const resultadoTexto = ok ? 'aprobada' : 'rechazada';

    const { error: errAprob } = await supabaseClient.from('aprobaciones').insert([{ 
      solicitud_id: solId, 
      tipo: paso, 
      usuario_id: userId, 
      resultado: resultadoTexto, 
      comentario: coment 
    }]);

    if (errAprob) throw Error('Error al guardar la aprobación');

    if (!ok) {
      await cambiar(s, 'Rechazada', u);
    } else if (!sigPaso(pol, s)) {
      await cambiar(s, 'Autorizada', u);
    }

    await AuditLog.add(u, 'DECIDIR', id, { paso, resultado: resultadoTexto });
  }
};

/* ===== Autenticación con 'usuarios' e 'intentos_acceso' ===== */
const SAL = 'becas-umg|';
const sha256 = s => {
  const b = [...new TextEncoder().encode(s)], l = b.length * 8; b.push(128);
  while (b.length % 64 !== 56) b.push(0);
  for (let i = 7; i >= 0; i--) b.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
  const K = [], H0 = [], r = (x, n) => x >>> n | x << 32 - n;
  for (let n = 2, c = 0; c < 64; n++) if ([...Array(n).keys()].slice(2).every(d => n % d)) { if (c < 8) H0[c] = Math.floor((Math.sqrt(n) % 1) * 2 ** 32); K[c++] = Math.floor((Math.cbrt(n) % 1) * 2 ** 32); }
  let h = [...H0];
  for (let o = 0; o < b.length; o += 64) {
    const w = []; for (let i = 0; i < 16; i++) w[i] = b[o + i * 4] << 24 | b[o + i * 4 + 1] << 16 | b[o + i * 4 + 2] << 8 | b[o + i * 4 + 3];
    for (let i = 16; i < 64; i++) { const x = w[i - 15], y = w[i - 2]; w[i] = (w[i - 16] + (r(x, 7) ^ r(x, 18) ^ x >>> 3) + w[i - 7] + (r(y, 17) ^ r(y, 19) ^ y >>> 10)) | 0; }
    let [a, bb, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    h = h.map((x, i) => (x + [a, bb, c, d, e, f, g, hh][i]) | 0);
  }
  return h.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
};

const Auth = {
  fallos: {},
  async registrarIntento(usuarioEscrito, resultado) {
    await supabaseClient.from('intentos_acceso').insert([{ usuario_escrito: usuarioEscrito, resultado }]);
  },
  async login(usuario, pw, tipo) {
    const k = usuario.toLowerCase();
    const { data: usersList } = await supabaseClient.from('usuarios').select('*').ilike('usuario', k);

    if (!usersList || usersList.length === 0) {
      await this.registrarIntento(usuario, 'fallido');
      throw Error('Usuario o contraseña incorrectos');
    }

    const u = usersList.find(x => (tipo === 'estudiante') === (x.rol === 'estudiante'));
    if (!u || u.contrasena_hash !== sha256(SAL + k + '|' + pw)) {
      await this.registrarIntento(usuario, 'fallido');
      throw Error('Usuario o contraseña incorrectos');
    }

    await this.registrarIntento(usuario, 'exitoso');
    sessionStorage.setItem('becas_ses', JSON.stringify(u));
    return u;
  },
  actual() { const s = sessionStorage.getItem('becas_ses'); return s ? JSON.parse(s) : null; },
  salir() { sessionStorage.removeItem('becas_ses'); }
};