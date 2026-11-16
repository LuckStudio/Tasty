/* ============================================================
   REVISIÓN DEL TICKET LÍNEA A LÍNEA  (pantallas 15 y 16)
   ------------------------------------------------------------
   Tras escanear, cada línea del ticket se resuelve de una de estas
   formas, y «crear nuevo» NUNCA es lo que se propone primero si hay
   candidatos parecidos:

     · enlazada sola     la memoria o un parecido muy claro
     · «Sí, es este»     se acepta la propuesta
     · «Cambiar»/enlazar se elige otro producto con el buscador
     · crear nuevo       queda como producto nuevo (a catalogar)

   Este módulo solo pinta y modifica el borrador. Guardar, volver y
   pasar al editor clásico lo decide quien lo abre (callbacks).
   ============================================================ */

import { POR_ID, PRODUCTOS } from '../estado.js?v=22';
import { TIENDA_POR_ID } from '../tiendas.js?v=22';
import { buscarCandidatos } from '../escaner.js?v=22';
import { seccionDe, SECCION_POR_ID } from '../secciones.js?v=22';
import { textosDe } from '../alias.js?v=22';
import { iconoHTML } from '../iconos.js?v=22';
import { normalizar, euros, esc, tap } from '../util.js?v=22';

let e = null;   // estado de la revisión; null = cerrada

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function abrirRevision(borrador, callbacks) {
  e = { borrador, ...callbacks, filtro: 'revisar', enlazando: null, busqueda: '', elegido: null, recordar: true };
}
export function cerrarRevision() { e = null; }
export function revisionAbierta() { return !!e; }

/* ---------- estado de cada línea ---------- */

export const resuelta = l => l.id != null || !!l.nuevoConfirmado;

export function conteos(borrador) {
  const lineas = borrador.lineas;
  return {
    total: lineas.length,
    pendientes: lineas.filter(l => !resuelta(l)).length,
    solas: lineas.filter(l => l.id != null && (l.porMemoria || l.autoEnlazada)).length,
    nuevas: lineas.filter(l => l.nuevoConfirmado && l.id == null).length
  };
}

/* ---------- pintado ---------- */

function cabecera(b) {
  const tienda = b.tienda ? (TIENDA_POR_ID[b.tienda]?.nombre || b.tienda) : (b.escaneado?.tiendaTexto || 'Sin supermercado');
  const [, m, d] = (b.fecha || '').split('-');
  const fecha = m ? `${+d} ${MESES[+m - 1]}` : '';
  return `${esc(tienda).toUpperCase()} · ${fecha} · ${b.lineas.length} LÍNEAS`;
}

function avisoCuadre(b) {
  const x = b.escaneado;
  if (!x) return '';
  const suma = euros(b.lineas.reduce((a, l) => a + (l.precio ?? 0), 0));
  if (x.totalLeido == null) return `<p class="rv-cuadre">Suma ${suma}</p>`;
  const ok = Math.abs(b.lineas.reduce((a, l) => a + (l.precio ?? 0), 0) - x.totalLeido) < 0.02;
  return ok
    ? `<p class="rv-cuadre rv-ok">Suma ${suma} · cuadra con el ticket</p>`
    : `<p class="rv-cuadre rv-mal">Suma ${suma} · el ticket dice ${euros(x.totalLeido)}. Puede faltar o sobrar una línea.</p>`;
}

