/* ============================================================
   QUÉ TOCA HOY  (pantalla 01) E INGREDIENTES DEL BLOQUE (pantalla 05)
   ------------------------------------------------------------
   Pantalla de inicio: el bloque de cocina de esta tarde (la cena de
   hoy + el desayuno y la comida de mañana), con lo que hay que
   sacar, lo que falta y un acceso a cocinar.
   ============================================================ */

import { tocaHoy, fechaISO, sumarDias, franjasPorDefecto, franjasDeBloque, configurarBloque,
         restablecerBloque, faltasALaLista, resumenConsolidado, FRANJAS } from '../menu.js?v=34';
import { imagenReceta, puntoReceta, diaLargo, diaNumero, mesCorto, relativo, nombreFranja }
  from './receta-comun.js?v=34';
import { nombreIngrediente } from '../recetas.js?v=34';
import { colorDeReceta } from '../menu.js?v=34';
import { formatearCantidad } from '../unidades.js?v=34';
import { esFalta } from '../despensa.js?v=34';
import { esc, tap } from '../util.js?v=34';

let raiz = null, cb = {};
let pantalla = 'hoy';       // hoy | bloque

export function iniciarHoy(nodo, callbacks) {
  raiz = nodo; cb = callbacks;

  raiz.addEventListener('click', ev => {
    const t = ev.target;
    if (t.closest('#hy-ajustes')) { tap(); menuBloque(); return; }
    if (t.closest('#hy-editar')) { tap(); cb.alMenu(); return; }
    if (t.closest('#hy-ingredientes')) { tap(); pantalla = 'bloque'; pintarHoy(); return; }
    if (t.closest('#hy-cocinar')) { tap(); empezar(); return; }
    if (t.closest('#hy-atras')) { tap(); pantalla = 'hoy'; pintarHoy(); return; }
    if (t.closest('#hy-faltas') || t.closest('#bl-faltas')) { tap(); faltasALista(); return; }
    if (t.closest('#hy-planificar')) { tap(); cb.alMenu(); return; }

    const rec = t.closest('[data-hy-receta]');
    if (rec) { tap(); const [id, n] = rec.dataset.hyReceta.split('|'); cb.alVerReceta(id, +n); return; }

    const prod = t.closest('[data-bl-prod]');
    if (prod) document.dispatchEvent(new CustomEvent('abrir-ficha', { detail: +prod.dataset.blProd }));
  });
}

export function reiniciarHoy() { pantalla = 'hoy'; }

/* Cocinar: por ahora abre la primera receta del bloque en sus pasos.
   La guía que combina todas las recetas en un solo flujo llega después. */
function empezar() {
  const h = tocaHoy();
  if (!h.recetas.length) return;
  cb.alVerReceta(h.recetas[0].receta.id, h.recetas[0].raciones, { tab: 'pasos' });
}

function faltasALista() {
  const h = tocaHoy();
  const r = faltasALaLista(h.consolidado);
  document.dispatchEvent(new CustomEvent('aviso', { detail: r.anadidos
    ? `${r.anadidos} ${r.anadidos === 1 ? 'producto añadido' : 'productos añadidos'} a la lista`
    : r.yaEstaban ? 'Ya estaba todo en la lista' : 'No falta nada' }));
  pintarHoy();
}

/* Configurar qué franjas entran en el bloque de esta tarde */
function menuBloque() {
  const hoy = fechaISO();
  const candidatas = [...FRANJAS.map(f => ({ f: hoy, s: f.id })), ...FRANJAS.map(f => ({ f: sumarDias(hoy, 1), s: f.id }))];
  const activas = new Set(franjasDeBloque(hoy).map(x => `${x.f}|${x.s}`));
  document.dispatchEvent(new CustomEvent('abrir-hoja', { detail: {
    titulo: 'Qué entra en el bloque de esta tarde',
    opciones: [
      ...candidatas.map(x => ({
        texto: `${activas.has(`${x.f}|${x.s}`) ? '✓' : '＋'} ${nombreFranja(x.s)} · ${relativo(x.f, hoy).toLowerCase()}`,
        nota: activas.has(`${x.f}|${x.s}`) ? 'Tocar para quitarlo' : 'Tocar para incluirlo',
        accion: () => {
          const nuevas = activas.has(`${x.f}|${x.s}`)
            ? [...activas].filter(k => k !== `${x.f}|${x.s}`) : [...activas, `${x.f}|${x.s}`];
          configurarBloque(hoy, nuevas.map(k => { const [f, s] = k.split('|'); return { f, s }; }));
          pintarHoy();
          setTimeout(menuBloque, 0);                  // se reabre para seguir ajustando
        } })),
      { texto: 'Restablecer lo habitual', nota: 'Cena de hoy, desayuno y comida de mañana',
        accion: () => { restablecerBloque(hoy); pintarHoy(); } },
      { texto: 'Hecho' }
    ] } }));
}

