'use strict';

/* ===== Configuración de Supabase (Cliente Frontend) ===== */
const SUPABASE_URL = 'https://ykpxznpqqrgqgxdzrxhj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcHh6bnBxcXJncWd4ZHpyeGhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNTA4MzgsImV4cCI6MjEwODcyNjgzOH0.J8FQaw9Zj-29JzHP0z7wx4NqWjqwYX1SrPXuNNHBjeE';

// Inicializamos el cliente global de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ===== Utilidades ===== */
const LIMITE = 10000; // Q: umbral de doble aprobación
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const uid = p => p + Math.random().toString(36).slice(2, 7).toUpperCase();
const now = () => new Date().toISOString();
const fmt = d => new Date(d).toLocaleString('es-GT');
const Q = n => 'Q' + Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2 });

/* ===== Datos iniciales ===== */
const mkSol = (id, est, conv, monto, desc) => ({ id, est, conv, monto, desc, estado: 'Enviada', docs: [], aprob: [], hist: [{ estado: 'Enviada', fecha: now(), por: 'Sistema' }] });
const seed = () => ({
  cfg: { fallo: false },
  comites: [{ id: 'k1', nombre: 'Comité Académico', miembros: ['u2', 'u3'] }],
  convs: [{ id: 'c1', nombre: 'Beca Excelencia Universitaria 2026', nivel: 'Universitario', cupo: 50, cierre: '2026-12-15', comite: 'k1' }],
  ests: [
    { id: 'e1', nombre: 'Sofía Ramírez', correo: 'sofia@correo.gt', nivel: 'Universitario', inst: 'Universidad Mariano Gálvez' },
    { id: 'e2', nombre: 'Diego Morales', correo: 'diego@correo.gt', nivel: 'Universitario', inst: 'Universidad Mariano Gálvez' },
    { id: 'e3', nombre: 'Camila Pérez', correo: 'camila@correo.gt', nivel: 'Medio', inst: 'Liceo Santa Lucía' }],
  sols: [mkSol('s1', 'e1', 'c1', 8000, 'Matrícula y materiales'), mkSol('s2', 'e1', 'c1', 15000, 'Estudios de posgrado'), mkSol('s3', 'e2', 'c1', 5000, 'Útiles y transporte')],
  evals: [], notifs: [], audit: []
});

/* ===== PATRÓN CREACIONAL 1: Singleton (Store: única fuente de verdad) ===== */
class Store {
  static #i;
  static get() { return Store.#i ??= new Store(); }
  constructor() { this.k = 'becas_v2'; this.d = JSON.parse(localStorage.getItem(this.k) || 'null') || seed(); this.save(); }
  save() { localStorage.setItem(this.k, JSON.stringify(this.d)); }
}
const D = () => Store.get().d, S = () => Store.get().save();

/* ===== PATRÓN DE COMPORTAMIENTO 1: Observer (bus de eventos) ===== */
class Bus {
  static h = {};
  static on(e, f) { (Bus.h[e] ??= []).push(f); }
  static emit(e, p) { (Bus.h[e] || []).forEach(f => { try { f(p); } catch (x) { console.error('Observer', e, x); } }); }
}

/* ===== Auditoría: solo-agregar, encadenada con hash, sin secretos ===== */
const hash = s => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(16); };
const SECRETO = /pass|token|secret|clave/i;
const limpiar = o => JSON.parse(JSON.stringify(o ?? null, (k, v) => SECRETO.test(k) ? undefined : v));
const AuditLog = {
  add(u, op, sol, det) {
    const a = D().audit, p = a.at(-1);
    const r = { id: uid('A'), fecha: now(), usuarioId: u.id, usuario: u.nombre, op, sol: sol || '', det: limpiar(det), prev: p ? p.h : '0' };
    r.h = hash(r.prev + JSON.stringify([r.id, r.fecha, r.usuarioId, r.op, r.sol, r.det]));
    a.push(r);
  },
  verificar() {
    let prev = '0';
    return D().audit.every(r => { const ok = r.prev === prev && r.h === hash(prev + JSON.stringify([r.id, r.fecha, r.usuarioId, r.op, r.sol, r.det])); prev = r.h; return ok; });
  }
};

