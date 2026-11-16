/* ============================================================
   TICKET
   ------------------------------------------------------------
   Estética de ticket de supermercado con el lenguaje de
   LuckStudio: rectangular, líneas de medio punto, separadores
   discontinuos y el total en Host Grotesk 800.

   El sello de la tienda es un monograma con su color de marca.
   No se usan logotipos reales: son marcas registradas y no
   pueden distribuirse dentro de la app. El monograma cumple la
   misma función (reconocer la tienda de un vistazo) sin ese
   problema, y funciona igual para una frutería del barrio.

   El código de barras es decorativo y se genera a partir del id
   del ticket, así que el mismo ticket dibuja siempre el mismo.
   No codifica nada real.
   ============================================================ */

import { TIENDA_POR_ID, colorTienda, inicialesTienda } from '../tiendas.js?v=24';
import { euros } from '../util.js?v=24';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
               'agosto','septiembre','octubre','noviembre','diciembre'];

export const ICONO_TARJETA_TK = `<svg viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="1.6" aria-hidden="true">
  <rect x="2" y="5" width="20" height="14"/><path d="M2 10h20"/>
  <path d="M5.5 15.5h3"/></svg>`;

export const ICONO_EFECTIVO_TK = `<svg viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="1.6" aria-hidden="true">
  <rect x="2" y="6" width="20" height="12"/>
  <circle cx="12" cy="12" r="2.5"/><path d="M5.5 12h.01M18.5 12h.01"/></svg>`;

/* ---------- utilidades ---------- */

export function fechaLarga(iso) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function horaDe(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* Duración de la compra, si se sabe cuándo empezó */
function duracion(ticket) {
  if (!ticket.inicio) return null;
  const min = Math.round(
    (new Date(ticket.fecha) - new Date(ticket.inicio)) / 60000
  );
  if (min < 1 || min > 600) return null;
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

/* Número largo tipo ticket, derivado del id */
export function numeroTicket(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bloque = n => String(h % n).padStart(String(n - 1).length, '0');
  return `${bloque(10000)} ${String((h >>> 7) % 100).padStart(2, '0')} ${String((h >>> 13) % 1000000).padStart(6, '0')}`;
}

/* Barras decorativas, siempre iguales para el mismo ticket */
function codigoBarras(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 33 + ch.charCodeAt(0)) >>> 0;

  const barras = [];
  for (let i = 0; i < 54; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    barras.push(1 + (h >>> 16) % 3);   // grosores de 1 a 3
  }
  const total = barras.reduce((a, b) => a + b + 1, 0);

  let x = 0;
  const rects = barras.map((w, i) => {
    const r = i % 2 === 0
      ? `<rect x="${(x / total * 100).toFixed(2)}%" y="0"
              width="${(w / total * 100).toFixed(2)}%" height="100%"/>` : '';
    x += w + 1;
    return r;
  }).join('');

  return `
    <div class="tk-barras">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${rects}
      </svg>
      <span>${numeroTicket(id)}</span>
    </div>`;
}

/* ---------- ticket completo ---------- */

export function ticketHTML(t) {
  const tienda = t.tienda ? TIENDA_POR_ID[t.tienda] : null;
  const suelto = !tienda && t.tiendaTexto ? t.tiendaTexto : null;
  const marca = t.tienda ? colorTienda(t.tienda) : null;
  const unidades = t.lineas.reduce((a, l) => a + (l.cant || 1), 0);
  const estimados = t.lineas.filter(l => l.estimado).length;
  const sinPrecio = t.lineas.filter(l => l.precio == null).length;
  const dur = duracion(t);
  const pago = t.pago === 'efectivo' ? 'efectivo' : 'tarjeta';

  return `
    <div class="tk-hoja" ${marca ? `style="--marca:${marca}"` : ''}>

      <div class="tk-sello">
        <i>${tienda ? inicialesTienda(t.tienda)
              : suelto ? suelto.slice(0, 2).toUpperCase() : '—'}</i>
        <span>${tienda ? tienda.nombre : suelto || 'Sin supermercado'}
          ${suelto ? '<em>sitio puntual</em>' : ''}</span>
      </div>

      <div class="tk-cab">
        <p>${fechaLarga(t.fecha)} · ${horaDe(t.fecha)}</p>
        ${dur ? `<p class="tk-dur">Compra de ${dur}</p>` : ''}
      </div>

      <div class="tk-lineas">
        ${t.lineas.map(l => `
          <div class="tk-linea" data-nuevo="${!!l.nuevo}"
               data-estimado="${!!l.estimado}">
            <span>${l.n}${l.cant > 1 ? `<em>×${l.cant}</em>` : ''}${
              l.desc ? `<i class="tk-desc">−${euros(l.desc)}</i>` : ''}</span>
            <b>${l.precio != null ? euros(l.precio) : '—'}</b>
          </div>`).join('')}
      </div>

      ${t.descuento > 0 ? `
        <div class="tk-ahorro">
          <span>Te has ahorrado</span>
          <b>−${euros(t.descuento)}</b>
        </div>` : ''}

      <div class="tk-total">
        <span>Total · ${unidades} art.</span>
        <b>${euros(t.total)}</b>
      </div>

      <div class="tk-pago">
        ${pago === 'tarjeta' ? ICONO_TARJETA_TK : ICONO_EFECTIVO_TK}
        <span>Pagado con ${pago === 'tarjeta' ? 'tarjeta bancaria' : 'metálico'}</span>
      </div>

      ${estimados || sinPrecio ? `
        <p class="tk-nota">
          <b>Aviso</b>
          ${estimados ? `${estimados} ${estimados === 1
            ? 'precio es una estimación' : 'precios son estimaciones'} de esta tienda.` : ''}
          ${sinPrecio ? `${sinPrecio} sin precio, no ${sinPrecio === 1
            ? 'suma' : 'suman'} al total.` : ''}
        </p>` : ''}

      ${t.noCogidas?.length ? `
        <p class="tk-nota"><b>No se encontró</b>${t.noCogidas.join(', ')}</p>` : ''}

      ${codigoBarras(t.id)}
    </div>`;
}
