/* ============================================================
   MENÚ SEMANAL (pantalla 02) Y SELECTOR DE RECETA (pantalla 03)
   ------------------------------------------------------------
   Calendario de la semana con desayuno, comida y cena. Las recetas
   se asignan A MANO: nada se planifica solo. Una franja puede tener
   varias recetas y un número de raciones.
   ============================================================ */

import { recetas as todasLasRecetas, recetaPorId } from '../recetas.js?v=39';
import { FRANJAS, diaDe, recetasDeFranja, anadirReceta, quitarReceta, fijarRaciones,
         marcarFuera, copiarDia, copiarSemana, vaciarDia, semana, lunesDe, sumarDias, fechaISO,
         bloqueDe, consolidarSemana, faltasALaLista, disponibilidadReceta, FRANJA_POR_ID, cabeEnFranja, costeDe }
  from '../menu.js?v=39';
import { imagenReceta, puntoReceta, diaCorto, diaLargo, diaNumero, mesCorto, nombreFranja,
         pregunta, etiquetaDisponibilidad } from './receta-comun.js?v=39';
import { mostrarAcaba } from './acaba.js?v=39';
import { personas } from '../hogar.js?v=39';
import { ultimaVezCocinada, textoHace } from '../cocina.js?v=39';
import { normalizar, esc, tap } from '../util.js?v=39';

/* Los tres platos principales van en columnas; la merienda, en una franja fina debajo */
const PRINCIPALES = ['desayuno', 'comida', 'cena'];

let raiz = null, ancla = fechaISO(), cb = {};
let sel = null;     // selector abierto: { fecha, franja, filtro, q, elegida, raciones }

export function iniciarMenu(nodo, callbacks) {
  raiz = nodo; cb = callbacks;

  raiz.addEventListener('click', ev => {
    const t = ev.target;

    if (sel) { clicSelector(t); return; }

    if (t.closest('#mn-ant')) { tap(); ancla = sumarDias(ancla, -7); pintarMenu(); return; }
    if (t.closest('#mn-sig')) { tap(); ancla = sumarDias(ancla, 7); pintarMenu(); return; }
    if (t.closest('#mn-hoy')) { tap(); ancla = fechaISO(); pintarMenu(); return; }
    if (t.closest('#mn-recetas')) { cb.alRecetas(); return; }
    if (t.closest('#mn-copiar')) { copiarSemanaPasada(); return; }
    if (t.closest('#mn-generar')) { generarLista(); return; }

    const celda = t.closest('[data-mn-celda]');
    if (celda) {
      const [fecha, franja] = celda.dataset.mnCelda.split('|');
      tap(); abrirCelda(fecha, franja);
    }
  });

  raiz.addEventListener('input', ev => {
    if (!sel || ev.target.id !== 'sl-buscar') return;
    sel.q = ev.target.value;
    const c = raiz.querySelector('#sl-grid');
    if (c) c.innerHTML = gridSelector();
  });
}

/* ---------- semana ---------- */

function rangoTexto(dias) {
  const a = dias[0], b = dias[6];
  return `${diaNumero(a)}${mesCorto(a) !== mesCorto(b) ? ' ' + mesCorto(a) : ''} - ${diaNumero(b)} ${mesCorto(b).toUpperCase()}`;
}

function celdaHTML(fecha, franja, enBloque) {
  const d = diaDe(fecha);
  const rs = recetasDeFranja(fecha, franja);
  const atrib = `data-mn-celda="${fecha}|${franja}"`;
  const fina = franja === 'merienda' ? ' mn-fina' : '';        // la merienda ocupa una franja fina bajo el día
  if (d.fuera[franja]) return `<button class="mn-celda mn-fuera${fina}" ${atrib}>${nombreFranja(franja)} fuera</button>`;
  if (!rs.length) return `<button class="mn-celda mn-vacia${fina}" ${atrib} aria-label="Añadir receta: ${diaLargo(fecha)} ${nombreFranja(franja).toLowerCase()}">${fina ? '+ Merienda' : '+'}</button>`;
  return `<button class="mn-celda ${enBloque ? 'mn-bloque' : ''}${fina}" ${atrib}>${fina ? '<small class="mn-etq">MERIENDA</small>' : ''}
    ${rs.map(x => `<span class="mn-rec">${puntoReceta(x.receta)}<span>${esc(x.receta.nombre)}${x.raciones !== personas() ? ` <small>×${x.raciones}</small>` : ''}</span></span>`).join('')}</button>`;
}

