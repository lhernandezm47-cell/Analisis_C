'use strict';
let U = Auth.actual(), V = 'panel', CODE = '';
const NAV = [['panel', 'Panel', 'admin evaluador autoridad estudiante auditor'], ['convs', 'Convocatorias', 'admin estudiante evaluador autoridad'], ['ests', 'Estudiantes', 'admin'], ['comites', 'Comités evaluadores', 'admin'],
  ['sols', 'Solicitudes', 'admin evaluador autoridad estudiante'], ['evals', 'Evaluaciones', 'admin evaluador autoridad'], ['estado', 'Consultar beca', 'admin estudiante evaluador autoridad'],
  ['rep', 'Reportes', 'admin auditor'], ['notifs', 'Notificaciones', 'admin estudiante'], ['audit', 'Auditoría', 'admin auditor'], ['pat', 'Patrones y arquitectura', 'admin auditor evaluador autoridad']];
const toast = (m, e) => { const t = $('#toast'); t.textContent = m; t.className = e ? 'err show' : 'show'; setTimeout(() => t.className = '', 3800); };
const T = (h, r) => `<div class="sc"><table><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${r.map(c => `<tr>${c.map(x => `<td>${x}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${h.length}" class="mut">Sin registros todavía</td></tr>`}</tbody></table></div>`;
const opt = (a, f) => a.map(x => `<option value="${x.id}">${esc(f(x))}</option>`).join('');
const nm = (a, id) => esc(a.find(x => x.id === id)?.nombre ?? '—');
const CL = { Enviada: 'i', 'En evaluación': 'w', Autorizada: 'ok', Rechazada: 'no' };
const badge = e => `<span class="b ${CL[e]}">${e}</span>`;
const mias = () => D().sols.filter(s => U.rol !== 'estudiante' || s.est === U.est);
const inp = (l, n, t = 'text', x = '') => `<label>${l}<input name="${n}" type="${t}" ${x}></label>`;
const NIV = ['Medio', 'Universitario', 'Posgrado'].map(n => `<option>${n}</option>`).join('');

const portal = () => {
  const e = D().ests.find(x => x.id === U.est), hoy = now().slice(0, 10), ns = D().notifs.filter(n => n.est === U.est).slice(-3).reverse();
  return `<h2>Bienvenido(a), ${esc(e?.nombre || U.nombre)}</h2><p class="mut">${esc(e?.nivel || '')}, ${esc(e?.inst || '')}. Correo de contacto: ${esc(e?.correo || '')}</p>
  <div class="cards">${Object.keys(CL).map(x => `<div class="card"><b>${mias().filter(s => s.estado === x).length}</b>${x}</div>`).join('')}</div>
  <h3>Convocatorias abiertas</h3>${T(['Convocatoria', 'Nivel', 'Cierre'], D().convs.filter(c => c.cierre >= hoy).map(c => [esc(c.nombre), c.nivel, c.cierre]))}
  <p>Para pedir una beca vaya a <b>Solicitudes</b>; para ver cómo va su trámite use <b>Consultar beca</b>.</p>
  <h3>Mis últimas notificaciones</h3><ul class="tl">${ns.map(n => `<li>${fmt(n.fecha)}: ${esc(n.msg)}</li>`).join('') || '<li class="mut">Aún no tiene notificaciones</li>'}</ul>`;
};

const VIEWS = {
  panel: () => { if (U.rol === 'estudiante') return portal(); const d = D(); return `<h2>Panel</h2><div class="cards">${Object.keys(CL).map(e => `<div class="card"><b>${mias().filter(s => s.estado === e).length}</b>${e}</div>`).join('')}</div>
    <p>Sesión: <b>${esc(U.nombre)}</b>. Cambie de usuario (arriba) para recorrer los flujos: estudiante crea la solicitud, el responsable de evaluación evalúa y aprueba, la autoridad autoriza (solicitudes de más de ${Q(LIMITE)} requieren ambas) y el auditor revisa la bitácora.</p>`; },
  convs: () => `<h2>Convocatorias</h2>${U.rol === 'admin' ? `<form class="f" data-f="conv">${inp('Nombre', 'nombre', 'text', 'required')}<label>Nivel<select name="nivel">${NIV}</select></label>${inp('Cupo', 'cupo', 'number', 'min="1" required')}${inp('Cierre', 'cierre', 'date', 'required')}<label>Comité<select name="comite">${opt(D().comites, k => k.nombre)}</select></label><button>Crear convocatoria</button></form>` : ''}
    ${U.rol === 'estudiante' ? T(['Nombre', 'Nivel', 'Cierre'], D().convs.map(c => [esc(c.nombre), c.nivel, c.cierre])) : T(['Nombre', 'Nivel', 'Cupo', 'Cierre', 'Comité'], D().convs.map(c => [esc(c.nombre), c.nivel, c.cupo, c.cierre, nm(D().comites, c.comite)]))}`,
  ests: () => `<h2>Estudiantes</h2><form class="f" data-f="est">${inp('Nombre completo', 'nombre', 'text', 'required')}${inp('Correo', 'correo', 'email', 'required')}<label>Nivel<select name="nivel">${NIV}</select></label>${inp('Institución', 'inst')}<button>Registrar estudiante</button></form>
    ${T(['Código', 'Nombre', 'Correo', 'Nivel', 'Institución'], D().ests.map(e => [e.id, esc(e.nombre), esc(e.correo), e.nivel, esc(e.inst)]))}`,
  comites: () => `<h2>Comités evaluadores</h2><form class="f" data-f="comite">${inp('Nombre del comité', 'nombre', 'text', 'required')}<fieldset><legend class="mut">Miembros</legend>${D().users.filter(u => u.rol === 'evaluador').map(u => `<label><span><input type="checkbox" name="m" value="${u.id}"> ${esc(u.nombre)}</span></label>`).join('')}</fieldset><button>Crear comité</button></form>
    ${T(['Comité', 'Miembros'], D().comites.map(k => [esc(k.nombre), k.miembros.map(m => nm(D().users, m)).join(', ')]))}`,
  sols: () => {
    const form = ['admin', 'estudiante'].includes(U.rol) ? `<form class="f" data-f="sol">${U.rol === 'admin' ? `<label>Estudiante<select name="est">${opt(D().ests, e => e.nombre)}</select></label>` : ''}<label>Convocatoria<select name="conv">${opt(D().convs, c => c.nombre)}</select></label>${inp('Monto solicitado (Q)', 'monto', 'number', 'min="1" step="0.01" required')}${inp('Descripción', 'desc', 'text', 'required')}<button>Enviar solicitud</button></form>` : '';
    const rows = mias().map(s => {
      const pol = PolicyFactory.para(s), paso = sigPaso(pol, s); let puede = false; if (s.estado === 'En evaluación') try { pol.check(U, s, paso); puede = true; } catch { }
      const ab = ['admin', 'estudiante'].includes(U.rol) && s.estado === 'Enviada', cerr = ['Autorizada', 'Rechazada'].includes(s.estado);
      return [s.id, nm(D().ests, s.est), nm(D().convs, s.conv), Q(s.monto) + (s.monto > LIMITE ? '<br><small class="mut">requiere 2 aprobaciones</small>' : ''), esc(s.desc), badge(s.estado),
        U.rol === 'estudiante' ? (s.estado === 'En evaluación' ? 'Aprobaciones: ' + s.aprob.filter(a => a.resultado === 'aprobada').length + ' de ' + pol.pasos.length : '—') : s.aprob.map(a => `${a.tipo}: ${a.resultado} (${esc(a.nombre)})`).join('<br>') || '—', s.docs.map(d => esc(d.nombre)).join('<br>') || '—',
        (ab ? `<button class="s" data-a="em" data-id="${s.id}">Editar monto</button><button class="s" data-a="ed" data-id="${s.id}">Editar descripción</button>` : '') +
        (['admin', 'estudiante'].includes(U.rol) && !cerr ? `<input type="file" data-doc="${s.id}" aria-label="Cargar documento">` : '') +
        (U.rol === 'evaluador' && !cerr ? `<button class="s" data-a="ev" data-id="${s.id}">Evaluar</button>` : '') +
        (puede ? `<button class="s" data-a="ap" data-id="${s.id}">Aprobar</button><button class="s n" data-a="rj" data-id="${s.id}">Rechazar</button>` : '')];
    });
    return `<h2>Solicitudes</h2>${form}${T(['Código', 'Estudiante', 'Convocatoria', 'Monto', 'Descripción', 'Estado', 'Aprobaciones', 'Documentos', 'Acciones'], rows)}`;
  },
  evals: () => `<h2>Evaluaciones</h2>${T(['Solicitud', 'Evaluador', 'Puntaje', 'Comentario', 'Fecha'], D().evals.map(v => [v.sol, esc(v.nombre), v.puntaje, esc(v.coment), fmt(v.fecha)]))}`,
  estado: () => { const s = D().sols.find(x => x.id === CODE.trim().toUpperCase() && (U.rol !== 'estudiante' || x.est === U.est)); const ns = D().notifs.filter(n => n.sol === s?.id);
    return `<h2>Consultar estado de una beca</h2><form class="f" data-f="estado">${inp('Código de solicitud', 'code', 'text', 'required placeholder="Ej. S1"')}<button>Consultar</button></form>
    ${CODE ? (s ? `<p><b>${s.id}</b> · ${nm(D().ests, s.est)} · ${Q(s.monto)} · ${badge(s.estado)}</p><h3>Historial</h3><ul class="tl">${s.hist.map(h => `<li>${badge(h.estado)} ${fmt(h.fecha)} ${U.rol === 'estudiante' ? '' : '— ' + esc(h.por)}</li>`).join('')}</ul>${U.rol === 'estudiante' ? '' : `<h3>Aprobaciones</h3><ul class="tl">${s.aprob.map(a => `<li>${a.tipo}: ${a.resultado} — ${esc(a.nombre)}, ${fmt(a.fecha)}</li>`).join('') || '<li class="mut">Sin decisiones aún</li>'}</ul>`}<h3>Notificaciones</h3><ul class="tl">${ns.map(n => `<li>${esc(n.msg)}</li>`).join('') || '<li class="mut">Ninguna</li>'}</ul>` : '<p class="mut">No se encontró la solicitud. Revise el código en la tabla de Solicitudes.</p>') : ''}`; },
  rep: () => { const t = D().sols, tot = t.length || 1; const filas = D().convs.map(c => { const x = t.filter(s => s.conv === c.id), n = e => x.filter(s => s.estado === e).length; return [esc(c.nombre), x.length, n('Enviada'), n('En evaluación'), n('Autorizada'), n('Rechazada'), Q(x.filter(s => s.estado === 'Autorizada').reduce((a, s) => a + s.monto, 0))]; });
    return `<h2>Reportes básicos</h2>${T(['Convocatoria', 'Solicitudes', 'Enviadas', 'En evaluación', 'Autorizadas', 'Rechazadas', 'Monto autorizado'], filas)}<h3>Distribución por estado</h3>${Object.keys(CL).map(e => { const n = t.filter(s => s.estado === e).length; return `<p>${e}: ${n}<div class="bar" style="width:${n / tot * 100}%"></div></p>`; }).join('')}<button data-a="csv">Descargar CSV</button>`; },
  notifs: () => `<h2>Notificaciones por cambio de estado</h2>${U.rol === 'admin' ? `<form class="f" data-f="cfg"><label><span><input type="checkbox" name="fallo" ${D().cfg.fallo ? 'checked' : ''}> Simular falla del canal de correo</span></label><button>Guardar</button></form><p class="mut">Con la falla activa, el cambio de estado se conserva y el error queda registrado en la notificación.</p>` : ''}
    ${T(['Fecha', 'Solicitud', 'Evento', 'Mensaje', 'Canales'], D().notifs.filter(n => U.rol !== 'estudiante' || n.est === U.est).map(n => [fmt(n.fecha), n.sol, esc(n.evento), esc(n.msg), n.canales.map(c => `${esc(c.c)}: ${c.ok ? 'enviada' : 'falló (' + esc(c.err) + ')'}`).join('<br>')]).reverse())}`,
  audit: () => `<h2>Auditoría de operaciones</h2><p>Integridad de la bitácora: <b>${AuditLog.verificar() ? 'íntegra' : 'ALTERADA'}</b>. Los registros solo se agregan, se encadenan con hash y no guardan contraseñas ni tokens.</p>
    ${T(['Fecha', 'Usuario', 'Operación', 'Solicitud', 'Detalle (dato / antes / después)'], D().audit.map(a => [fmt(a.fecha), esc(a.usuario), a.op, a.sol, `<code>${esc(JSON.stringify(a.det))}</code>`]).reverse())}`,
  pat: () => `<h2>Arquitectura y patrones de diseño</h2><p>Arquitectura en capas en el navegador: <b>ui.js</b> (presentación) → <b>Becas</b> (fachada de casos de uso) → reglas (políticas, auditoría, notificaciones) → <b>Store</b> (persistencia). Se eligió por su mantenibilidad, bajo acoplamiento y facilidad para absorber cambios como los memorandos del Product Owner.</p>
    ${T(['Patrón', 'Tipo', 'Dónde', '¿Qué problema resuelve?', 'Alternativas', '¿Por qué?', 'Ventajas'], [
      ['Singleton', 'Creacional', 'Store', 'Una sola fuente de datos', 'Variables globales, inyección', 'Acceso único y simple', 'Consistencia'],
      ['Factory', 'Creacional', 'PolicyFactory, ChannelFactory', 'Elegir política (monto) y canales', 'if/else en cada uso', 'Centraliza la decisión', 'Agregar reglas o canales sin tocar el flujo'],
      ['Facade', 'Estructural', 'Becas', 'La UI conocía demasiados detalles', 'Llamar módulos directamente', 'Interfaz única de casos de uso', 'Bajo acoplamiento'],
      ['Decorator', 'Estructural', 'audited()', 'Auditar sin ensuciar cada operación', 'Copiar código de log', 'Envuelve la operación', 'Auditoría uniforme'],
      ['Adapter', 'Estructural', 'Canales (app, correo)', 'Servicios con distinta API', 'Código por canal', 'Interfaz send() común', 'Nuevos canales sin cambios'],
      ['Observer', 'Comportamiento', 'Bus', 'Notificar sin acoplar al flujo', 'Llamada directa', 'Un error de notificación no rompe el trámite', 'Extensible'],
      ['Strategy', 'Comportamiento', 'PolSimple / PolDoble', 'Reglas de aprobación por monto', 'Condicionales dispersos', 'Cada regla encapsulada', 'Cambios normativos aislados']])}`
};

// Función para sincronizar y descargar los datos desde Supabase al iniciar sesión
async function cargarDatosSupabase() {
  try {
    const [convRes, estRes] = await Promise.all([
      supabaseClient.from('convocatorias').select('*'),
      supabaseClient.from('estudiantes').select('*')
    ]);

    if (!convRes.error && convRes.data && convRes.data.length > 0) {
      D().convs = convRes.data.map(c => ({
        id: 'c' + c.id,
        nombre: c.nombre,
        nivel: c.nivel,
        cupo: c.cupo,
        cierre: c.fecha_cierre ? c.fecha_cierre.slice(0, 10) : '',
        comite: c.comite_id
      }));
    }

    if (!estRes.error && estRes.data && estRes.data.length > 0) {
      D().ests = estRes.data.map(e => ({
        id: 'e' + e.id,
        nombre: e.nombre,
        correo: e.correo,
        nivel: e.nivel,
        inst: e.institucion
      }));
    }
  } catch (err) {
    console.error("Error al sincronizar con Supabase:", err);
  }
}

function render() {
  if (!NAV.some(n => n[0] === V && n[2].includes(U.rol))) V = 'panel';
  $('#nav').innerHTML = NAV.filter(n => n[2].includes(U.rol)).map(n => `<a href="#" data-v="${n[0]}" class="${n[0] === V ? 'on' : ''}">${U.rol === 'estudiante' && n[0] === 'panel' ? 'Mi portal' : n[1]}</a>`).join('');
  $('#main').innerHTML = VIEWS[V]();
}

const run = async fn => { 
  try { 
    await fn(); 
    await cargarDatosSupabase(); // Recargar datos frescos de Supabase tras cualquier operación
    toast('Operación realizada'); 
    const n = D().notifs.at(-1); 
    if (n?.canales.some(c => !c.ok)) toast('Estado guardado; falló un canal de notificación', 1); 
  } catch (x) { 
    toast(x.message, 1); 
  } 
  render(); 
};

const FORMS = {
  conv: async f => await Becas.crearConv(U, { nombre: f.get('nombre'), nivel: f.get('nivel'), cupo: +f.get('cupo'), cierre: f.get('cierre'), comite: f.get('comite') }),
  est: async f => await Becas.crearEst(U, { nombre: f.get('nombre'), correo: f.get('correo'), nivel: f.get('nivel'), inst: f.get('inst') }),
  comite: f => Becas.crearComite(U, { nombre: f.get('nombre'), miembros: f.getAll('m') }),
  sol: f => Becas.crearSol(U, { est: f.get('est'), conv: f.get('conv'), monto: f.get('monto'), desc: f.get('desc') }),
  estado: f => { CODE = f.get('code'); },
  cfg: f => { D().cfg.fallo = f.get('fallo') === 'on'; S(); }
};

const ACT = {
  em: id => { const v = prompt('Nuevo monto (Q):'); if (v !== null) Becas.editarSol(U, id, 'monto', v); },
  ed: id => { const v = prompt('Nueva descripción:'); if (v !== null) Becas.editarSol(U, id, 'desc', v); },
  ev: id => { const p = prompt('Puntaje (0-100):'); if (p !== null) Becas.evaluar(U, id, +p, prompt('Comentario:') || ''); },
  ap: id => Becas.decidir(U, id, true, prompt('Comentario (opcional):') || ''),
  rj: id => Becas.decidir(U, id, false, prompt('Motivo del rechazo:') || ''),
  csv: () => { const r = [['Solicitud', 'Estudiante', 'Convocatoria', 'Monto', 'Estado']].concat(D().sols.map(s => [s.id, nm(D().ests, s.est), nm(D().convs, s.conv), s.monto, s.estado])); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + r.map(x => x.map(c => '"' + String(c).replace(/&#\d+;/g, '') + '"').join(',')).join('\n')], { type: 'text/csv' })); a.download = 'reporte_becas.csv'; a.click(); }
};

document.addEventListener('submit', e => { const f = e.target.dataset.f; if (!f) return; e.preventDefault(); run(() => FORMS[f](new FormData(e.target))); });
document.addEventListener('click', e => {
  const v = e.target.closest('[data-v]'); if (v) { e.preventDefault(); V = v.dataset.v; return render(); }
  const b = e.target.closest('[data-a]'); if (b) run(() => ACT[b.dataset.a](b.dataset.id));
});
document.addEventListener('change', e => { const id = e.target.dataset.doc; if (id && e.target.files[0]) { const f = e.target.files[0]; run(() => Becas.adjuntar(U, id, { nombre: f.name, size: f.size })); } });
$('#reset').onclick = () => { if (confirm('¿Borrar todos los datos guardados y volver a los datos de ejemplo?')) { localStorage.removeItem('becas_v2'); Auth.salir(); location.reload(); } };

const boot = async () => {
  U = Auth.actual(); const on = !!U;
  $('#login').hidden = on; $('#app').hidden = !on; document.body.classList.toggle('est', on && U.rol === 'estudiante');
  if (!on) return;
  await cargarDatosSupabase(); // Carga los datos de Supabase antes de pintar la interfaz
  $('#me').textContent = U.nombre; $('#reset').hidden = U.rol !== 'admin';
  $('#ttl').textContent = U.rol === 'estudiante' ? 'Portal del Estudiante: Becas' : 'Plataforma Nacional para la Gestión Integral de Becas';
  V = 'panel'; render();
};

let TIPO = 'personal';
document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { TIPO = b.dataset.t; document.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x === b)); $('#le').textContent = ''; $('#lf').reset(); });

// Función de login asíncrona actualizada
$('#lf').onsubmit = async e => { 
  e.preventDefault(); 
  const f = new FormData(e.target); 
  try { 
    await Auth.login(f.get('u').trim(), f.get('p'), TIPO); 
    $('#lf').reset(); 
    $('#le').textContent = ''; 
    await boot(); 
  } catch (x) { 
    $('#le').textContent = x.message; 
    $('#lf').p.value = ''; 
  } 
};

$('#out').onclick = () => { Auth.salir(); boot(); };
boot();