/* ============================================================
   DESPENSA — lo que hay en casa
   ------------------------------------------------------------
   Para ver qué hay y corregirlo. La despensa se llena sola al guardar
   una compra y se descuenta al cocinar, pero aquí se puede ajustar a mano
   (la cantidad exacta, «hay», «se acaba», «se ha acabado») sin llevar un
   inventario perfecto: de lo que no se sabe nada, no se dice nada.
   ============================================================ */

import { PRODUCTOS, POR_ID } from '../estado.js?v=39';
import { enDespensa, fijarStock, confirmarHay, aLaLista, olvidarStock, stockDe, textoStock }
  from '../despensa.js?v=39';
import { convertir, unidadNormal } from '../unidades.js?v=39';
import { seccionDe, SECCION_POR_ID } from '../secciones.js?v=39';
import { abrirCantidad } from './cantidad.js?v=39';
import { iconoHTML } from '../iconos.js?v=39';
import { normalizar, esc, tap } from '../util.js?v=39';

let raiz = null, filtro = 'todo', q = '', cb = {};

const FILTROS = [['todo', 'Todo'], ['acaba', 'Se acaba'], ['agotado', 'Agotado']];

export function iniciarDespensa(nodo, callbacks) {
  raiz = nodo; cb = callbacks;

  raiz.addEventListener('click', ev => {
    const t = ev.target;
    if (t.closest('#dp-atras')) { tap(); cb.alVolver(); return; }
    const f = t.closest('[data-dp-filtro]');
    if (f) { tap(); filtro = f.dataset.dpFiltro; pintarDespensa(); return; }
    const fila = t.closest('[data-dp-id]');
    if (fila) { tap(); editarStock(+fila.dataset.dpId); }
  });
  raiz.addEventListener('input', ev => {
    if (ev.target.id !== 'dp-buscar') return;
    q = ev.target.value;
    const c = raiz.querySelector('#dp-lista');
    if (c) c.innerHTML = listaHTML();
  });
}

export function reiniciarDespensa() { filtro = 'todo'; q = ''; }

/* ---------- editar lo que hay de un producto (también desde la ficha) ---------- */

/* La cantidad que se teclea (g, kg, ml, l, ud) a la unidad en que se guarda */
function guardarCantidad(id, { v, u }) {
  const p = POR_ID[id];
  const destino = { kg: 'g', l: 'ml', ud: 'ud' }[p.u] || 'ud';
  const enMinima = convertir(v, u, destino, p);
  return enMinima != null && fijarStock(id, enMinima, destino);
}

export function editarStock(id) {
  const p = POR_ID[id];
  if (!p) return;
  const e = stockDe(id);
  const aviso = detail => document.dispatchEvent(new CustomEvent('aviso', { detail }));
  const aLista = nivel => {
    const r = aLaLista([id], nivel);
    aviso(r.anadidos ? `${p.n}: añadido a la lista de la compra` : `${p.n}: ya estaba en la lista`);
  };

  const inicial = e?.cant > 0
    ? (e.unidad === 'ud' ? { v: e.cant, u: 'ud' } : e.cant >= 1000 ? { v: e.cant / 1000, u: e.unidad === 'ml' ? 'l' : 'kg' } : { v: e.cant, u: e.unidad })
    : null;

  document.dispatchEvent(new CustomEvent('abrir-hoja', { detail: {
    titulo: `${p.n} · ${e ? textoStock(e) : 'sin anotar'}`,
    opciones: [
      { texto: 'Indicar cuánto hay', nota: 'Con el teclado de cantidad',
        accion: () => setTimeout(() => abrirCantidad({ producto: p, inicial, precioBase: null }, ({ q: cant }) => {
          aviso(guardarCantidad(id, cant) ? `${p.n}: ${textoStock(stockDe(id))} en casa` : 'No se ha podido guardar esa cantidad');
        }), 0) },
      { texto: 'Hay, sin saber cuánto', accion: () => { confirmarHay(id); aviso(`${p.n}: hay en casa`); } },
      { texto: 'Se está acabando', nota: 'Pasa a la lista de la compra', accion: () => aLista('acaba') },
      { texto: 'Se ha acabado', nota: 'Pasa a la lista de la compra', accion: () => aLista('agotado') },
      ...(e ? [{ texto: 'Quitar de la despensa', nota: 'Vuelve a «sin anotar»', peligro: true,
        accion: () => { olvidarStock(id); aviso(`${p.n}: quitado de la despensa`); } }] : []),
      { texto: 'Cancelar' }
    ] } }));
}

