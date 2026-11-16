/* ============================================================
   HISTÓRICO DE PRECIOS  (pantalla 18)
   ------------------------------------------------------------
   Gráfico de evolución del precio normalizado (€/kg, €/L, €/ud)
   con una línea por cadena, el indicador ha bajado / estable / ha
   subido frente a la media de 3 meses y la tabla de compras.
   Gráfico SVG propio, sin librerías.
   ============================================================ */

import { POR_ID } from '../estado.js?v=25';
import { datos } from '../almacen.js?v=25';
import { TIENDA_POR_ID } from '../tiendas.js?v=25';
import { preciosDe, SUFIJO_BASE } from '../precios.js?v=25';
import { serie, recortar, tendencia, porTienda, baseAUnidad } from '../historial.js?v=25';
import { formatearCantidad } from '../unidades.js?v=25';
import { iconoHTML } from '../iconos.js?v=25';
import { euros, esc, tap } from '../util.js?v=25';

let id = null, periodo = 6, unidad = 'base', raiz = null, volver = 'grid';

const PERIODOS = [{ m: 3, t: '3M' }, { m: 6, t: '6M' }, { m: 12, t: '1A' }];
const MES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

export function abrirHistorial(idProducto, vistaOrigen = 'grid') {
  id = idProducto; volver = vistaOrigen; unidad = 'base';
}

export function iniciarHistorial(nodo, alVolver) {
  raiz = nodo;
  raiz.addEventListener('click', ev => {
    const t = ev.target;
    if (t.closest('#hp-atras')) { tap(); alVolver(volver); return; }
    const per = t.closest('[data-hp-periodo]');
    if (per) { tap(); periodo = +per.dataset.hpPeriodo; pintarHistorial(); return; }
    const u = t.closest('[data-hp-unidad]');
    if (u) { tap(); unidad = u.dataset.hpUnidad; pintarHistorial(); return; }
    const ficha = t.closest('#hp-ficha');
    if (ficha) document.dispatchEvent(new CustomEvent('abrir-ficha', { detail: id }));
  });
}

const fmt = n => n.toFixed(2).replace('.', ',');

function formatoDe(idP) {
  const filas = preciosDe(idP);
  return tienda => {
    const f = filas.find(x => x.tienda === tienda);
    return f?.cantidad && f?.unidad ? { q: f.cantidad, u: f.unidad } : null;
  };
}

/* ---------- gráfico ---------- */

function grafico(puntos, p, ahora) {
  const W = 340, H = 190, L = 40, R = 12, T = 12, B = 26;
  if (!puntos.length) return '';

  const valor = x => (unidad === 'ud' ? baseAUnidad(x.base, p) : x.base);
  const vals = puntos.map(valor);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 0.1 * (min || 1); max += 0.1 * (max || 1); }
  const pad = (max - min) * 0.12; min -= pad; max += pad;

  const t0 = ahora - periodo * 30.44 * 86400000, t1 = ahora;
  const X = t => L + ((new Date(t).getTime() - t0) / (t1 - t0)) * (W - L - R);
  const Y = v => T + (1 - (v - min) / (max - min)) * (H - T - B);

  /* rejilla: 4 líneas con valores redondeados */
  const rejilla = [0, 1, 2, 3].map(k => {
    const v = min + ((max - min) * k) / 3;
    return `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="hp-rej"/>
            <text x="${L - 6}" y="${Y(v) + 3}" text-anchor="end" class="hp-eje">${fmt(v)}</text>`;
  }).join('');

  /* meses en el eje X */
  const meses = [];
  const d = new Date(t0); d.setDate(1); d.setMonth(d.getMonth() + 1);
  for (; d.getTime() <= t1; d.setMonth(d.getMonth() + 1)) {
    if (periodo <= 6 || d.getMonth() % 2 === 0) meses.push({ t: d.getTime(), m: MES[d.getMonth()] });
  }
  const ejeX = meses.map(m => `<text x="${X(m.t)}" y="${H - 8}" text-anchor="middle" class="hp-eje">${m.m}</text>`).join('');

  /* una línea por cadena; la que más compras tiene, en su color */
  const grupos = [...porTienda(puntos).entries()].sort((a, b) => b[1].length - a[1].length);
  const lineas = grupos.map(([tienda, pts], gi) => {
    const color = gi === 0 ? (TIENDA_POR_ID[tienda]?.color || 'var(--accent)') : 'var(--muted)';
    const coords = pts.map(x => `${X(x.fecha).toFixed(1)},${Y(valor(x)).toFixed(1)}`);
    const ult = pts[pts.length - 1];
    return `<g style="--c:${color}">
      ${pts.length > 1 ? `<polyline points="${coords.join(' ')}" class="hp-lin ${gi === 0 ? '' : 'hp-alt'}"/>` : ''}
      ${pts.map(x => `<circle cx="${X(x.fecha).toFixed(1)}" cy="${Y(valor(x)).toFixed(1)}" r="3" class="hp-pto"/>`).join('')}
      <circle cx="${X(ult.fecha).toFixed(1)}" cy="${Y(valor(ult)).toFixed(1)}" r="5" class="hp-ult"/></g>`;
  }).join('');

  const resumen = grupos.map(([t, pts]) =>
    `${TIENDA_POR_ID[t]?.nombre || 'Otro sitio'}: ${pts.length} ${pts.length === 1 ? 'compra' : 'compras'}`).join('; ');

  return `<svg viewBox="0 0 ${W} ${H}" class="hp-svg" role="img"
      aria-label="Evolución del precio de ${esc(p.n)}. ${esc(resumen)}. La tabla de debajo tiene todos los datos.">
    ${rejilla}${ejeX}${lineas}</svg>
    <div class="hp-leyenda">${grupos.map(([t], gi) => `
      <span><i class="${gi === 0 ? '' : 'hp-alt'}" style="--c:${gi === 0 ? (TIENDA_POR_ID[t]?.color || 'var(--accent)') : 'var(--muted)'}"></i>${esc(TIENDA_POR_ID[t]?.nombre || 'Otro sitio')}</span>`).join('')}</div>`;
}

