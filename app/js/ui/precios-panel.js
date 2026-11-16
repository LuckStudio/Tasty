/* ============================================================
   PANEL DE PRECIOS
   ------------------------------------------------------------
   Rellenar precios uno a uno desde la ficha es lento. Aquí se
   elige una tienda y se recorre el catálogo metiendo precios
   en cadena, con filtros para ir directo a lo que falta.

   La idea es poder sentarse diez minutos con el móvil en el
   supermercado y dejar la base de precios hecha.
   ============================================================ */

import { PRODUCTOS, POR_ID } from '../estado.js?v=18';
import { preciosDe, guardarPrecio, borrarPrecio, calcularBase,
         aNumero, formatoBase, FORMATOS, NOMBRE_BASE, DIAS_VIEJO,
         preferencias, alternarPreferencia } from '../precios.js?v=18';
import { tiendasActivas, TIENDA_POR_ID, colorTienda } from '../tiendas.js?v=18';
import { CATEGORIAS, CAT_POR_ID } from '../../datos/categorias.js?v=18';
import { iconoHTML } from '../iconos.js?v=18';
import { normalizar, euros, $, tap } from '../util.js?v=18';

let raiz;
let tienda = null;          // tienda sobre la que se trabaja
let filtro = 'faltan';      // faltan | tienen | viejos | todos
let categoria = 'todas';
let busqueda = '';

const FILTROS = [
  { id: 'faltan', nombre: 'Sin precio' },
  { id: 'tienen', nombre: 'Con precio' },
  { id: 'viejos', nombre: 'Caducados' },
  { id: 'todas',  nombre: 'Todos' }
];

export function reiniciarPanelPrecios() {
  filtro = 'faltan'; categoria = 'todas'; busqueda = '';
}

function aviso(t) {
  document.dispatchEvent(new CustomEvent('aviso', { detail: t }));
}

/* ---------- arranque ---------- */

export function iniciarPanelPrecios(nodo) {
  raiz = nodo;

  raiz.addEventListener('click', e => {
    const t = e.target;

    if (t.closest('#pp-volver')) {
      document.dispatchEvent(new CustomEvent('ir', { detail: 'ajustes' }));
      return;
    }

    const elegir = t.closest('[data-pp-tienda]');
    if (elegir) { tap(); tienda = elegir.dataset.ppTienda; pintarPanel(); return; }

    const f = t.closest('[data-pp-filtro]');
    if (f) { tap(); filtro = f.dataset.ppFiltro; pintarLista(); return; }

    const c = t.closest('[data-pp-cat]');
    if (c) { tap(); categoria = c.dataset.ppCat; pintarLista(); return; }

    const pref = t.closest('[data-pp-pref]');
    if (pref) {
      tap();
      alternarPreferencia(+pref.dataset.ppPref, tienda);
      pintarLista();
      return;
    }

    const quitar = t.closest('[data-pp-quitar]');
    if (quitar) {
      tap();
      borrarPrecio(+quitar.dataset.ppQuitar, tienda);
      pintarLista();
      return;
    }
  });

  /* Guardar en cuanto se sale del campo: no hay botón por línea,
     rellenar treinta precios sería insufrible con confirmación */
  raiz.addEventListener('change', e => {
    const campo = e.target.closest('[data-pp-precio]');
    if (campo) guardarLinea(+campo.dataset.ppPrecio);
  });

  raiz.addEventListener('input', e => {
    if (e.target.id === 'pp-buscar') { busqueda = e.target.value; pintarLista(); return; }
    if (e.target.closest('[data-pp-precio], [data-pp-cant], [data-pp-unidad]')) {
      refrescarPrevia(e.target.closest('.pp-fila'));
    }
  });

  /* Enter salta al siguiente producto: se rellena en cadena */
  raiz.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const campo = e.target.closest('[data-pp-precio]');
    if (!campo) return;
    e.preventDefault();
    guardarLinea(+campo.dataset.ppPrecio);
    const campos = [...raiz.querySelectorAll('[data-pp-precio]')];
    const i = campos.indexOf(campo);
    const siguiente = campos.find((c, k) => k > i && !c.value);
    (siguiente || campos[i + 1])?.focus();
  });
}

