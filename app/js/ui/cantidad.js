/* ============================================================
   TECLADO DE CANTIDAD  (pantalla 19)
   Hoja inferior con cantidad grande, atajos y teclado numérico
   de botones grandes, pensada para una mano.
   ============================================================ */

import { estadoInicial, cambiarModo, teclear, aplicarAtajo, atajosDe, leer, mostrar,
         aproximacion, modosDe, nombreModo } from '../cantidad.js?v=27';
import { formatearCantidad } from '../unidades.js?v=27';
import { SUFIJO_BASE } from '../precios.js?v=27';
import { iconoHTML } from '../iconos.js?v=27';
import { esc, tap } from '../util.js?v=27';

let fondo = null, ctx = null;

function montar() {
  if (fondo) return;
  fondo = document.createElement('div');
  fondo.className = 'hoja-fondo';
  fondo.id = 'cantidad-fondo';
  fondo.hidden = true;
  fondo.style.zIndex = 60;
  document.body.appendChild(fondo);

  fondo.addEventListener('click', e => {
    if (e.target === fondo || e.target.closest('#ct-cerrar')) { cerrar(); return; }
    if (!ctx) return;
    const t = e.target;

    const modo = t.closest('[data-ct-modo]');
    if (modo) { tap(); ctx.est = cambiarModo(ctx.est, modo.dataset.ctModo, ctx.producto); pintar(); return; }

    const tecla = t.closest('[data-ct-tecla]');
    if (tecla) { tap(); ctx.est = teclear(ctx.est, tecla.dataset.ctTecla); pintar(); return; }

    const atajo = t.closest('[data-ct-atajo]');
    if (atajo) {
      tap();
      const a = atajosDe(ctx.est, ctx.producto)[+atajo.dataset.ctAtajo];
      ctx.est = aplicarAtajo(ctx.est, a, ctx.producto);
      pintar(); return;
    }

    if (t.closest('#ct-ok')) {
      const q = leer(ctx.est, ctx.producto);
      if (!q) return;
      const { precio } = aproximacion(ctx.est, ctx.producto, ctx.precioBase);
      const alAceptar = ctx.alAceptar;
      cerrar();
      alAceptar({ q, precio });
    }
  });

  document.addEventListener('keydown', e => {
    if (fondo.hidden || !ctx) return;
    if (e.key === 'Escape') { cerrar(); return; }
    if (/^\d$/.test(e.key)) { ctx.est = teclear(ctx.est, e.key); pintar(); }
    if (e.key === 'Backspace') { ctx.est = teclear(ctx.est, '<'); pintar(); }
    if (e.key === 'Enter') fondo.querySelector('#ct-ok')?.click();
  });
}

function cerrar() { if (fondo) fondo.hidden = true; ctx = null; }

function pintar() {
  const { producto: p, est, precioBase } = ctx;
  const modos = modosDe(p);
  const ap = aproximacion(est, p, precioBase);
  const q = leer(est, p);
  const base = precioBase != null
    ? ` · ${precioBase.toFixed(2).replace('.', ',')} €${SUFIJO_BASE[p.u] || ''}` : '';
  const vende = p.u === 'ud' ? 'unidad' : p.u === 'l' ? 'litro' : 'kg';

  fondo.innerHTML = `
    <div class="hoja ct-hoja" ${ctx.animar ? '' : 'style="animation:none"'} role="dialog" aria-modal="true" aria-label="Cantidad de ${esc(p.n)}">
      <div class="ct-cab">
        <button class="rv-atras" id="ct-cerrar" aria-label="Cerrar">×</button>
        <span class="rv-ico">${iconoHTML(p)}</span>
        <div><b>${esc(p.n)}</b><small class="rv-meta">SE VENDE POR ${vende.toUpperCase()}${base.toUpperCase()}</small></div>
      </div>

      ${modos.length > 1 ? `<div class="ct-modos" role="group">${modos.map(m =>
        `<button data-ct-modo="${m}" aria-pressed="${est.modo === m}">${nombreModo(m, p)}</button>`).join('')}</div>` : ''}

      <div class="ct-pantalla" aria-live="polite">
        <div class="ct-valor">${esc(mostrar(est, p))}</div>
        <div class="ct-aprox">${esc(ap.texto) || '&nbsp;'}</div>
      </div>

      <div class="ct-atajos">${atajosDe(est, p).map((a, i) => {
        const sel = q && ((a.u === 'ud' && q.u === 'ud' && q.v === a.v) || (a.u !== 'ud' && q.u !== 'ud' && formatearCantidad(q.v, q.u) === formatearCantidad(a.v, a.u)));
        return `<button data-ct-atajo="${i}" aria-pressed="${!!sel}">${a.v} ${a.u === 'l' ? 'L' : a.u}</button>`;
      }).join('')}</div>

      <div class="ct-teclado">${['1','2','3','4','5','6','7','8','9','C','0','<'].map(k =>
        `<button data-ct-tecla="${k}" aria-label="${k === '<' ? 'Borrar' : k === 'C' ? 'Vaciar' : k}">${k === '<' ? '⌫' : k}</button>`).join('')}</div>

      <button class="btn-principal ct-ok" id="ct-ok" ${q ? '' : 'disabled'}>
        ${q ? `Aceptar ${esc(mostrar(est, p))}${ap.precio != null ? ` · ${ap.precio.toFixed(2).replace('.', ',')} €` : ''}` : 'Indica una cantidad'}</button>
    </div>`;
  /* La animación de entrada solo la primera vez: cada tecla repinta
     la hoja y, si no, volvería a deslizarse desde abajo. */
  ctx.animar = false;
}

/* producto: objeto del catálogo · inicial: {v,u} | null
   precioBase: €/kg, €/L o €/ud conocido de ese producto, o null
   alAceptar({ q: {v,u}, precio }) */
export function abrirCantidad({ producto, inicial = null, precioBase = null }, alAceptar) {
  montar();
  ctx = { producto, est: estadoInicial(producto, inicial), precioBase, alAceptar, animar: true };
  pintar();
  fondo.hidden = false;
  fondo.querySelector('[data-ct-tecla="5"]')?.focus({ preventScroll: true });
}
