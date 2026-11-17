/* ============================================================
   PRODUCTOS  (pantalla 20)
   Buscador de productos con imagen, formato y precio de
   referencia; filtros por supermercado y sección; y «+» para
   añadir a la lista con un toque.
   ============================================================ */

import { PRODUCTOS, cantidad, sumar } from '../estado.js?v=39';
import { preciosDe, SUFIJO_BASE } from '../precios.js?v=39';
import { tiendasActivas, TIENDA_POR_ID } from '../tiendas.js?v=39';
import { SECCIONES, seccionDe } from '../secciones.js?v=39';
import { buscarProductos, textoFormato } from '../busqueda.js?v=39';
import { iconoHTML } from '../iconos.js?v=39';
import { stockDe, textoStock } from '../despensa.js?v=39';
import { esc, tap } from '../util.js?v=39';

let raiz = null;
const f = { texto: '', tienda: null, seccion: null, orden: 'nombre' };
let limite = 40;

const ORDENES = [
  { id: 'nombre', t: 'Nombre' },
  { id: 'precio', t: 'Precio ↑' },
  { id: 'precio-desc', t: 'Precio ↓' }
];
const fmt = n => n.toFixed(2).replace('.', ',');

export function iniciarProductos(nodo) {
  raiz = nodo;

  raiz.addEventListener('click', ev => {
    const t = ev.target;
    const mas = t.closest('[data-pr-mas]');
    if (mas) { tap(); sumar(+mas.dataset.prMas, 1); repintarResultados(); return; }

    const ficha = t.closest('[data-pr-ficha]');
    if (ficha) { document.dispatchEvent(new CustomEvent('abrir-ficha', { detail: +ficha.dataset.prFicha })); return; }

    const tienda = t.closest('[data-pr-tienda]');
    if (tienda) { tap(); f.tienda = tienda.dataset.prTienda || null; limite = 40; pintarProductos(); return; }

    const sec = t.closest('[data-pr-seccion]');
    if (sec) { tap(); f.seccion = sec.dataset.prSeccion || null; limite = 40; pintarProductos(); return; }

    if (t.closest('#pr-orden')) {
      tap();
      const i = ORDENES.findIndex(o => o.id === f.orden);
      f.orden = ORDENES[(i + 1) % ORDENES.length].id;
      pintarProductos(); return;
    }
    if (t.closest('#pr-mas-res')) { limite += 40; repintarResultados(); return; }
    if (t.closest('#pr-limpiar')) { f.texto = ''; pintarProductos(); }
  });

  raiz.addEventListener('input', ev => {
    if (ev.target.id !== 'pr-buscar') return;
    f.texto = ev.target.value; limite = 40;
    repintarResultados();            // sin repintar el campo: se conserva el foco
  });
}

function resultados() {
  return buscarProductos(f, PRODUCTOS, {
    filasDe: preciosDe, seccionDe, enLista: cantidad
  });
}

function tarjeta({ p, fila, enLista, sinPrecioEnTienda }) {
  const precio = fila?.formato ?? fila?.base ?? null;
  const base = fila?.base != null && p.u !== 'ud' ? `${fmt(fila.base)} €${SUFIJO_BASE[p.u] || ''}` : '';
  return `
  <article class="pr-card">
    <button class="pr-foto" data-pr-ficha="${p.id}" aria-label="Ficha de ${esc(p.n)}">
      ${enLista ? `<span class="pr-badge">EN LA LISTA: ${enLista}</span>` : ''}
      <span class="pr-ico">${iconoHTML(p)}</span>
    </button>
    <b class="pr-nombre">${esc(p.n)}</b>
    <small class="pr-formato">${esc(textoFormato(fila, p))}</small>
    ${stockDe(p.id) ? `<small class="pr-casa">EN CASA · ${esc(textoStock(stockDe(p.id)).toUpperCase())}</small>` : ''}
    <div class="pr-pie">
      <div class="pr-precios">${precio != null
        ? `<span class="pr-precio">${fmt(precio)} €</span>${base ? `<small>${base}</small>` : ''}`
        : `<small class="pr-sin">${sinPrecioEnTienda ? 'Sin precio en ' + esc(TIENDA_POR_ID[f.tienda]?.nombre || 'esta tienda') : 'Sin precio'}</small>`}</div>
      <button class="pr-mas" data-pr-mas="${p.id}" aria-label="Añadir ${esc(p.n)} a la lista">+</button>
    </div>
  </article>`;
}

function listaHTML() {
  const todos = resultados();
  const sec = SECCIONES.find(s => s.id === f.seccion)?.nombre;
  const visibles = todos.slice(0, limite);
  return `
    <div class="pr-meta"><span class="rv-meta">${todos.length} ${todos.length === 1 ? 'RESULTADO' : 'RESULTADOS'}${sec ? ' · ' + esc(sec).toUpperCase() : ''}</span>
      <button id="pr-orden" class="pr-orden" aria-label="Cambiar orden">${ORDENES.find(o => o.id === f.orden).t}</button></div>
    ${todos.length
      ? `<div class="pr-grid">${visibles.map(tarjeta).join('')}</div>
         ${todos.length > limite ? `<div class="res-acciones"><button class="btn-secundario" id="pr-mas-res">Ver más (${todos.length - limite})</button></div>` : ''}`
      : `<div class="hp-vacio"><p>No hay productos que coincidan.</p>
         <p class="ga-nota">Prueba con otra palabra o quita algún filtro.</p></div>`}`;
}

function repintarResultados() {
  const c = raiz.querySelector('#pr-resultados');
  if (c) c.innerHTML = listaHTML();
}

export function pintarProductos() {
  if (!raiz) return;
  raiz.innerHTML = `
    <div class="res-cab"><h1>Productos</h1></div>
    <div class="pr-buscar">
      <input id="pr-buscar" type="search" value="${esc(f.texto)}" placeholder="Busca un producto"
             autocomplete="off" aria-label="Buscar producto">
    </div>
    <div class="pr-chips" role="group" aria-label="Supermercado">
      <button data-pr-tienda="" aria-pressed="${!f.tienda}"><i style="background:var(--muted)"></i>Todas</button>
      ${tiendasActivas().map(t => `<button data-pr-tienda="${t.id}" aria-pressed="${f.tienda === t.id}">
        <i style="background:${t.color}"></i>${esc(t.nombre)}</button>`).join('')}
    </div>
    <div class="pr-chips pr-secciones" role="group" aria-label="Sección">
      <button data-pr-seccion="" aria-pressed="${!f.seccion}">Todas las secciones</button>
      ${SECCIONES.map(s => `<button data-pr-seccion="${s.id}" aria-pressed="${f.seccion === s.id}">${esc(s.nombre)}</button>`).join('')}
    </div>
    <div id="pr-resultados">${listaHTML()}</div>`;
}
