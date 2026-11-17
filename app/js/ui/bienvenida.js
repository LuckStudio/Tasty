/* ============================================================
   CONFIGURACIÓN DE LA PRIMERA VEZ
   ------------------------------------------------------------
   Tres preguntas, un minuto, y la app queda ajustada:
     1. cuántos sois en casa (las raciones del menú parten de ahí)
     2. dónde compráis normalmente (las tiendas favoritas)
     3. qué básicos hay siempre en casa (no se piden salvo que se acaben)
   Solo se enseña a quien todavía no usa la app, y se puede repetir
   desde Ajustes. Cada cambio se guarda en el momento.
   ============================================================ */

import { personas, fijarPersonas, hayQueDarLaBienvenida, marcarBienvenida } from '../hogar.js?v=39';
import { tiendasActivas, esFavorita, alternarFavorita } from '../tiendas.js?v=39';
import { BASICOS_POR_DEFECTO, esBasico, fijarBasico } from '../basicos.js?v=39';
import { POR_ID } from '../estado.js?v=39';
import { iconoHTML } from '../iconos.js?v=39';
import { esc, tap } from '../util.js?v=39';

let fondo = null;

export function iniciarBienvenida() {
  fondo = document.createElement('div');
  fondo.className = 'bv-fondo';
  fondo.id = 'bienvenida';
  fondo.hidden = true;
  document.body.appendChild(fondo);

  fondo.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('#bv-menos')) { tap(); fijarPersonas(personas() - 1); pintar(); return; }
    if (t.closest('#bv-mas')) { tap(); fijarPersonas(personas() + 1); pintar(); return; }
    const tienda = t.closest('[data-bv-tienda]');
    if (tienda) { tap(); alternarFavorita(tienda.dataset.bvTienda); pintar(); return; }
    const basico = t.closest('[data-bv-basico]');
    if (basico) { tap(); const id = +basico.dataset.bvBasico; fijarBasico(id, !esBasico(POR_ID[id])); pintar(); return; }
    if (t.closest('#bv-listo') || t.closest('#bv-luego')) { cerrar(); }
  });
  document.addEventListener('abrir-bienvenida', () => abrir());
}

/* Al arrancar: solo si la app está sin estrenar */
export function mostrarBienvenidaSiToca() {
  if (fondo && hayQueDarLaBienvenida()) abrir();
}

function abrir() { pintar(); fondo.hidden = false; document.body.style.overflow = 'hidden'; fondo.scrollTop = 0; }
function cerrar() { marcarBienvenida(); fondo.hidden = true; document.body.style.overflow = ''; }

function pintar() {
  const basicos = [...BASICOS_POR_DEFECTO].map(id => POR_ID[id]).filter(Boolean);
  fondo.innerHTML = `
    <div class="bv-hoja" role="dialog" aria-modal="true" aria-label="Configuración inicial">
      <small class="rv-meta">PRIMERA VEZ · 1 MINUTO</small>
      <h1>Vamos a dejar Tasty a tu medida</h1>

      <section>
        <h2><span>1</span> ¿Cuántos sois en casa?</h2>
        <p>Las recetas vienen para 1 persona. Al planificar, las cantidades partirán de vuestras raciones.</p>
        <div class="bv-personas"><button id="bv-menos" aria-label="Una persona menos">−</button>
          <b>${personas()}</b><button id="bv-mas" aria-label="Una persona más">+</button>
          <span>${personas() === 1 ? 'persona' : 'personas'}</span></div>
      </section>

      <section>
        <h2><span>2</span> ¿Dónde soléis comprar?</h2>
        <p>Marca vuestros supermercados. Compararemos precios solo entre esos.</p>
        <div class="bv-chips">${tiendasActivas().map(t => `
          <button data-bv-tienda="${t.id}" aria-pressed="${esFavorita(t.id)}" style="--marca:${t.color}"><i></i>${esc(t.nombre)}</button>`).join('')}</div>
      </section>

      <section>
        <h2><span>3</span> ¿Qué básicos hay siempre en casa?</h2>
        <p>Solo te los pediremos cuando se acaben, en vez de en cada lista.</p>
        <div class="bv-chips">${basicos.map(p => `
          <button data-bv-basico="${p.id}" aria-pressed="${esBasico(p)}"><span class="bv-ico">${iconoHTML(p)}</span>${esc(p.n)}</button>`).join('')}</div>
      </section>

      <button class="btn-principal" id="bv-listo">Empezar</button>
      <button class="rv-link rv-crear" id="bv-luego">Lo haré más tarde</button>
    </div>`;
}
