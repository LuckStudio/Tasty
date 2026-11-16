/* ============================================================
   FICHA DE RECETA  (pantalla 04)
   Imagen protagonista, ingredientes con lo que hay en casa, pasos
   en letra grande y «Añadir al menú».
   ============================================================ */

import { recetaPorId, editarReceta, nombreIngrediente, textoCantidad } from '../recetas.js?v=37';
import { POR_ID } from '../estado.js?v=37';
import { cantidadEscalada, anadirReceta, fechaISO, sumarDias, franjaDeReceta, mensajeNoCabe } from '../menu.js?v=37';
import { disponibilidad, esFalta } from '../despensa.js?v=37';
import { formatearCantidad } from '../unidades.js?v=37';
import { imagenReceta, puntoReceta, diaCorto, diaLargo, diaNumero, mesCorto, relativo, nombreFranja }
  from './receta-comun.js?v=37';
import { COMIDA_POR_ID } from '../recetas.js?v=37';
import { esc, tap } from '../util.js?v=37';

let raiz = null, id = null, tab = 'ingredientes', raciones = null, volver = 'menu', cb = {};

export function abrirReceta(idReceta, vistaOrigen = 'menu', opciones = {}) {
  id = idReceta; volver = vistaOrigen;
  tab = opciones.tab || 'ingredientes';
  raciones = opciones.raciones || null;
}

export function iniciarReceta(nodo, callbacks) {
  raiz = nodo; cb = callbacks;

  raiz.addEventListener('click', ev => {
    const t = ev.target;
    const r = recetaPorId(id);
    if (t.closest('#rc-atras')) { tap(); cb.alVolver(volver); return; }
    if (!r) return;

    const pestana = t.closest('[data-rc-tab]');
    if (pestana) { tap(); tab = pestana.dataset.rcTab; pintarReceta(); return; }

    if (t.closest('#rc-fav')) { tap(); editarReceta(id, { favorita: !r.favorita }); pintarReceta(); return; }
    if (t.closest('#rc-editar')) { cb.alEditar(id); return; }

    const menos = t.closest('#rc-menos'), mas = t.closest('#rc-mas');
    if (menos || mas) {
      tap();
      const actual = raciones || r.raciones || 1;
      raciones = Math.max(1, Math.min(20, actual + (mas ? 1 : -1)));
      pintarReceta(); return;
    }
    if (t.closest('#rc-menu')) { elegirDia(r); return; }

    const ing = t.closest('[data-rc-prod]');
    if (ing) document.dispatchEvent(new CustomEvent('abrir-ficha', { detail: +ing.dataset.rcProd }));
  });
}

/* Añadir al menú: se elige el día; la franja es la de la propia receta (un
   desayuno solo va en desayunos, una cena en cenas…), así que no se pregunta. */
function elegirDia(r) {
  const franja = franjaDeReceta(r.comida);
  if (!franja) {
    document.dispatchEvent(new CustomEvent('aviso', { detail: mensajeNoCabe(r, 'comida') }));
    return;
  }
  const hoy = fechaISO();
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i));
  document.dispatchEvent(new CustomEvent('abrir-hoja', { detail: {
    titulo: `¿Qué día pones «${r.nombre}»?`,
    opciones: dias.map(f => ({
      texto: `${relativo(f, hoy) === 'HOY' ? 'Hoy' : relativo(f, hoy) === 'MAÑANA' ? 'Mañana' : diaLargo(f)} · ${diaNumero(f)} ${mesCorto(f)}`,
      nota: nombreFranja(franja),
      accion: () => {
        const res = anadirReceta(f, franja, r.id, raciones || r.raciones || 1);
        document.dispatchEvent(new CustomEvent('aviso', { detail: res.ok
          ? `Añadida a ${nombreFranja(franja).toLowerCase()} del ${diaLargo(f)}` : res.error }));
        if (res.ok) cb.alMenu(f);
      }
    })) } }));
}