/* ---------- pantalla ---------- */

function listaHTML() {
  const texto = normalizar(q.trim());
  const base = enDespensa().filter(x => filtro === 'todo' || x.stock.estado === filtro);

  if (texto) {
    /* Buscando: lo que ya hay y, debajo, el resto del catálogo para anotarlo */
    const hay = base.filter(x => normalizar(x.producto.n).includes(texto));
    const ids = new Set(hay.map(x => x.id));
    const otros = filtro !== 'todo' ? [] : PRODUCTOS
      .filter(p => !ids.has(p.id) && !stockDe(p.id) && normalizar(p.n).includes(texto)).slice(0, 12);
    return [
      ...hay.map(fila),
      ...(otros.length ? [`<p class="rv-meta dp-sub">SIN ANOTAR · TOCA PARA INDICAR QUÉ HAY</p>`] : []),
      ...otros.map(p => fila({ id: p.id, producto: p, stock: null }))
    ].join('') || '<p class="ga-nota" style="padding:1.2rem 0">No hay ningún producto con ese nombre.</p>';
  }

  if (!base.length) {
    return filtro === 'todo'
      ? `<div class="hy-vacio"><p>Todavía no hay nada anotado.</p>
         <p class="ga-nota">Se va llenando solo cuando guardas una compra y se descuenta al cocinar. También puedes buscar un producto aquí arriba y decir cuánto tienes.</p></div>`
      : `<p class="ga-nota" style="padding:1.2rem 0">Nada ${filtro === 'acaba' ? 'se está acabando' : 'está agotado'}.</p>`;
  }
  return base.map(fila).join('');
}

function fila(x) {
  const e = x.stock;
  const sec = SECCION_POR_ID[seccionDe(x.producto)]?.nombre || '';
  return `<button class="dp-fila" data-dp-id="${x.id}">
    <span class="rv-ico">${iconoHTML(x.producto)}</span>
    <span class="dp-t"><b>${esc(x.producto.n)}</b><small>${esc(sec)}</small></span>
    ${e ? `<span class="dp-cant">${esc(textoStock(e))}</span>
           ${e.estado === 'acaba' ? '<span class="rc-chip rc-acaba">Se acaba</span>' : e.estado === 'agotado' ? '<span class="rc-chip rc-falta">Agotado</span>' : ''}`
        : '<span class="dp-mas" aria-hidden="true">+</span>'}
  </button>`;
}

export function pintarDespensa() {
  if (!raiz) return;
  const n = enDespensa().length;
  raiz.innerHTML = `
    <div class="rv-cab">
      <button class="barra-btn rv-atras" id="dp-atras" aria-label="Volver">‹</button>
      <div><small class="rv-meta">${n} ${n === 1 ? 'PRODUCTO' : 'PRODUCTOS'} ANOTADOS</small><h1>En casa</h1></div>
    </div>
    <div class="pr-buscar"><input id="dp-buscar" type="search" value="${esc(q)}" placeholder="Busca un producto para anotarlo"
      autocomplete="off" aria-label="Buscar producto"></div>
    <div class="pr-chips" role="group" aria-label="Filtro">
      ${FILTROS.map(([id, t]) => `<button data-dp-filtro="${id}" aria-pressed="${filtro === id}">${t}</button>`).join('')}
    </div>
    <div class="dp-lista" id="dp-lista">${listaHTML()}</div>`;
}