function tarjeta(l, i) {
  const precio = `<span class="rv-precio">${l.precio != null ? euros(l.precio).replace(/\s/g, ' ') : '—'}</span>`;
  const cab = `<div class="rv-linea-cab"><span class="rv-texto">${esc(l.textoTicket || l.n)}</span>${precio}</div>`;

  if (l.id != null) {
    const p = POR_ID[l.id];
    return `<article class="rv-card">${cab}
      <div class="rv-es"><span class="rv-ico">${p ? iconoHTML(p) : ''}</span>
        <div><small>${l.porMemoria ? 'Recordado' : 'Enlazado con'}</small><b>${esc(p?.n || l.n)}</b></div>
        <button class="rv-link" data-rv-cambiar="${i}">Cambiar</button></div></article>`;
  }
  if (l.nuevoConfirmado) {
    return `<article class="rv-card">${cab}
      <div class="rv-es"><span class="rv-ico" aria-hidden="true">＋</span>
        <div><small>Se creará como</small><b>${esc(l.n)}</b></div>
        <button class="rv-link" data-rv-cambiar="${i}">Cambiar</button></div></article>`;
  }

  const cand = buscarCandidatos(l.textoTicket || l.n, PRODUCTOS, { max: 2 });
  const sug = l.sugerido && POR_ID[l.sugerido.id];
  /* Una propuesta: la que hizo el escáner (muy probable) o, si hay un
     único parecido claro, ese (probable). */
  const propuesta = sug || (cand.length === 1 ? cand[0] : null);
  if (propuesta) {
    return `<article class="rv-card">${cab}
      <div class="rv-es"><span class="rv-ico">${iconoHTML(propuesta)}</span>
        <div><small>Creemos que es</small><b>${esc(propuesta.n)}</b></div>
        <span class="rv-chip">${sug ? 'Muy probable' : 'Probable'}</span></div>
      <div class="rv-acciones">
        <button class="btn-principal rv-si" data-rv-cand="${i}:${propuesta.id}">Sí, es este</button>
        <button class="btn-secundario" data-rv-cambiar="${i}">Cambiar</button></div></article>`;
  }
  if (cand.length >= 2) {
    return `<article class="rv-card">${cab}
      <p class="rv-nota">Hay dos productos parecidos. ¿Cuál es?</p>
      <div class="rv-cands">${cand.map(p => `
        <button class="rv-cand" data-rv-cand="${i}:${p.id}"><span class="rv-ico">${iconoHTML(p)}</span>${esc(p.n)}</button>`).join('')}</div>
      <div class="rv-acciones">
        <button class="btn-secundario" data-rv-cambiar="${i}">Otro producto</button>
        <button class="btn-secundario" data-rv-nuevo="${i}">Crear nuevo</button></div></article>`;
  }
  return `<article class="rv-card">${cab}
    <p class="rv-nota">No lo reconocemos. Enlázalo con uno tuyo para no duplicarlo.</p>
    <div class="rv-acciones">
      <button class="btn-principal rv-enlazar" data-rv-cambiar="${i}">Enlazar</button>
      <button class="btn-secundario" data-rv-nuevo="${i}">Crear nuevo</button></div></article>`;
}

function pintarLista(raiz) {
  const b = e.borrador, c = conteos(b);
  const lineas = b.lineas.map((l, i) => ({ l, i }));
  const visibles = lineas.filter(({ l }) => e.filtro === 'revisar' ? !resuelta(l) : resuelta(l));

  raiz.innerHTML = `
    <div class="rv-cab">
      <button class="barra-btn rv-atras" id="rv-atras" aria-label="Volver">‹</button>
      <div><small class="rv-meta">${cabecera(b)}</small><h1>Revisa tu ticket</h1></div>
    </div>
    <div class="rv-progreso">
      <div class="rv-barra" role="progressbar" aria-valuemin="0" aria-valuemax="${c.total}" aria-valuenow="${c.total - c.pendientes}"><i style="width:${c.total ? Math.round((c.total - c.pendientes) / c.total * 100) : 0}%"></i></div>
      <span>${c.solas} enlazadas solas</span>
    </div>
    ${avisoCuadre(b)}
    <div class="rv-tabs" role="tablist">
      <button role="tab" data-rv-tab="revisar" aria-selected="${e.filtro === 'revisar'}">Por revisar · ${c.pendientes}</button>
      <button role="tab" data-rv-tab="listas" aria-selected="${e.filtro === 'listas'}">Enlazadas · ${c.total - c.pendientes}</button>
    </div>
    <div class="rv-lista">
      ${visibles.length ? visibles.map(({ l, i }) => tarjeta(l, i)).join('')
        : `<p class="ga-nota" style="padding:1.4rem 0">${e.filtro === 'revisar' ? 'No queda nada por revisar. Ya puedes guardar la compra.' : 'Todavía no hay líneas enlazadas.'}</p>`}
    </div>
    <div class="rv-pie">
      <p>${c.pendientes ? `Quedan ${c.pendientes} sin revisar: se guardarán como productos nuevos.` : 'Recordaremos cada enlace para los próximos tickets de ' + esc(b.tienda ? (TIENDA_POR_ID[b.tienda]?.nombre || 'esa cadena') : 'esa cadena') + '.'}</p>
      <button class="btn-principal" id="rv-guardar">Guardar compra</button>
      <button class="rv-link rv-crear" id="rv-editar">Editar fecha, tienda o líneas</button>
    </div>`;
}