function estadoChip(ing, r, n) {
  if (!ing.id) return '';
  const nec = ing.sinCantidad ? null : { cant: cantidadEscalada(ing, r, n), unidad: ing.unidad };
  const d = disponibilidad(ing.id, nec);
  if (d.estado === 'desconocido') return '';
  const tengo = d.tengo?.cant != null ? ` ${formatearCantidad(d.tengo.cant >= 1000 && d.tengo.unidad !== 'ud' ? d.tengo.cant / 1000 : d.tengo.cant, d.tengo.unidad === 'ud' ? 'ud' : d.tengo.cant >= 1000 ? (d.tengo.unidad === 'ml' ? 'l' : 'kg') : d.tengo.unidad)}` : '';
  const m = { hay: ['rc-hay', 'Hay'], acaba: ['rc-acaba', 'Se acaba'], falta: ['rc-falta', 'Falta'], agotado: ['rc-falta', 'Agotado'] }[d.estado];
  return m ? `<span class="rc-chip ${m[0]}">${m[1]}${d.estado === 'hay' ? tengo : ''}</span>` : '';
}

export function pintarReceta() {
  if (!raiz) return;
  const r = recetaPorId(id);
  if (!r) {
    raiz.innerHTML = `<div class="rv-cab"><button class="barra-btn rv-atras" id="rc-atras" aria-label="Volver">‹</button><div><h1>Receta no encontrada</h1></div></div>`;
    return;
  }
  const n = raciones || r.raciones || 1;
  const comida = COMIDA_POR_ID[r.comida]?.nombre || '';

  raiz.innerHTML = `
    <div class="rc-hero">
      ${imagenReceta(r, 'rc-grande')}
      <button class="rv-atras rc-btn-atras" id="rc-atras" aria-label="Volver">‹</button>
      <button class="rv-atras rc-btn-fav" id="rc-fav" aria-label="${r.favorita ? 'Quitar el corazón' : 'Marcar con el corazón'}" aria-pressed="${!!r.favorita}">${r.favorita ? '♥' : '♡'}</button>
    </div>
    <div class="rc-cuerpo">
      <p class="rv-meta">${puntoReceta(r)}${esc(comida).toUpperCase()}${r.plan === 'dieta' ? ' · PLAN' : ''}</p>
      <h1 class="rc-titulo">${esc(r.nombre)}</h1>

      <div class="rc-datos">
        <div><small>Ingredientes</small><b>${r.ingredientes.length}</b></div>
        <div><small>Pasos</small><b>${(r.pasos || []).length || '—'}</b></div>
        <div><small>Raciones</small>
          <span class="res-pasos rc-pasos"><button id="rc-menos" aria-label="Menos raciones">−</button><span>${n}</span><button id="rc-mas" aria-label="Más raciones">+</button></span></div>
      </div>

      <div class="rc-tabs" role="tablist">
        <button role="tab" data-rc-tab="ingredientes" aria-selected="${tab === 'ingredientes'}">Ingredientes</button>
        <button role="tab" data-rc-tab="pasos" aria-selected="${tab === 'pasos'}">Pasos</button>
      </div>

      ${tab === 'ingredientes' ? `
      <ul class="rc-ings">
        ${r.ingredientes.map(ing => {
          const cant = cantidadEscalada(ing, r, n);
          const txt = cant == null ? 'al gusto' : textoCantidad({ ...ing, cant });
          return `<li>
            <button class="rc-ing" ${ing.id ? `data-rc-prod="${ing.id}"` : ''}>
              <span class="rc-ing-n">${esc(nombreIngrediente(ing))}${ing.alternativa ? `<small> o ${esc(ing.alternativa.toLowerCase())}</small>` : ''}${ing.nota ? `<small> · ${esc(ing.nota)}</small>` : ''}</span>
              <span class="rc-ing-c">${esc(txt)}</span>
              ${estadoChip(ing, r, n)}
            </button></li>`;
        }).join('')}
      </ul>
      ${r.notas ? `<p class="rc-notas">${esc(r.notas)}</p>` : ''}`
      : (r.pasos || []).length ? `
      <ol class="rc-pasos-lista">
        ${r.pasos.map((p, i) => `<li><span class="rc-n">${i + 1}</span><p>${esc(p.texto)}${p.min ? `<small> · ${p.min} min</small>` : ''}</p></li>`).join('')}
      </ol>`
      : '<p class="ga-nota" style="padding:1rem 0">Esta receta todavía no tiene pasos. Puedes añadirlos al editarla.</p>'}
    </div>

    <div class="rv-pie rc-pie">
      <button class="rv-atras rc-editar" id="rc-editar" aria-label="Editar la receta">✎</button>
      <button class="btn-principal" id="rc-menu">Añadir al menú</button>
    </div>`;
}