/* Coste aproximado de los ingredientes de lo planificado esta semana */
function costeSemana(dias) {
  const cons = consolidarSemana(dias);
  if (!cons.length) return '';
  const c = costeDe(cons);
  if (!c.conocidos) return '';
  return `<p class="mn-coste">Ingredientes de la semana: ≈ <b>${c.total.toFixed(2).replace('.', ',')} €</b>${c.sinPrecio ? ` · ${c.sinPrecio} sin precio` : ''}</p>`;
}

export function pintarMenu() {
  if (!raiz) return;
  if (sel) { pintarSelector(); return; }

  const dias = semana(ancla);
  const hoy = fechaISO();
  /* El bloque que se resalta: el de hoy si está en esta semana; si no, el del lunes */
  const base = dias.includes(hoy) ? hoy : dias[0];
  const enBloque = new Set(bloqueDe(base).map(x => `${x.fecha}|${x.franja}`));

  raiz.innerHTML = `
    <div class="mn-cab">
      <h1>Menú</h1>
      <div class="mn-semana">
        <button class="mn-flecha" id="mn-ant" aria-label="Semana anterior">‹</button>
        <button class="mn-rango" id="mn-hoy" aria-label="Volver a esta semana">${rangoTexto(dias)}</button>
        <button class="mn-flecha" id="mn-sig" aria-label="Semana siguiente">›</button>
      </div>
    </div>
    <p class="mn-leyenda"><i class="mn-cuadro" aria-hidden="true"></i>Bloque de cocina del ${diaLargo(base)} por la tarde</p>
    ${costeSemana(dias)}

    <div class="mn-tabla" role="grid" aria-label="Menú de la semana">
      <div class="mn-cols" aria-hidden="true"><span></span>${PRINCIPALES.map(f => `<span>${FRANJA_POR_ID[f].corto}</span>`).join('')}</div>
      ${dias.map(f => `
        <div class="mn-fila" role="row">
          <div class="mn-dia ${f === hoy ? 'mn-hoy' : ''}"><small>${diaCorto(f)}</small><b>${diaNumero(f)}</b></div>
          ${PRINCIPALES.map(fr => celdaHTML(f, fr, enBloque.has(`${f}|${fr}`))).join('')}
          ${celdaHTML(f, 'merienda', enBloque.has(`${f}|merienda`))}
        </div>`).join('')}
    </div>

    <div class="mn-acciones">
      <button class="btn-secundario" id="mn-copiar">Copiar semana pasada</button>
      <button class="btn-principal" id="mn-generar">Generar lista</button>
    </div>
    <div class="rt-extras"><button class="rv-link" id="mn-recetas">Ver todas las recetas</button></div>`;
}

/* ---------- acciones de una celda ---------- */

function abrirCelda(fecha, franja) {
  const rs = recetasDeFranja(fecha, franja);
  const d = diaDe(fecha);
  const titulo = `${diaLargo(fecha)} ${diaNumero(fecha)} · ${nombreFranja(franja).toLowerCase()}`;

  /* Vacía: directo al selector */
  if (!rs.length && !d.fuera[franja]) { abrirSelector(fecha, franja); return; }

  const opciones = [
    { texto: rs.length ? 'Añadir otra receta' : 'Elegir una receta', accion: () => abrirSelector(fecha, franja) }
  ];
  for (const x of rs) {
    opciones.push({ texto: `Ver «${x.receta.nombre}»`, nota: `${x.raciones} ${x.raciones === 1 ? 'ración' : 'raciones'}`,
      accion: () => cb.alVerReceta(x.receta.id, x.raciones) });
    opciones.push({ texto: `Raciones de «${x.receta.nombre}»: ${x.raciones}`, nota: 'Tocar para cambiar',
      accion: () => setTimeout(() => menuRaciones(fecha, franja, x.receta, x.raciones), 0) });
    opciones.push({ texto: `Quitar «${x.receta.nombre}»`, peligro: true,
      accion: () => { quitarReceta(fecha, franja, x.receta.id); pintarMenu(); } });
  }
  if (!d.fuera[franja]) opciones.push({ texto: `${nombreFranja(franja)} fuera de casa`, nota: 'No se cocina ese día',
    accion: () => { marcarFuera(fecha, franja); pintarMenu(); } });
  else opciones.push({ texto: 'Volver a cocinar en casa', accion: () => { marcarFuera(fecha, franja, false); pintarMenu(); } });
  opciones.push({ texto: 'Copiar este día a otro…', accion: () => setTimeout(() => menuCopiarDia(fecha), 0) });
  opciones.push({ texto: 'Vaciar este día', peligro: true, accion: () => { vaciarDia(fecha); pintarMenu(); } });

  document.dispatchEvent(new CustomEvent('abrir-hoja', { detail: { titulo, opciones } }));
}