function guardarLinea(id) {
  const fila = raiz.querySelector(`.pp-fila[data-id="${id}"]`);
  if (!fila) return;

  const precio = aNumero($('[data-pp-precio]', fila).value);
  if (precio == null) return;

  const p = POR_ID[id];
  const cant = aNumero($('[data-pp-cant]', fila)?.value) ?? 1;
  const unidad = $('[data-pp-unidad]', fila)?.value || p.u;

  const ok = guardarPrecio(id, tienda, { precio, cantidad: cant, unidad });
  if (!ok) { aviso('Revisa el formato'); return; }

  fila.dataset.guardado = 'true';
  refrescarPrevia(fila);
}

function refrescarPrevia(fila) {
  if (!fila) return;
  const id = +fila.dataset.id;
  const p = POR_ID[id];
  const nodo = $('.pp-previa', fila);
  if (!nodo) return;

  const precio = aNumero($('[data-pp-precio]', fila).value);
  const cant = aNumero($('[data-pp-cant]', fila)?.value) ?? 1;
  const unidad = $('[data-pp-unidad]', fila)?.value || p.u;
  const base = calcularBase(precio, cant, unidad, p.u);

  nodo.textContent = base == null ? '' : formatoBase(base, p.u);
}

/* ---------- filtrado ---------- */

function precioEn(id) {
  return preciosDe(id).find(f => f.tienda === tienda) || null;
}

function filtrar() {
  let lista = PRODUCTOS;

  if (categoria !== 'todas') lista = lista.filter(p => p.c === categoria);

  if (busqueda.trim()) {
    const q = normalizar(busqueda.trim());
    lista = lista.filter(p => normalizar(p.n).includes(q));
  }

  if (filtro === 'faltan') lista = lista.filter(p => !precioEn(p.id));
  if (filtro === 'tienen') lista = lista.filter(p => precioEn(p.id));
  if (filtro === 'viejos') lista = lista.filter(p => precioEn(p.id)?.viejo);

  return lista;
}

/* ---------- pintado ---------- */

export function pintarPanel() {
  if (!raiz) return;

  const activas = tiendasActivas();

  if (!tienda || !TIENDA_POR_ID[tienda]) {
    raiz.innerHTML = `
      <div class="res-cab">
        <h1>Precios</h1>
        <p>Elige dónde estás</p>
      </div>
      <div class="aj-bloque">
        <p>Elige un supermercado y podrás recorrer el catálogo metiendo
        precios en cadena, filtrando por lo que todavía te falta.</p>
      </div>
      <div class="pp-tiendas">
        ${activas.map(t => `
          <button data-pp-tienda="${t.id}" style="--marca:${t.color}">
            <i>${t.corto}</i>
            <span>${t.nombre}<em>${cuantosPrecios(t.id)} de ${PRODUCTOS.length}</em></span>
          </button>`).join('')}
      </div>
      <div class="res-acciones">
        <button class="btn-secundario" id="pp-volver">Volver a ajustes</button>
      </div>`;
    return;
  }

  const t = TIENDA_POR_ID[tienda];

  raiz.innerHTML = `
    <div class="res-cab pp-cab" style="--marca:${t.color}">
      <h1>${t.nombre}</h1>
      <p><span id="pp-cuenta">0</span> productos en pantalla ·
         ${cuantosPrecios(tienda)} con precio</p>
    </div>

    <div class="pp-tiendas pp-tiendas-mini">
      ${activas.map(x => `
        <button data-pp-tienda="${x.id}" style="--marca:${x.color}"
                aria-pressed="${x.id === tienda}"><i>${x.corto}</i></button>`).join('')}
    </div>

    <div class="st-periodos">
      ${FILTROS.map(f => `
        <button data-pp-filtro="${f.id}"
                aria-pressed="${filtro === f.id}">${f.nombre}</button>`).join('')}
    </div>

    <div class="pp-cats">
      <button data-pp-cat="todas" aria-pressed="${categoria === 'todas'}">Todas</button>
      ${CATEGORIAS.map(c => `
        <button data-pp-cat="${c.id}"
                aria-pressed="${categoria === c.id}">${c.nombre}</button>`).join('')}
    </div>

    <div class="ga-buscador" style="margin:1rem var(--pad-x) 0">
      <input id="pp-buscar" type="text" placeholder="Buscar producto"
             value="${busqueda}" autocomplete="off">
    </div>

    <div id="pp-lista"></div>

    <div class="res-acciones">
      <button class="btn-secundario" id="pp-volver">Volver a ajustes</button>
    </div>`;

  pintarLista();
}