/* ---- pantalla de enlazar ---- */

/* Qué se ofrece al enlazar:
   · escribiendo: los que contienen lo escrito
   · vacío: los parecidos al ticket; si no hay ninguno, todos por
     orden alfabético (mejor eso que una pantalla vacía) */
function resultados() {
  const l = e.borrador.lineas[e.enlazando];
  const q = normalizar(e.busqueda.trim());
  if (q) {
    const lista = PRODUCTOS.filter(p => normalizar(p.n).includes(q)).slice(0, 20);
    return { lista, titulo: `TUS PRODUCTOS · ${lista.length} RESULTADOS` };
  }
  const parecidos = buscarCandidatos(l.textoTicket || l.n, PRODUCTOS, { max: 6 });
  if (parecidos.length) return { lista: parecidos, titulo: 'PARECIDOS A LO DEL TICKET' };
  const todos = [...PRODUCTOS].sort((a, b) => a.n.localeCompare(b.n, 'es')).slice(0, 15);
  return { lista: todos, titulo: 'NINGUNO SE PARECE · TUS PRODUCTOS A-Z' };
}

function filaProducto(p) {
  const n = textosDe(p.id).length;
  const sec = SECCION_POR_ID[seccionDe(p)]?.nombre || '';
  const sel = e.elegido === p.id;
  return `<button class="rv-fila" role="radio" aria-checked="${sel}" data-rv-sel="${p.id}">
    <span class="rv-ico">${iconoHTML(p)}</span>
    <span class="rv-fila-t"><b>${esc(p.n)}</b><small>${esc(sec)}${n ? ` · ${n} ${n === 1 ? 'texto' : 'textos'} de ticket` : ''}</small></span>
    <span class="rv-radio" aria-hidden="true">${sel ? '✓' : ''}</span></button>`;
}

function pintarEnlazar(raiz) {
  const b = e.borrador, l = b.lineas[e.enlazando];
  const cadena = b.tienda ? (TIENDA_POR_ID[b.tienda]?.nombre || 'esta cadena') : null;
  const { lista: res, titulo } = resultados();
  const elegido = e.elegido != null ? POR_ID[e.elegido] : null;

  raiz.innerHTML = `
    <div class="rv-cab">
      <button class="barra-btn rv-atras" id="rv-enlazar-atras" aria-label="Volver">‹</button>
      <div><h1>¿Qué producto es?</h1></div>
    </div>
    <div class="rv-origen"><small class="rv-meta">EN EL TICKET PONE</small>
      <div class="rv-linea-cab"><span class="rv-texto">${esc(l.textoTicket || l.n)}</span>
      <span class="rv-precio">${l.precio != null ? euros(l.precio) : ''}</span></div></div>
    <div class="rv-buscar"><input id="rv-buscar" type="search" value="${esc(e.busqueda)}" placeholder="Busca en tus productos"
      autocomplete="off" aria-label="Buscar producto"></div>
    <p class="rv-meta rv-sub">${titulo}</p>
    <div class="rv-filas" role="radiogroup" aria-label="Productos">
      ${res.length ? res.map(filaProducto).join('') : '<p class="ga-nota" style="padding:1rem">No hay ninguno con ese nombre.</p>'}
    </div>
    ${cadena ? `<label class="rv-recordar"><span><b>Recordar para ${esc(cadena)}</b><small>La próxima vez se enlazará solo</small></span>
      <input type="checkbox" id="rv-recordar" ${e.recordar ? 'checked' : ''}><i class="rv-switch" aria-hidden="true"></i></label>` : ''}
    <div class="rv-pie">
      <button class="btn-principal" id="rv-confirmar" ${elegido ? '' : 'disabled'}>${elegido ? 'Enlazar con ' + esc(elegido.n.toLowerCase()) : 'Elige un producto'}</button>
      <button class="rv-link rv-crear" id="rv-crear">No está: crear producto nuevo</button>
    </div>`;
}