/* ---------- pantalla 01 ---------- */

export function pintarHoy() {
  if (!raiz) return;
  if (pantalla === 'bloque') { pintarBloque(); return; }

  const hoy = fechaISO();
  const h = tocaHoy(hoy);
  const n = h.recetas.length;
  const nombresFalta = h.faltas.map(x => nombreIngrediente({ id: x.id, texto: x.texto })).slice(0, 4);

  raiz.innerHTML = `
    <div class="hy-cab">
      <div><small class="rv-meta">${diaLargo(hoy).toUpperCase()} · ${diaNumero(hoy)} ${mesCorto(hoy).toUpperCase()}</small>
        <h1>${n ? `Esta tarde toca cocinar ${n} ${n === 1 ? 'plato' : 'platos'}` : 'Hoy no hay nada que cocinar'}</h1></div>
      <button class="rv-atras" id="hy-ajustes" aria-label="Elegir qué entra en el bloque">⚙</button>
    </div>

    ${n ? `
    <section class="hy-bloque" aria-label="Bloque de esta tarde">
      <div class="hy-bloque-cab"><b>Bloque de esta tarde</b><button class="rv-link" id="hy-editar">Editar menú</button></div>
      <ul class="hy-lista">
        ${h.recetas.map(x => `
          <li><button class="hy-rec" data-hy-receta="${x.receta.id}|${x.raciones}">
            ${imagenReceta(x.receta, 'rc-mini')}
            <span class="hy-rec-t"><small class="rv-meta">${nombreFranja(x.franja).toUpperCase()} · ${relativo(x.fecha, hoy)}</small>
              <b>${esc(x.receta.nombre)}</b>
              <small>${x.raciones} ${x.raciones === 1 ? 'ración' : 'raciones'}${x.receta.pasos?.length ? ` · ${x.receta.pasos.length} pasos` : ''}</small></span>
            ${puntoReceta(x.receta)}
          </button></li>`).join('')}
      </ul>
      <p class="hy-resumen"><span>${h.resumen.ingredientes} INGREDIENTES</span>
        ${h.resumen.faltan ? `<span class="hy-falta">FALTAN ${h.resumen.faltan}</span>` : h.resumen.sinComprobar ? `<span>${h.resumen.sinComprobar} SIN COMPROBAR</span>` : '<span class="hy-ok">TODO EN CASA</span>'}</p>
      <div class="hy-botones">
        <button class="btn-principal" id="hy-cocinar">▶ Empezar a cocinar</button>
        <button class="btn-secundario" id="hy-ingredientes">Ingredientes</button>
      </div>
    </section>

    ${h.faltas.length ? `
    <div class="hy-aviso" role="status">
      <span aria-hidden="true">⚠</span>
      <div><b>Te ${h.faltas.length === 1 ? 'falta 1 cosa' : `faltan ${h.faltas.length} cosas`}</b>
        <small>${nombresFalta.map(esc).join(' · ')}${h.faltas.length > 4 ? ' · …' : ''}</small></div>
      <button class="btn-secundario" id="hy-faltas">A la lista</button>
    </div>` : ''}

    ${h.mananaNombres.length ? `
    <p class="hy-manana"><small class="rv-meta">MAÑANA POR LA TARDE</small>${h.mananaNombres.map(esc).join(' · ')}</p>` : ''}`
    : `
    <section class="hy-vacio">
      <p>No hay nada planificado para esta tarde.</p>
      <p class="ga-nota">Elige qué se cocina cada día y aquí verás lo que toca, con sus ingredientes y lo que te falta.</p>
      <button class="btn-principal" id="hy-planificar">Planificar el menú</button>
    </section>`}`;
}

/* ---------- pantalla 05: ingredientes consolidados ---------- */

