// --- BLINDAJE DE SEGURIDAD PARA AUTH ---
window.Auth = window.Auth || {
    actual: () => JSON.parse(localStorage.getItem('usuario_actual') || 'null'),
    login: (user) => localStorage.setItem('usuario_actual', JSON.stringify(user)),
    logout: () => localStorage.removeItem('usuario_actual')
};

'use strict';
let U = Auth.actual(), V = 'panel', CODE = '';
const NAV = [['panel', 'Panel', 'admin evaluador autoridad estudiante auditor'], ['convs', 'Convocatorias', 'admin estudiante evaluador autoridad'], ['ests', 'Estudiantes', 'admin'], ['comites', 'Comités evaluadores', 'admin'],
  ['sols', 'Solicitudes', 'admin evaluador autoridad estudiante'], ['evals', 'Evaluaciones', 'admin evaluador autoridad'], ['estado', 'Consultar beca', 'admin estudiante evaluador autoridad'],
  ['rep', 'Reportes', 'admin auditor'], ['notifs', 'Notificaciones', 'admin estudiante'], ['audit', 'Auditoría', 'admin auditor'], ['pat', 'Patrones y arquitectura', 'admin auditor evaluador autoridad']];
const toast = (m, e) => { const t = $('#toast'); t.textContent = m; t.className = e ? 'err show' : 'show'; setTimeout(() => t.className = '', 3800); };
const T = (h, r) => `<div class="sc"><table><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${r.map(c => `<tr>${c.map(x => `<td>${x}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${h.length}" class="mut">Sin registros todavía</td></tr>`}</tbody></table></div>`;
const opt = (a, f) => (a || []).map(x => `<option value="${x.id}">${esc(f(x))}</option>`).join('');
const nm = (a, id) => esc((a || []).find(x => x.id === id)?.nombre ?? '—');
const CL = { Enviada: 'i', 'En evaluación': 'w', Autorizada: 'ok', Rechazada: 'no' };
const badge = e => `<span class="b ${CL[e]}">${e}</span>`;
const mias = () => (D().sols || []).filter(s => U.rol !== 'estudiante' || s.est === U.est);
const inp = (l, n, t = 'text', x = '') => `<label>${l}<input name="${n}" type="${t}" ${x}></label>`;
const NIV = ['Medio', 'Universitario', 'Posgrado'].map(n => `<option>${n}</option>`).join('');

const portal = () => {
  const e = (D().ests || []).find(x => x.id === U.est), hoy = now().slice(0, 10), ns = (D().notifs || []).filter(n => n.est === U.est).slice(-3).reverse();
  return `<h2>Bienvenido(a), ${esc(e?.nombre || U.nombre)}</h2><p class="mut">${esc(e?.nivel || '')}, ${esc(e?.inst || '')}. Correo de contacto: ${esc(e?.correo || '')}</p>
  <div class="cards">${Object.keys(CL).map(x => `<div class="card"><b>${mias().filter(s => s.estado === x).length}</b>${x}</div>`).join('')}</div>
  <h3>Convocatorias abiertas</h3>${T(['Convocatoria', 'Nivel', 'Cierre'], (D().convs || []).filter(c => c.cierre >= hoy).map(c => [esc(c.nombre), c.nivel, c.cierre]))}
  <p>Para pedir una beca vaya a <b>Solicitudes</b>; para ver cómo va su trámite use <b>Consultar beca</b>.</p>
  <h3>Mis últimas notificaciones</h3><ul class="tl">${ns.map(n => `<li>${fmt(n.fecha)}: ${esc(n.msg)}</li>`).join('') || '<li class="mut">Aún no tiene notificaciones</li>'}</ul>`;
};

const VIEWS = {
  panel: () => { if (U.rol === 'estudiante') return portal(); return `<h2>Panel</h2><div class="cards">${Object.keys(CL).map(e => `<div class="card"><b>${mias().filter(s => s.estado === e).length}</b>${e}</div>`).join('')}</div><p>Sesión: <b>${esc(U.nombre)}</b>.</p>`; },
  convs: () => `<h2>Convocatorias</h2>${U.rol === 'admin' ? `<form class="f" data-f="conv">${inp('Nombre', 'nombre', 'text', 'required')}<label>Nivel<select name="nivel">${NIV}</select></label>${inp('Cupo', 'cupo', 'number', 'min="1" required')}${inp('Cierre', 'cierre', 'date', 'required')}<label>Comité<select name="comite">${opt(D().comites, k => k.nombre)}</select></label><button>Crear convocatoria</button></form>` : ''}${T(['Nombre', 'Nivel', 'Cupo', 'Cierre', 'Comité'], (D().convs || []).map(c => [esc(c.nombre), c.nivel, c.cupo, c.cierre, nm(D().comites, c.comite)]))}`,
  ests: () => `<h2>Estudiantes</h2><form class="f" data-f="est">${inp('Nombre completo', 'nombre', 'text', 'required')}${inp('Correo', 'correo', 'email', 'required')}<label>Nivel<select name="nivel">${NIV}</select></label>${inp('Institución', 'inst')}<button>Registrar estudiante</button></form>${T(['Código', 'Nombre', 'Correo', 'Nivel', 'Institución'], (D().ests || []).map(e => [e.id, esc(e.nombre), esc(e.correo), e.nivel, esc(e.inst)]))}`,
  comites: () => `<h2>Comités evaluadores</h2><form class="f" data-f="comite">${inp('Nombre del comité', 'nombre', 'text', 'required')}<fieldset><legend class="mut">Miembros</legend>${(D().users || []).filter(u => u.rol === 'evaluador').map(u => `<label><span><input type="checkbox" name="m" value="${u.id}"> ${esc(u.nombre)}</span></label>`).join('')}</fieldset><button>Crear comité</button></form>${T(['Comité', 'Miembros'], (D().comites || []).map(k => [esc(k.nombre), (k.miembros || []).map(m => nm(D().users, m)).join(', ')]))}`,
  sols: () => {
    const form = ['admin', 'estudiante'].includes(U.rol) ? `<form class="f" data-f="sol">${U.rol === 'admin' ? `<label>Estudiante<select name="est">${opt(D().ests, e => e.nombre)}</select></label>` : ''}<label>Convocatoria<select name="conv">${opt(D().convs, c => c.nombre)}</select></label>${inp('Monto solicitado (Q)', 'monto', 'number', 'min="1" step="0.01" required')}${inp('Descripción', 'desc', 'text', 'required')}<button>Enviar solicitud</button></form>` : '';
    const rows = mias().map(s => {
      const pol = PolicyFactory.para(s), paso = sigPaso(pol, s); let puede = false; if (s.estado === 'En evaluación') try { pol.check(U, s, paso); puede = true; } catch { }
      const ab = ['admin', 'estudiante'].includes(U.rol) && s.estado === 'Enviada', cerr = ['Autorizada', 'Rechazada'].includes(s.estado);
      return [s.id, nm(D().ests, s.est), nm(D().convs, s.conv), Q(s.monto), esc(s.desc), badge(s.estado), (s.aprob || []).map(a => `${a.tipo}: ${a.resultado} (${esc(a.nombre)})`).join('<br>') || '—', (s.docs || []).map(d => esc(d.nombre)).join('<br>') || '—',
        (ab ? `<button class="s" data-a="em" data-id="${s.id}">Editar monto</button>` : '') + (['admin', 'estudiante'].includes(U.rol) && !cerr ? `<input type="file" data-doc="${s.id}">` : '') + (U.rol === 'evaluador' && !cerr ? `<button class="s" data-a="ev" data-id="${s.id}">Evaluar</button>` : '') + (puede ? `<button class="s" data-a="ap" data-id="${s.id}">Aprobar</button><button class="s n" data-a="rj" data-id="${s.id}">Rechazar</button>` : '')];
    });
    return `<h2>Solicitudes</h2>${form}${T(['Código', 'Estudiante', 'Convocatoria', 'Monto', 'Descripción', 'Estado', 'Aprobaciones', 'Documentos', 'Acciones'], rows)}`;
  },
  evals: () => `<h2>Evaluaciones</h2>${T(['Solicitud', 'Evaluador', 'Puntaje', 'Comentario', 'Fecha'], (D().evals || []).map(v => [v.sol, esc(v.nombre), v.puntaje, esc(v.coment), fmt(v.fecha)]))}`,
  estado: () => { const s = (D().sols || []).find(x => x.id === CODE.trim().toUpperCase() && (U.rol !== 'estudiante' || x.est === U.est));
    return `<h2>Consultar estado</h2><form class="f" data-f="estado">${inp('Código', 'code', 'text', 'required')}<button>Consultar</button></form>${CODE ? (s ? `<p><b>${s.id}</b> · ${badge(s.estado)}</p><h3>Historial</h3><ul class="tl">${(s.hist || []).map(h => `<li>${badge(h.estado)} ${fmt(h.fecha)} (${esc(h.por)})</li>`).join('')}</ul>` : '<p class="mut">No encontrada</p>') : ''}`; },
  rep: () => { const t = D().sols || []; return `<h2>Reportes</h2>${T(['Convocatoria', 'Solicitudes'], (D().convs || []).map(c => [esc(c.nombre), t.filter(s => s.conv === c.id).length]))}`; },
  notifs: () => `<h2>Notificaciones</h2>${T(['Fecha', 'Evento', 'Mensaje'], (D().notifs || []).filter(n => U.rol !== 'estudiante' || n.est === U.est).map(n => [fmt(n.fecha), esc(n.evento), esc(n.msg)]).reverse())}`,
  audit: () => `<h2>Auditoría</h2><p>Integridad: <b>${AuditLog.verificar() ? 'íntegra' : 'ALTERADA'}</b></p>${T(['Fecha', 'Usuario', 'Operación', 'Detalle'], (D().audit || []).map(a => [fmt(a.fecha), esc(a.usuario), a.op, esc(JSON.stringify(a.det))]).reverse())}`,
  pat: () => `<h2>Arquitectura</h2><p>Patrones de diseño aplicados con Supabase.</p>`
};

/* ===== Carga Sincrónica Optimizada y Ordenada desde Supabase ===== */
async function cargarDatosSupabase() {
  try {
    // Bloque 1: Tablas principales y catálogos
    const convRes = await supabaseClient.from('convocatorias').select('*');
    const estRes = await supabaseClient.from('estudiantes').select('*');
    const userRes = await supabaseClient.from('usuarios').select('*');
    const comRes = await supabaseClient.from('comites').select('*');
    const comMiembrosRes = await supabaseClient.from('comite_miembros').select('*');

    // Bloque 2: Solicitudes y registros operativos
    const solRes = await supabaseClient.from('solicitudes').select('*');
    const aprobRes = await supabaseClient.from('aprobaciones').select('*');
    const evalRes = await supabaseClient.from('evaluaciones').select('*');
    const docRes = await supabaseClient.from('documentos').select('*');
    const histRes = await supabaseClient.from('historial_estados').select('*');

    // Bloque 3: Notificaciones y auditoría
    const notifRes = await supabaseClient.from('notificaciones').select('*');
    const notifEnvRes = await supabaseClient.from('notificacion_envios').select('*');
    const auditRes = await supabaseClient.from('auditoria').select('*');

    if (!convRes.error && convRes.data) D().convs = convRes.data.map(c => ({ id: 'c' + c.id, nombre: c.nombre, nivel: c.nivel, cupo: c.cupo, cierre: c.fecha_cierre?.slice(0, 10), comite: c.comite_id }));
    if (!estRes.error && estRes.data) D().ests = estRes.data.map(e => ({ id: 'e' + e.id, nombre: e.nombre, correo: e.correo, nivel: e.nivel, inst: e.institucion }));
    if (!userRes.error && userRes.data) D().users = userRes.data.map(u => ({ id: 'u' + u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol }));
    if (!comRes.error && comRes.data) {
      const ms = comMiembrosRes.data || [];
      D().comites = comRes.data.map(k => ({ id: 'k' + k.id, nombre: k.nombre, miembros: ms.filter(m => m.comite_id === k.id).map(m => 'u' + m.usuario_id) }));
    }

    if (!solRes.error && solRes.data) {
      const aps = aprobRes.data || [], docs = docRes.data || [], hists = histRes.data || [];
      D().sols = solRes.data.map(s => ({
        id: 'S' + s.id,
        est: 'e' + s.estudiante_id,
        conv: 'c' + s.convocatoria_id,
        monto: s.monto,
        desc: s.descripcion,
        estado: s.estado || 'Enviada',
        docs: docs.filter(d => d.solicitud_id === s.id).map(d => ({ nombre: d.nombre_archivo, size: d.tamano })),
        aprob: aps.filter(a => a.solicitud_id === s.id).map(a => ({ tipo: a.tipo, userId: 'u' + a.usuario_id, nombre: nm(D().users, 'u' + a.usuario_id), fecha: a.fecha_hora, resultado: a.resultado, coment: a.comentario })),
        hist: hists.filter(h => h.solicitud_id === s.id).map(h => ({ estado: h.estado, fecha: h.fecha, por: h.usuario_o_sistema }))
      }));
    }

    if (!evalRes.error && evalRes.data) {
      D().evals = evalRes.data.map(v => ({ id: 'V' + v.id, sol: 'S' + v.solicitud_id, userId: 'u' + v.evaluador_id, nombre: nm(D().users, 'u' + v.evaluador_id), puntaje: v.puntaje, coment: v.comentario, fecha: v.fecha }));
    }

    if (!notifRes.error && notifRes.data) {
      const envs = notifEnvRes.data || [];
      D().notifs = notifRes.data.map(n => ({
        id: 'N' + n.id,
        fecha: n.fecha,
        sol: 'S' + n.solicitud_id,
        est: 'e' + n.estudiante_id,
        evento: n.evento,
        msg: n.mensaje,
        canales: envs.filter(e => e.notificacion_id === n.id).map(e => ({ c: e.canal, ok: e.resultado === 'enviada', err: e.error_detalles }))
      }));
    }

    if (!auditRes.error && auditRes.data) {
      D().audit = auditRes.data.map(a => ({ fecha: a.fecha_hora, usuario: a.nombre_usuario, op: a.operacion, sol: a.solicitud_id ? 'S' + a.solicitud_id : '', det: a.dato_modificado ? JSON.parse(a.dato_modificado) : {} }));
    }
  } catch (err) { console.error("Error sincronizando:", err); }
}

function render() {
  if (!NAV.some(n => n[0] === V && n[2].includes(U.rol))) V = 'panel';
  $('#nav').innerHTML = NAV.filter(n => n[2].includes(U.rol)).map(n => `<a href="#" data-v="${n[0]}" class="${n[0] === V ? 'on' : ''}">${n[1]}</a>`).join('');
  $('#main').innerHTML = VIEWS[V]();
}

const run = async fn => { 
  try { 
    await fn(); 
    await cargarDatosSupabase(); 
    toast('Operación realizada con éxito'); 
  } catch (x) { 
    toast(x.message, 1); 
  } 
  render(); 
};

const FORMS = {
  conv: async f => await Becas.crearConv(U, { nombre: f.get('nombre'), nivel: f.get('nivel'), cupo: +f.get('cupo'), cierre: f.get('cierre'), comite: f.get('comite') }),
  est: async f => await Becas.crearEst(U, { nombre: f.get('nombre'), correo: f.get('correo'), nivel: f.get('nivel'), inst: f.get('inst') }),
  comite: async f => await Becas.crearComite(U, { nombre: f.get('nombre'), miembros: f.getAll('m') }),
  sol: async f => await Becas.crearSol(U, { est: f.get('est'), conv: f.get('conv'), monto: f.get('monto'), desc: f.get('desc') }),
  estado: f => { CODE = f.get('code'); },
  cfg: f => { D().cfg.fallo = f.get('fallo') === 'on'; S(); }
};

const ACT = {
  em: async id => { const v = prompt('Nuevo monto (Q):'); if (v !== null) await Becas.editarSol(U, id, 'monto', v); },
  ev: async id => { const p = prompt('Puntaje (0-100):'); if (p !== null) await Becas.evaluar(U, id, +p, prompt('Comentario:') || ''); },
  ap: async id => await Becas.decidir(U, id, true, prompt('Comentario:') || ''),
  rj: async id => await Becas.decidir(U, id, false, prompt('Motivo:') || '')
};

document.addEventListener('submit', e => { const f = e.target.dataset.f; if (!f) return; e.preventDefault(); run(() => FORMS[f](new FormData(e.target))); });
document.addEventListener('click', e => {
  const v = e.target.closest('[data-v]'); if (v) { e.preventDefault(); V = v.dataset.v; return render(); }
  const b = e.target.closest('[data-a]'); if (b) run(() => ACT[b.dataset.a](b.dataset.id));
});
document.addEventListener('change', e => { const id = e.target.dataset.doc; if (id && e.target.files[0]) { const f = e.target.files[0]; run(() => Becas.adjuntar(U, id, { name: f.name, size: f.size })); } });

const boot = async () => {
  U = Auth.actual(); const on = !!U;
  $('#login').hidden = on; $('#app').hidden = !on; 
  if (!on) return;
  await cargarDatosSupabase(); 
  $('#me').textContent = U.nombre; 
  V = 'panel'; render();
};

let TIPO = 'personal';
document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { TIPO = b.dataset.t; document.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x === b)); $('#le').textContent = ''; $('#lf').reset(); });

$('#lf').onsubmit = async e => { 
  e.preventDefault(); 
  const f = new FormData(e.target); 
  try { 
    await Auth.login(f.get('u').trim(), f.get('p'), TIPO); 
    $('#lf').reset(); $('#le').textContent = ''; 
    await boot(); 
  } catch (x) { 
    $('#le').textContent = x.message; 
    $('#lf').p.value = ''; 
  } 
};

$('#out').onclick = () => { Auth.salir(); boot(); };
boot();