/* ============================================================
   ELEGIR TIENDA  (pantalla 09)
   Antes de empezar a comprar se elige a qué tienda se va. La app
   toma el color de esa tienda, ordena la lista por su recorrido
   y estima el total con sus precios. Se recuerda la última usada.
   ============================================================ */

import { compraActual } from '../compra.js?v=34';
import { tiendasActivas, TIENDA_POR_ID, inicialesTienda } from '../tiendas.js?v=34';
import { estimarLineas, ordenarTiendas, ultimaTienda, ultimaVez, textoHace, resumenRuta }
  from '../ruta.js?v=34';
import { euros, esc, tap } from '../util.js?v=34';

let raiz = null, elegida = null, cb = {};

/* callbacks: alCambiar() · alEmpezar(id) · alOtroSitio() · alEditarRutas(id) · alSalir() */
export function iniciarTienda(nodo, callbacks) {
  raiz = nodo; cb = callbacks;

  raiz.addEventListener('click', ev => {
    const t = ev.target;
    const card = t.closest('[data-tn-id]');
    if (card) { tap(); elegida = card.dataset.tnId; pintarTienda(); cb.alCambiar(); return; }
    if (t.closest('#tn-empezar') && elegida) { tap(); cb.alEmpezar(elegida); return; }
    if (t.closest('#tn-otro')) { cb.alOtroSitio(); return; }
    if (t.closest('#tn-rutas')) { cb.alEditarRutas(elegida); return; }
    if (t.closest('#tn-salir')) { cb.alSalir(); }
  });
}

/* Para que la app pueda teñirse del color de la tienda que se está viendo */
export function tiendaElegida() { return elegida; }

export function prepararTienda() {
  const c = compraActual();
  const orden = ordenarTiendas(tiendasActivas());
  elegida = (c?.tienda && TIENDA_POR_ID[c.tienda]) ? c.tienda
    : (ultimaTienda() && TIENDA_POR_ID[ultimaTienda()]?.activa ? ultimaTienda() : orden[0]?.id || null);
}

export function pintarTienda() {
  if (!raiz) return;
  const c = compraActual();
  const lineas = c?.lineas || [];
  const nProd = lineas.filter(l => l.k === 'p').length + lineas.filter(l => l.k !== 'p').length;
  const orden = ordenarTiendas(tiendasActivas());
  if (!elegida || !TIENDA_POR_ID[elegida]) elegida = orden[0]?.id || null;

  const est = elegida ? estimarLineas(lineas, elegida) : null;
  const sel = TIENDA_POR_ID[elegida];

  raiz.innerHTML = `
    <div class="tn-cab">
      <small class="rv-meta">LISTA DE LA COMPRA</small>
      <h1>¿Dónde vas a comprar hoy?</h1>
      <p>${nProd} ${nProd === 1 ? 'producto' : 'productos'}${est && est.conocidos
        ? ` · estimado ${euros(est.total)}` : ' · sin precios de esta tienda todavía'}</p>
    </div>

    <div class="tn-lista" role="radiogroup" aria-label="Supermercado">
      ${orden.map(t => {
        const e = estimarLineas(lineas, t.id);
        const hace = textoHace(ultimaVez(t.id));
        const ruta = resumenRuta(t.id, 4);
        const marcada = t.id === elegida;
        return `
        <button class="tn-card" role="radio" aria-checked="${marcada}" data-tn-id="${t.id}" style="--marca:${t.color}">
          <span class="tn-sello" aria-hidden="true">${esc(inicialesTienda(t.id))}</span>
          <span class="tn-texto">
            <b>${esc(t.nombre)}</b>
            <small>${hace ? `La última vez · ${hace}` : 'Todavía no has comprado aquí'}${
              e.sinPrecio && lineas.length ? ` · ${e.sinPrecio} sin precio` : ''}</small>
            ${marcada ? `<span class="tn-ruta" aria-label="Recorrido">ENTRADA${ruta.map(r => ` → ${esc(r.toUpperCase())}`).join('')} → …</span>` : ''}
          </span>
          <span class="tn-radio" aria-hidden="true">${marcada ? '●' : ''}</span>
        </button>`;
      }).join('')}
    </div>

    <div class="tn-extras">
      <button class="rv-link" id="tn-rutas">Editar la ruta de ${esc(sel?.nombre || 'la tienda')}</button>
      <button class="rv-link" id="tn-otro">Comprar en otro sitio, sin ruta</button>
      <button class="rv-link" id="tn-salir">Volver a la lista</button>
    </div>

    <div class="rv-pie">
      <button class="btn-principal" id="tn-empezar" ${elegida ? '' : 'disabled'}>Empezar en ${esc(sel?.nombre || '…')}</button>
    </div>`;
}