function estadoLinea(f) {
  if (!f.id) return { t: '', c: '' };
  if (f.estado === 'desconocido') return { t: '? SIN COMPROBAR', c: 'bl-desc' };
  const tengo = f.tengo?.cant != null
    ? ` ${formatearCantidad(f.tengo.unidad === 'ud' ? f.tengo.cant : (f.tengo.cant >= 1000 ? f.tengo.cant / 1000 : f.tengo.cant),
        f.tengo.unidad === 'ud' ? 'ud' : f.tengo.cant >= 1000 ? (f.tengo.unidad === 'ml' ? 'l' : 'kg') : f.tengo.unidad).toUpperCase()}` : '';
  return { hay: { t: `✓ HAY${tengo}`, c: 'bl-hay' }, acaba: { t: `SE ACABA${tengo}`, c: 'bl-acaba' },
    falta: { t: `× FALTA${tengo ? ' · HAY' + tengo : ''}`, c: 'bl-falta' }, agotado: { t: '× HAY 0', c: 'bl-falta' } }[f.estado] || { t: '', c: '' };
}

function cantidadTexto(f) {
  if (f.sinCantidad) return 'AL GUSTO';
  const u = f.unidad;
  return formatearCantidad(u === 'ud' ? f.total : f.total >= 1000 ? f.total / 1000 : f.total,
    u === 'ud' ? 'ud' : f.total >= 1000 ? (u === 'ml' ? 'l' : 'kg') : u).toUpperCase();
}

function pintarBloque() {
  const hoy = fechaISO();
  const h = tocaHoy(hoy);
  const lista = h.consolidado;
  const r = resumenConsolidado(lista);
  const vistas = new Map();
  for (const x of h.recetas) vistas.set(x.receta.id, x);
  const raciones = h.recetas.reduce((a, x) => a + x.raciones, 0);

  raiz.innerHTML = `
    <div class="rv-cab">
      <button class="barra-btn rv-atras" id="hy-atras" aria-label="Volver">‹</button>
      <div><small class="rv-meta">BLOQUE · ${diaLargo(hoy).toUpperCase()} TARDE</small><h1>Qué sacar y cuánto</h1></div>
    </div>
    <p class="bl-leyenda">${[...vistas.values()].map(x => `<span>${puntoReceta(x.receta)}${esc(nombreFranja(x.franja))}: ${esc(x.receta.nombre)}</span>`).join('')}</p>

    <div class="bl-ticket" role="table" aria-label="Ingredientes del bloque">
      <p class="bl-cab">${vistas.size} RECETAS · ${raciones} RACIONES · ${diaNumero(hoy)}/${String(new Date().getMonth() + 1).padStart(2, '0')}</p>
      ${lista.length ? lista.map(f => {
        const e = estadoLinea(f);
        return `<button class="bl-fila" role="row" ${f.id ? `data-bl-prod="${f.id}"` : ''}>
          <span class="bl-linea1"><b>${esc(nombreIngrediente({ id: f.id, texto: f.texto }).toUpperCase())}</b><b>${esc(cantidadTexto(f))}</b></span>
          <span class="bl-linea2"><span class="bl-desglose">${f.desglose.map(d => `${puntoReceta(d.receta)}${d.cant == null ? 'al gusto' : esc(formatearCantidad(d.unidad === 'ud' ? d.cant : d.cant >= 1000 ? d.cant / 1000 : d.cant, d.unidad === 'ud' ? 'ud' : d.cant >= 1000 ? (d.unidad === 'ml' ? 'l' : 'kg') : d.unidad))}`).join(' ')}</span>
            <span class="${e.c}">${esc(e.t)}</span></span>
        </button>`;
      }).join('') : '<p class="ga-nota" style="padding:1rem">No hay recetas en el bloque de esta tarde.</p>'}
      <p class="bl-pie"><span>${r.ingredientes} INGREDIENTES</span><span class="${r.faltan ? 'bl-falta' : ''}">FALTAN ${r.faltan}</span></p>
    </div>

    <div class="rv-pie">
      <div class="hy-botones">
        <button class="btn-secundario" id="bl-faltas" ${r.faltan ? '' : 'disabled'}>Faltas a la lista</button>
        <button class="btn-principal" id="hy-cocinar">▶ Cocinar</button>
      </div>
    </div>`;
}
