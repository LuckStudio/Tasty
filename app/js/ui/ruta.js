/* ============================================================
   RUTA POR TIENDA  (pantalla 12)
   Se ordenan las secciones como se recorre cada tienda,
   arrastrando (o con los botones ▲▼), y se ocultan las que esa
   tienda no tiene. La lista de la compra se ordena así.
   Cada tienda tiene su propia ruta, aunque sea de la misma cadena.
   ============================================================ */

import { PRODUCTOS } from '../estado.js?v=36';
import { tiendasActivas, TIENDA_POR_ID } from '../tiendas.js?v=36';
import { SECCION_POR_ID, seccionDe, rutaDe, moverSeccion, colocarSeccion, ocultarSeccion,
         copiarRuta, restablecerRuta, tieneRutaPropia, posicionEnOrden }
  from '../secciones.js?v=36';
import { esc, tap } from '../util.js?v=36';

let raiz = null, tienda = null, volver = 'ajustes', alVolver = () => {};

export function abrirRuta(tiendaId, vistaOrigen = 'ajustes') {
  tienda = tiendaId || tienda;
  volver = vistaOrigen;
}

function cuentaPorSeccion() {
  const c = {};
  for (const p of PRODUCTOS) c[seccionDe(p)] = (c[seccionDe(p)] || 0) + 1;
  return c;
}

export function iniciarRuta(nodo, volverA) {
  raiz = nodo; alVolver = volverA;

  raiz.addEventListener('click', ev => {
    const t = ev.target;
    if (t.closest('#rt-atras') || t.closest('#rt-guardar')) {
      tap();
      if (t.closest('#rt-guardar')) document.dispatchEvent(new CustomEvent('aviso', { detail: 'Ruta guardada' }));
      alVolver(volver); return;
    }
    const tab = t.closest('[data-rt-tienda]');
    if (tab) { tap(); tienda = tab.dataset.rtTienda; pintarRuta(); return; }

    const sube = t.closest('[data-rt-sube]');
    if (sube) { tap(); moverSeccion(tienda, sube.dataset.rtSube, -1); pintarRuta(); enfocar(sube.dataset.rtSube, 'sube'); return; }
    const baja = t.closest('[data-rt-baja]');
    if (baja) { tap(); moverSeccion(tienda, baja.dataset.rtBaja, +1); pintarRuta(); enfocar(baja.dataset.rtBaja, 'baja'); return; }

    const oculta = t.closest('[data-rt-oculta]');
    if (oculta) { tap(); ocultarSeccion(tienda, oculta.dataset.rtOculta, true); pintarRuta(); return; }
    const muestra = t.closest('[data-rt-muestra]');
    if (muestra) { tap(); ocultarSeccion(tienda, muestra.dataset.rtMuestra, false); pintarRuta(); return; }

    if (t.closest('#rt-copiar')) { menuCopiar(); return; }
    if (t.closest('#rt-reset')) {
      document.dispatchEvent(new CustomEvent('abrir-hoja', { detail: {
        titulo: `Restablecer la ruta de ${TIENDA_POR_ID[tienda]?.nombre || 'la tienda'}`,
        opciones: [
          { texto: 'Restablecer el orden', nota: 'Vuelve al orden por defecto y vuelve a mostrar todas las secciones.',
            peligro: true, accion: () => { restablecerRuta(tienda); pintarRuta(); } },
          { texto: 'Cancelar' }] } }));
    }
  });

  /* ---- arrastrar y soltar con el puntero (ratón o dedo) ----
     Cerca del borde de la pantalla esta se desplaza sola, para poder
     llevar una sección de abajo del todo arriba del todo. */
  let arr = null, raf = 0;

  const dyActual = () => (arr.y - arr.y0) + (raiz.scrollTop - arr.scroll0);
  const pintarArrastre = () => { arr.fila.style.transform = `translateY(${dyActual()}px)`; };
  const bucle = () => {
    if (!arr) return;
    const borde = 90, paso = 14;
    if (arr.y < borde) raiz.scrollTop -= paso;
    else if (arr.y > window.innerHeight - borde - 64) raiz.scrollTop += paso;
    pintarArrastre();
    raf = requestAnimationFrame(bucle);
  };

  raiz.addEventListener('pointerdown', ev => {
    const asa = ev.target.closest('.rt-asa');
    if (!asa) return;
    const fila = asa.closest('.rt-fila');
    const filas = [...raiz.querySelectorAll('.rt-fila')];
    arr = { fila, id: fila.dataset.rtId, y: ev.clientY, y0: ev.clientY, scroll0: raiz.scrollTop,
            idx0: filas.indexOf(fila),
            centros: filas.map(f => { const r = f.getBoundingClientRect(); return r.top + r.height / 2; }) };
    asa.setPointerCapture(ev.pointerId);
    fila.classList.add('rt-arrastrando');
    ev.preventDefault();
    raf = requestAnimationFrame(bucle);
  });
  raiz.addEventListener('pointermove', ev => {
    if (!arr) return;
    arr.y = ev.clientY;
    pintarArrastre();
  });
  const soltar = () => {
    if (!arr) return;
    cancelAnimationFrame(raf);
    const { fila, centros, idx0, id } = arr;
    const centroFinal = centros[idx0] + dyActual();
    arr = null;
    fila.classList.remove('rt-arrastrando'); fila.style.transform = '';
    /* La posición nueva es la de la fila cuyo centro queda más cerca */
    let destino = 0, mejor = Infinity;
    centros.forEach((c, i) => { const d = Math.abs(c - centroFinal); if (d < mejor) { mejor = d; destino = i; } });
    if (destino !== idx0) {
      const r = rutaDe(tienda);
      colocarSeccion(tienda, id, posicionEnOrden(r.orden, r.ocultas, id, destino));
    }
    pintarRuta();
  };
  raiz.addEventListener('pointerup', soltar);
  raiz.addEventListener('pointercancel', soltar);
}