function menuRaciones(fecha, franja, receta, actual) {
  document.dispatchEvent(new CustomEvent('abrir-hoja', { detail: {
    titulo: `Raciones de «${receta.nombre}»`,
    opciones: [1, 2, 3, 4, 6].map(n => ({
      texto: `${n} ${n === 1 ? 'ración' : 'raciones'}${n === actual ? ' ✓' : ''}`,
      accion: () => { fijarRaciones(fecha, franja, receta.id, n); pintarMenu(); }
    })) } }));
}

function menuCopiarDia(desde) {
  const otros = semana(desde).filter(f => f !== desde);
  document.dispatchEvent(new CustomEvent('abrir-hoja', { detail: {
    titulo: `Copiar el ${diaLargo(desde)} a…`,
    opciones: otros.map(f => ({
      texto: `${diaLargo(f)} ${diaNumero(f)}`,
      nota: diaDe(f) && FRANJAS.some(x => diaDe(f)[x.id].length) ? 'Sustituye lo que hay' : undefined,
      accion: () => {
        document.dispatchEvent(new CustomEvent('aviso', { detail: copiarDia(desde, f) ? 'Día copiado' : 'No hay nada que copiar' }));
        pintarMenu();
      } })) } }));
}

function copiarSemanaPasada() {
  const actual = lunesDe(ancla), pasada = sumarDias(actual, -7);
  const hay = semana(pasada).some(f => FRANJAS.some(x => diaDe(f)[x.id].length));
  if (!hay) { document.dispatchEvent(new CustomEvent('aviso', { detail: 'La semana pasada no tiene menú' })); return; }
  document.dispatchEvent(new CustomEvent('abrir-hoja', { detail: {
    titulo: 'Copiar la semana pasada',
    opciones: [
      { texto: 'Copiar y sustituir esta semana', nota: 'Lo que hay ahora en esta semana se pierde', peligro: true,
        accion: () => {
          const n = copiarSemana(pasada, actual);
          document.dispatchEvent(new CustomEvent('aviso', { detail: `${n} ${n === 1 ? 'día copiado' : 'días copiados'}` }));
          pintarMenu();
        } },
      { texto: 'Cancelar' }] } }));
}

/* «Generar lista»: todo lo que falta para lo planificado, a la lista */
function generarLista() {
  const cons = consolidarSemana(semana(ancla));
  if (!cons.length) { document.dispatchEvent(new CustomEvent('aviso', { detail: 'Todavía no hay nada planificado esta semana' })); return; }
  /* También entra lo que no se sabe si hay en casa: si no, con la despensa
     vacía la lista saldría vacía. Lo que se sabe que hay, no. */
  const r = faltasALaLista(cons, { incluirDesconocidos: true });
  const msg = r.anadidos
    ? `${r.anadidos} ${r.anadidos === 1 ? 'producto añadido' : 'productos añadidos'} a la lista${r.sinSaber ? ` · ${r.sinSaber} sin saber si los tienes` : ''}${r.yaEstaban ? ` · ${r.yaEstaban} ya estaban` : ''}`
    : r.yaEstaban ? 'Todo lo necesario ya estaba en la lista' : 'Tienes en casa todo lo planificado';
  document.dispatchEvent(new CustomEvent('aviso', { detail: msg }));
  if (r.anadidos) cb.alResumen();
}

/* ---------- selector de receta (pantalla 03) ---------- */

function abrirSelector(fecha, franja) {
  sel = { fecha, franja, filtro: 'todas', q: '', elegida: null, raciones: personas() };
  mostrarAcaba(false);               // el botón flotante taparía el pie del selector
  pintarSelector();
  document.querySelector('.vista:not([hidden])')?.scrollTo?.(0, 0);
}
function cerrarSelector() { sel = null; mostrarAcaba(true); pintarMenu(); }

function recetasDelSelector() {
  const q = normalizar(sel.q.trim());
  /* Solo lo que se puede asignar en este momento del día */
  let lista = todasLasRecetas().filter(r => cabeEnFranja(r, sel.franja));
  if (q) lista = lista.filter(r => normalizar(r.nombre).includes(q)
    || r.ingredientes.some(i => normalizar(String(i.nombre || i.texto || '')).includes(q)));
  if (sel.filtro === 'fav') lista = lista.filter(r => r.favorita);
  if (sel.filtro === 'tengo') lista = lista.filter(r => disponibilidadReceta(r).todo);
  return [...lista].sort((a, b) => (b.activa - a.activa) || a.nombre.localeCompare(b.nombre, 'es'));
}