/* ===== PATRÓN DE COMPORTAMIENTO 2: Strategy (política de aprobación) ===== */
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
/* ===== PATRÓN CREACIONAL 2: Factory (elige la política según el monto) ===== */
const PolicyFactory = { para: s => s.monto > LIMITE ? new PolDoble() : new PolSimple() };
const sigPaso = (pol, s) => pol.pasos.find(p => !s.aprob.some(a => a.tipo === p));

/* ===== PATRÓN ESTRUCTURAL 1: Adapter (canales de notificación con interfaz única send) + Factory de canales ===== */
const ChannelFactory = {
  reg: {
    app: class { nombre = 'En la aplicación'; send() { } },
    email: class { nombre = 'Correo (simulado)'; send() { if (D().cfg.fallo) throw Error('Servicio de correo no disponible'); } }
  },
  register(k, cls) { this.reg[k] = cls; },
  crear() { return Object.values(this.reg).map(C => new C()); }
};
Bus.on('estado', ({ s, de, a }) => {
  const ev = { id: uid('N'), fecha: now(), sol: s.id, est: s.est, evento: 'CAMBIO_ESTADO: ' + (de ?? 'nueva') + ' → ' + a, msg: 'Su solicitud ' + s.id + ' cambió al estado: ' + a, canales: [] };
  ChannelFactory.crear().forEach(c => { try { c.send(ev); ev.canales.push({ c: c.nombre, ok: true }); } catch (x) { ev.canales.push({ c: c.nombre, ok: false, err: x.message }); } });
  D().notifs.push(ev);
});

/* ===== PATRÓN ESTRUCTURAL 2: Decorator (agrega auditoría a cada operación) ===== */
const audited = (op, fn) => (u, ...a) => { const r = fn(u, ...a); AuditLog.add(u, op, r.sol, r.det); S(); return r; };
const need = (u, ...roles) => { if (!roles.includes(u.rol)) throw Error('No tiene permisos para esta operación'); };
const sol = id => D().sols.find(s => s.id === id) || (() => { throw Error('Solicitud no encontrada'); })();
const duenio = (u, s) => { need(u, 'admin', 'estudiante'); if (u.rol === 'estudiante' && u.est !== s.est) throw Error('Solo puede operar sus propias solicitudes'); };
const cambiar = (s, nuevo, u) => { const de = s.estado; s.estado = nuevo; s.hist.push({ estado: nuevo, fecha: now(), por: u.nombre }); Bus.emit('estado', { s, de, a: nuevo }); };