export function pintarRevision(raiz) {
  if (!e) return;
  e.enlazando == null ? pintarLista(raiz) : pintarEnlazar(raiz);
}

/* ---------- acciones ---------- */

function enlazar(i, id, recordar = true) {
  const l = e.borrador.lineas[i], p = POR_ID[id];
  if (!l || !p) return;
  l.id = p.id; l.n = p.n; l.c = p.c;
  l.sugerido = null; l.nuevoConfirmado = false; l.recordar = recordar;
}

/* Devuelve true si el evento era de esta pantalla (así el que llama
   no lo procesa dos veces). */
export function clicRevision(ev, raiz) {
  if (!e) return false;
  const t = ev.target;
  const rep = () => pintarRevision(raiz);

  if (t.closest('#rv-atras')) { tap(); e.alCancelar(); return true; }
  if (t.closest('#rv-enlazar-atras')) { e.enlazando = null; e.elegido = null; rep(); return true; }
  if (t.closest('#rv-guardar')) { e.alGuardar(); return true; }
  if (t.closest('#rv-editar')) { e.alEditar(); return true; }

  const tab = t.closest('[data-rv-tab]');
  if (tab) { tap(); e.filtro = tab.dataset.rvTab; rep(); return true; }

  const cand = t.closest('[data-rv-cand]');
  if (cand) { tap(); const [i, id] = cand.dataset.rvCand.split(':').map(Number); enlazar(i, id); rep(); return true; }

  const nuevo = t.closest('[data-rv-nuevo]');
  if (nuevo) {
    tap(); const l = e.borrador.lineas[+nuevo.dataset.rvNuevo];
    l.id = null; l.nuevoConfirmado = true; l.sugerido = null; rep(); return true;
  }

  const cambiar = t.closest('[data-rv-cambiar]');
  if (cambiar) {
    tap(); e.enlazando = +cambiar.dataset.rvCambiar; e.elegido = null; e.recordar = true;
    e.busqueda = '';
    rep(); return true;
  }

  const sel = t.closest('[data-rv-sel]');
  if (sel) { tap(); e.elegido = +sel.dataset.rvSel; rep(); return true; }

  if (t.closest('#rv-confirmar')) {
    if (e.elegido == null) return true;
    enlazar(e.enlazando, e.elegido, e.recordar);
    e.enlazando = null; e.elegido = null; rep(); return true;
  }
  if (t.closest('#rv-crear')) {
    const l = e.borrador.lineas[e.enlazando];
    l.id = null; l.nuevoConfirmado = true; l.sugerido = null;
    e.enlazando = null; e.elegido = null; rep(); return true;
  }
  return false;
}

export function entradaRevision(ev, raiz) {
  if (!e) return false;
  if (ev.target.id === 'rv-buscar') {
    e.busqueda = ev.target.value;
    /* Se repinta solo la lista para no perder el foco del campo */
    const filas = raiz.querySelector('.rv-filas');
    if (filas) {
      const { lista: res, titulo } = resultados();
      filas.innerHTML = res.length ? res.map(filaProducto).join('') : '<p class="ga-nota" style="padding:1rem">No hay ninguno con ese nombre.</p>';
      const sub = raiz.querySelector('.rv-sub');
      if (sub) sub.textContent = titulo;
    }
    return true;
  }
  if (ev.target.id === 'rv-recordar') { e.recordar = ev.target.checked; return true; }
  return false;
}