/* ---------- pantalla ---------- */

export function pintarHistorial() {
  if (!raiz) return;
  const p = POR_ID[id];
  if (!p) { raiz.innerHTML = '<p class="ga-nota" style="padding:2rem var(--pad-x)">Ese producto ya no existe.</p>'; return; }

  const todos = serie(id, datos.tickets, p, formatoDe(id));
  const pts = recortar(todos, periodo);
  const tend = tendencia(todos);
  const hayUd = baseAUnidad(1, p) != null && p.u !== 'ud';
  if (unidad === 'ud' && !hayUd) unidad = 'base';
  const ultimo = todos[todos.length - 1];
  const valorUlt = ultimo ? (unidad === 'ud' ? baseAUnidad(ultimo.base, p) : ultimo.base) : null;
  const sufijo = unidad === 'ud' ? '/ud' : (SUFIJO_BASE[p.u] || '');

  const chip = !tend
    ? (todos.length ? '<span class="hp-chip">Compra otra vez para ver la tendencia</span>' : '')
    : tend.estado === 'baja' ? `<span class="hp-chip hp-baja">↓ Ha bajado un ${tend.pct} % en 3 meses</span>`
    : tend.estado === 'sube' ? `<span class="hp-chip hp-sube">↑ Ha subido un ${tend.pct} % en 3 meses</span>`
    : '<span class="hp-chip">Estable en 3 meses</span>';

  raiz.innerHTML = `
    <div class="rv-cab">
      <button class="barra-btn rv-atras" id="hp-atras" aria-label="Volver">‹</button>
      <div><small class="rv-meta">${esc(p.n).toUpperCase()}</small><h1>Cómo ha cambiado el precio</h1></div>
    </div>

    <section class="hp-tarjeta">
      ${todos.length ? `
        <div class="hp-cab">
          <div class="hp-precio"><span class="hp-num">${fmt(valorUlt)} €</span><span class="hp-suf">${sufijo}</span></div>
          ${hayUd ? `<div class="hp-toggle" role="group" aria-label="Unidad">
            <button data-hp-unidad="base" aria-pressed="${unidad === 'base'}">€${SUFIJO_BASE[p.u]}</button>
            <button data-hp-unidad="ud" aria-pressed="${unidad === 'ud'}">€/ud</button></div>` : ''}
        </div>
        ${chip}
        ${pts.length ? grafico(pts, p, Date.now()) : '<p class="ga-nota" style="padding:1rem 0">No hay compras en este periodo.</p>'}
        <div class="hp-periodos" role="group" aria-label="Periodo">
          ${PERIODOS.map(x => `<button data-hp-periodo="${x.m}" aria-pressed="${periodo === x.m}">${x.t}</button>`).join('')}
        </div>`
      : `<div class="hp-vacio"><span class="rv-ico">${iconoHTML(p)}</span>
          <p>Todavía no hay compras de <b>${esc(p.n)}</b> con precio.</p>
          <p class="ga-nota">Cuando guardes un ticket con este producto, aquí verás cómo evoluciona el precio por ${SUFIJO_BASE[p.u]?.slice(1) || 'unidad'}. ${p.u !== 'ud' ? 'Si lo compraste por unidades, indica el peso medio en su ficha para poder compararlo.' : ''}</p></div>`}
    </section>

    ${todos.length ? `
    <p class="rv-meta rv-sub">TUS COMPRAS</p>
    <div class="hp-tabla" role="table" aria-label="Tus compras de ${esc(p.n)}">
      <div class="hp-fila hp-cabt" role="row"><span role="columnheader">FECHA</span><span role="columnheader">TIENDA</span><span role="columnheader">CANT.</span><span role="columnheader">€${SUFIJO_BASE[p.u] || ''}</span></div>
      ${[...pts].reverse().map(x => {
        const d = new Date(x.fecha);
        const cant = x.q ? formatearCantidad(x.q.v, x.q.u) : `${x.cant} ud`;
        return `<div class="hp-fila" role="row">
          <span role="cell">${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}</span>
          <span role="cell">${esc((TIENDA_POR_ID[x.tienda]?.nombre || 'Otro').slice(0, 9).toUpperCase())}</span>
          <span role="cell">${esc(cant)}</span>
          <span role="cell"><b>${fmt(unidad === 'ud' ? baseAUnidad(x.base, p) ?? x.base : x.base)}</b></span></div>`;
      }).join('')}
    </div>` : ''}

    <div class="res-acciones"><button class="btn-secundario" id="hp-ficha">Ver ficha de ${esc(p.n.toLowerCase())}</button></div>`;
}