/* ===== PATRÓN ESTRUCTURAL 3: Facade (API única de casos de uso para la interfaz) ===== */
const Becas = {
  crearConv(u, c) { need(u, 'admin'); if (!c.nombre || !(c.cupo > 0)) throw Error('Nombre y cupo válidos son obligatorios'); D().convs.push({ id: uid('C'), ...c }); S(); },
  crearEst(u, e) { need(u, 'admin'); if (!e.nombre || !e.correo) throw Error('Nombre y correo son obligatorios'); D().ests.push({ id: uid('E'), ...e }); S(); },
  crearComite(u, k) { need(u, 'admin'); if (!k.nombre || !k.miembros.length) throw Error('Indique nombre y al menos un miembro'); D().comites.push({ id: uid('K'), ...k }); S(); },
  crearSol: audited('CREAR_SOLICITUD', (u, f) => {
    need(u, 'admin', 'estudiante'); if (u.rol === 'estudiante') f.est = u.est;
    if (!D().ests.some(e => e.id === f.est) || !D().convs.some(c => c.id === f.conv)) throw Error('Estudiante o convocatoria inválidos');
    if (!(f.monto > 0)) throw Error('El monto debe ser mayor que cero');
    const s = mkSol(uid('S'), f.est, f.conv, +f.monto, f.desc); D().sols.push(s); Bus.emit('estado', { s, de: null, a: 'Enviada' });
    return { sol: s.id, det: { monto: s.monto } };
  }),
  editarSol: audited('MODIFICAR_SOLICITUD', (u, id, campo, valor) => {
    const s = sol(id); duenio(u, s); if (s.estado !== 'Enviada') throw Error('Solo se puede modificar una solicitud en estado Enviada');
    if (!['monto', 'desc'].includes(campo)) throw Error('Campo no modificable');
    if (campo === 'monto') { valor = +valor; if (!(valor > 0)) throw Error('Monto inválido'); }
    const antes = s[campo]; s[campo] = valor; return { sol: id, det: { campo, antes, despues: valor } };
  }),
  adjuntar: audited('CARGAR_DOCUMENTO', (u, id, f) => { const s = sol(id); duenio(u, s); if (['Autorizada', 'Rechazada'].includes(s.estado)) throw Error('La solicitud ya está cerrada'); s.docs.push({ ...f, fecha: now() }); return { sol: id, det: { documento: f.nombre } }; }),
  evaluar: audited('EVALUAR', (u, id, puntaje, coment) => {
    need(u, 'evaluador'); const s = sol(id), k = D().comites.find(k => k.id === D().convs.find(c => c.id === s.conv)?.comite);
    if (!k?.miembros.includes(u.id)) throw Error('Solo los miembros del comité evaluador pueden evaluar');
    if (!(puntaje >= 0 && puntaje <= 100)) throw Error('El puntaje debe estar entre 0 y 100');
    if (['Autorizada', 'Rechazada'].includes(s.estado)) throw Error('La solicitud ya está cerrada');
    D().evals.push({ id: uid('V'), sol: id, userId: u.id, nombre: u.nombre, puntaje, coment, fecha: now() });
    if (s.estado === 'Enviada') cambiar(s, 'En evaluación', u);
    return { sol: id, det: { puntaje } };
  }),
  decidir: audited('DECIDIR', (u, id, ok, coment) => {
    const s = sol(id); if (s.estado !== 'En evaluación') throw Error('La solicitud debe estar En evaluación (con evaluación registrada)');
    const pol = PolicyFactory.para(s), paso = sigPaso(pol, s); pol.check(u, s, paso);
    s.aprob.push({ tipo: paso, userId: u.id, nombre: u.nombre, fecha: now(), resultado: ok ? 'aprobada' : 'rechazada', coment });
    if (!ok) cambiar(s, 'Rechazada', u); else if (!sigPaso(pol, s)) cambiar(s, 'Autorizada', u);
    return { sol: id, det: { paso, resultado: ok ? 'aprobada' : 'rechazada' } };
  })
};

/* ===== Autenticación conectada a Supabase (Tabla usuarios) ===== */
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
  async login(usuario, pw, tipo) {
    const k = usuario.toLowerCase(), t = this.fallos[k], bloq = t && Date.now() < t.hasta;
    if (bloq && t.n >= 3) throw Error('Demasiados intentos fallidos. Espere ' + Math.ceil((t.hasta - Date.now()) / 1000) + ' s');

    // Consultar la tabla 'usuarios' en Supabase filtrando por nombre de usuario
    const { data: usersList, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .ilike('usuario', k);

    if (error || !usersList || usersList.length === 0) {
      this.registrarFallo(k);
      throw Error('Usuario o contraseña incorrectos');
    }

    // Filtrar por rol (estudiante vs personal)
    const u = usersList.find(x => (tipo === 'estudiante') === (x.rol === 'estudiante'));

    if (!u || u.hash !== sha256(SAL + k + '|' + pw)) {
      this.registrarFallo(k);
      throw Error('Usuario o contraseña incorrectos');
    }

    delete this.fallos[k]; 
    sessionStorage.setItem('becas_ses', JSON.stringify(u));
    return u;
  },
  
  registrarFallo(k) {
    const t = this.fallos[k];
    const bloq = t && Date.now() < t.hasta;
    this.fallos[k] = { n: (bloq ? t.n : 0) + 1, hasta: Date.now() + 30000 };
  },

  actual() { 
    const ses = sessionStorage.getItem('becas_ses');
    return ses ? JSON.parse(ses) : null; 
  },
  
  salir() { 
    sessionStorage.removeItem('becas_ses'); 
  }
};