function gridSelector() {
  const lista = recetasDelSelector();
  if (!lista.length) return `<p class="ga-nota" style="padding:1.4rem 0;grid-column:1/-1">${
    sel.filtro === 'tengo' ? 'Ninguna receta se puede hacer del todo con lo que sé que hay en casa.'
    : sel.filtro === 'fav' ? `Todavía no has marcado ninguna ${nombreFranja(sel.franja).toLowerCase()} con el corazón.`
    : sel.q.trim() ? `No hay ninguna receta de ${nombreFranja(sel.franja).toLowerCase()} con ese nombre.`
    : `Todavía no hay recetas de ${nombreFranja(sel.franja).toLowerCase()}. Puedes crearlas en «Ver todas las recetas».`}</p>`;
  return lista.map(r => {
    const e = etiquetaDisponibilidad(disponibilidadReceta(r));
    return `<button class="sl-card" data-sl-r="${r.id}" aria-pressed="${sel.elegida === r.id}">
      ${imagenReceta(r, 'rc-tarjeta')}
      <b>${esc(r.nombre)}</b>
      <span class="sl-pie"><small>${r.ingredientes.length} ING.${ultimaVezCocinada(r.id) ? ` · ${esc(textoHace(ultimaVezCocinada(r.id)))}` : ''}</small>${e ? `<span class="rc-chip ${e.clase}">${e.texto}</span>` : ''}</span>
    </button>`;
  }).join('');
}

function pintarSelector() {
  const { fecha, franja } = sel;
  const r = sel.elegida ? recetaPorId(sel.elegida) : null;
  raiz.innerHTML = `
    <div class="rv-cab">
      <button class="barra-btn rv-atras" id="sl-cerrar" aria-label="Cerrar">×</button>
      <div><small class="rv-meta">${diaLargo(fecha).toUpperCase()} ${diaNumero(fecha)} · ${FRANJA_POR_ID[franja].corto}</small><h1>${pregunta(franja)}</h1></div>
    </div>
    <div class="pr-buscar"><input id="sl-buscar" type="search" value="${esc(sel.q)}" placeholder="Buscar receta o ingrediente" autocomplete="off" aria-label="Buscar receta"></div>
    <div class="pr-chips" role="group" aria-label="Filtros">
      ${[['todas', 'Todas'], ['tengo', 'Con lo que tengo'], ['fav', 'Favoritas']].map(([id, t]) =>
        `<button data-sl-filtro="${id}" aria-pressed="${sel.filtro === id}">${t}</button>`).join('')}
    </div>
    <p class="sl-solo">Solo recetas de ${nombreFranja(franja).toLowerCase()}</p>
    <div class="sl-grid" id="sl-grid">${gridSelector()}</div>
    <div class="rv-pie sl-pie-fijo">
      <div class="sl-raciones"><div><b>Raciones</b><small>Las cantidades se ajustan solas</small></div>
        <span class="res-pasos"><button id="sl-menos" aria-label="Menos raciones">−</button><span>${sel.raciones}</span><button id="sl-mas" aria-label="Más raciones">+</button></span></div>
      <button class="btn-principal" id="sl-anadir" ${r ? '' : 'disabled'}>${r ? `Añadir ${esc(r.nombre.toLowerCase())} al ${diaLargo(fecha)}` : 'Elige una receta'}</button>
    </div>`;
}

function clicSelector(t) {
  if (t.closest('#sl-cerrar')) { tap(); cerrarSelector(); return; }
  const f = t.closest('[data-sl-filtro]');
  if (f) { tap(); sel.filtro = f.dataset.slFiltro; pintarSelector(); return; }
  const c = t.closest('[data-sl-r]');
  if (c) {
    tap();
    sel.elegida = c.dataset.slR;
    sel.raciones = personas();                 // las raciones del hogar, no las de la receta
    pintarSelector(); return;
  }
  if (t.closest('#sl-menos')) { tap(); sel.raciones = Math.max(1, sel.raciones - 1); pintarSelector(); return; }
  if (t.closest('#sl-mas')) { tap(); sel.raciones = Math.min(20, sel.raciones + 1); pintarSelector(); return; }
  if (t.closest('#sl-anadir') && sel.elegida) {
    const res = anadirReceta(sel.fecha, sel.franja, sel.elegida, sel.raciones);
    document.dispatchEvent(new CustomEvent('aviso', { detail: res.ok ? 'Añadida al menú' : res.error }));
    cerrarSelector();
  }
}

/* Al salir de la pestaña se cierra el selector, para volver al calendario */
export function reiniciarMenu() { sel = null; }
export function fechaDelMenu(f) { ancla = f; }