function cuantosPrecios(idTienda) {
  return PRODUCTOS.filter(p =>
    preciosDe(p.id).some(f => f.tienda === idTienda)).length;
}

function filaHTML(p) {
  const actual = precioEn(p.id);
  const unidades = FORMATOS[p.u] || FORMATOS.ud;
  const esPreferida = preferencias(p.id)[0] === tienda;
  const enPlanB = preferencias(p.id).includes(tienda) && !esPreferida;

  return `
    <div class="pp-fila" data-id="${p.id}" data-viejo="${!!actual?.viejo}">
      <span class="res-icono">${iconoHTML(p)}</span>

      <div class="pp-datos">
        <span class="pp-nombre">${p.n}
          <em>${CAT_POR_ID[p.c]?.nombre || ''} · ${NOMBRE_BASE[p.u]}</em></span>

        <div class="pp-campos">
          <label class="cmp-precio">
            <span class="sr">Precio de ${p.n}</span>
            <input type="text" inputmode="decimal" data-pp-precio="${p.id}"
                   value="${actual?.formato != null
                     ? String(actual.formato).replace('.', ',') : ''}"
                   placeholder="0,00" enterkeyhint="next" autocomplete="off">
            <span aria-hidden="true">€</span>
          </label>

          <span class="pp-por">por</span>

          <label class="ga-mini">
            <span class="sr">Formato de ${p.n}</span>
            <input type="text" inputmode="decimal" data-pp-cant="${p.id}"
                   value="${actual?.cantidad ?? ''}"
                   placeholder="${p.u === 'ud' ? '1' : '1'}" autocomplete="off">
          </label>

          <label class="pp-unidad">
            <span class="sr">Unidad</span>
            <select data-pp-unidad="${p.id}">
              ${unidades.map(u => `
                <option value="${u.id}"
                  ${(actual?.unidad || p.u) === u.id ? 'selected' : ''}>${u.nombre}</option>`).join('')}
            </select>
          </label>
        </div>

        <div class="pp-pie">
          <span class="pp-previa">${actual?.base != null
            ? formatoBase(actual.base, p.u) : ''}</span>
          ${actual?.viejo ? `<em class="pp-caducado">+${DIAS_VIEJO} días</em>` : ''}
          ${actual ? `<button data-pp-quitar="${p.id}">Borrar</button>` : ''}
        </div>
      </div>

      <button class="pp-estrella" data-pp-pref="${p.id}"
              data-estado="${esPreferida ? 'principal' : enPlanB ? 'planb' : 'no'}"
              aria-label="Preferencia de compra de ${p.n}">
        ${esPreferida ? '★' : enPlanB ? '☆' : '☆'}
      </button>
    </div>`;
}

function pintarLista() {
  const nodo = $('#pp-lista', raiz);
  if (!nodo) return;

  const lista = filtrar();
  const cuenta = $('#pp-cuenta', raiz);
  if (cuenta) cuenta.textContent = lista.length;

  for (const b of raiz.querySelectorAll('[data-pp-filtro]')) {
    b.setAttribute('aria-pressed', b.dataset.ppFiltro === filtro);
  }
  for (const b of raiz.querySelectorAll('[data-pp-cat]')) {
    b.setAttribute('aria-pressed', b.dataset.ppCat === categoria);
  }

  if (!lista.length) {
    nodo.innerHTML = `<p class="ga-nota" style="padding:2rem var(--pad-x)">
      ${filtro === 'faltan'
        ? 'No queda ningún producto sin precio con estos filtros. Bien hecho.'
        : 'Nada que mostrar con estos filtros.'}</p>`;
    return;
  }

  nodo.innerHTML = lista.map(filaHTML).join('');
}