/* Tras mover con un botón, el foco vuelve al mismo botón para poder
   seguir con el teclado o el lector de pantalla */
function enfocar(id, cual) {
  raiz.querySelector(`[data-rt-${cual}="${id}"]`)?.focus();
}

function menuCopiar() {
  const otras = tiendasActivas().filter(t => t.id !== tienda && tieneRutaPropia(t.id));
  if (!otras.length) {
    document.dispatchEvent(new CustomEvent('aviso', { detail: 'Ninguna otra tienda tiene ruta propia todavía' }));
    return;
  }
  document.dispatchEvent(new CustomEvent('abrir-hoja', { detail: {
    titulo: 'Copiar la ruta de otra tienda',
    opciones: otras.map(t => ({
      texto: t.nombre, nota: 'Sustituye el orden de ahora',
      accion: () => { copiarRuta(t.id, tienda); pintarRuta(); } })) } }));
}

export function pintarRuta() {
  if (!raiz) return;
  const tiendas = tiendasActivas();
  if (!tienda || !TIENDA_POR_ID[tienda]) tienda = tiendas[0]?.id;
  const t = TIENDA_POR_ID[tienda];
  const r = rutaDe(tienda);
  const cuentas = cuentaPorSeccion();
  const visibles = r.orden.filter(id => !r.ocultas.includes(id));

  raiz.innerHTML = `
    <div class="rv-cab">
      <button class="barra-btn rv-atras" id="rt-atras" aria-label="Volver">‹</button>
      <div><small class="rv-meta">AJUSTES · SUPERMERCADOS</small><h1>Ruta por tienda</h1></div>
    </div>

    <div class="pr-chips" role="tablist" aria-label="Tienda">
      ${tiendas.map(x => `<button role="tab" data-rt-tienda="${x.id}" aria-selected="${x.id === tienda}" aria-pressed="${x.id === tienda}">
        <i style="background:${x.color}"></i>${esc(x.nombre)}</button>`).join('')}
    </div>

    <p class="rt-ayuda">Pon las secciones en el orden en que recorres <b>${esc(t?.nombre || '')}</b>. La lista de la compra se ordenará así.</p>

    <ol class="rt-lista" aria-label="Orden de las secciones">
      ${visibles.map((id, i) => `
        <li class="rt-fila" data-rt-id="${id}">
          <span class="rt-n">${String(i + 1).padStart(2, '0')}</span>
          <button class="rt-asa" aria-label="Arrastrar ${esc(SECCION_POR_ID[id].nombre)}" title="Arrastra para mover">⠿</button>
          <span class="rt-nombre"><b>${esc(SECCION_POR_ID[id].nombre)}</b>
            <small>${cuentas[id] || 0} productos</small></span>
          <button class="rt-btn" data-rt-sube="${id}" aria-label="Subir ${esc(SECCION_POR_ID[id].nombre)}" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="rt-btn" data-rt-baja="${id}" aria-label="Bajar ${esc(SECCION_POR_ID[id].nombre)}" ${i === visibles.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="rt-btn" data-rt-oculta="${id}" aria-label="Ocultar ${esc(SECCION_POR_ID[id].nombre)} en esta tienda" title="Esta tienda no la tiene">⊘</button>
        </li>`).join('')}
    </ol>

    ${r.ocultas.length ? `
    <div class="rt-ocultas"><span class="rv-meta">OCULTAS AQUÍ</span>
      <div class="rt-chips">${r.ocultas.map(id => `<button data-rt-muestra="${id}">${esc(SECCION_POR_ID[id]?.nombre || id)} · Mostrar</button>`).join('')}</div>
      <small>Sus productos aparecen en «Sin sección» al comprar aquí.</small></div>` : ''}

    <div class="rt-extras">
      <button class="rv-link" id="rt-copiar">Copiar la ruta de otra tienda</button>
      ${tieneRutaPropia(tienda) ? '<button class="rv-link" id="rt-reset">Restablecer el orden</button>' : ''}
    </div>

    <div class="rv-pie"><button class="btn-principal" id="rt-guardar">Guardar ruta</button></div>`;
}
