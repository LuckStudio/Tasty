/* ============================================================
   VISTA TIENDAS
   Añadir fruterías, carnicerías y cualquier sitio propio
   ============================================================ */

import { TIENDAS, TIENDA_POR_ID, COLORES_TIENDA, crearTienda,
         editarTienda, activarTienda, borrarTienda, seUsaTienda,
         moverTienda, inicialesTienda, alternarFavorita,
         hayFavoritas } from '../tiendas.js?v=25';
import { $, tap } from '../util.js?v=25';

let raiz;
let editando = null;        // id, 'nueva' o null
let colorElegido = COLORES_TIENDA[0];

export function reiniciarTiendas() { editando = null; }

function aviso(t) {
  document.dispatchEvent(new CustomEvent('aviso', { detail: t }));
}

export function iniciarVistaTiendas(nodo) {
  raiz = nodo;

  raiz.addEventListener('click', e => {
    const t = e.target;

    if (t.closest('#tn-volver')) {
      if (editando) { editando = null; pintarTiendas(); }
      else document.dispatchEvent(new CustomEvent('ir', { detail: 'ajustes' }));
      return;
    }

    if (t.closest('#tn-nueva')) {
      editando = 'nueva';
      colorElegido = COLORES_TIENDA[TIENDAS.length % COLORES_TIENDA.length];
      pintarTiendas();
      return;
    }

    const abrir = t.closest('[data-tn-editar]');
    if (abrir) {
      tap();
      editando = abrir.dataset.tnEditar;
      colorElegido = TIENDA_POR_ID[editando]?.color || COLORES_TIENDA[0];
      pintarTiendas();
      return;
    }

    const color = t.closest('[data-tn-color]');
    if (color) { tap(); colorElegido = color.dataset.tnColor; pintarTiendas(); return; }

    const sube = t.closest('[data-tn-subir]');
    if (sube) { tap(); moverTienda(sube.dataset.tnSubir, -1); pintarTiendas(); return; }

    const baja = t.closest('[data-tn-bajar]');
    if (baja) { tap(); moverTienda(baja.dataset.tnBajar, 1); pintarTiendas(); return; }

    const fav = t.closest('[data-tn-fav]');
    if (fav) { tap(); alternarFavorita(fav.dataset.tnFav); pintarTiendas(); return; }

    const act = t.closest('[data-tn-activar]');
    if (act) {
      tap();
      const id = act.dataset.tnActivar;
      activarTienda(id, !TIENDA_POR_ID[id].activa);
      pintarTiendas();
      return;
    }

    if (t.closest('#tn-guardar')) { guardar(); return; }
    if (t.closest('#tn-borrar')) {
      const r = borrarTienda(editando);
      aviso(r.ok ? 'Tienda borrada' : r.error);
      if (r.ok) editando = null;
      pintarTiendas();
      return;
    }
  });
}

function guardar() {
  const nombre = $('#tn-nombre', raiz)?.value || '';
  const corto = $('#tn-corto', raiz)?.value || '';

  if (editando === 'nueva') {
    const r = crearTienda({ nombre, color: colorElegido, corto });
    if (!r.ok) { aviso(r.error); return; }
    aviso(`${r.tienda.nombre} añadida`);
  } else {
    const r = editarTienda(editando, {
      nombre, color: colorElegido,
      corto: (corto || nombre).slice(0, 3).toUpperCase()
    });
    if (!r.ok) { aviso(r.error); return; }
    aviso('Guardado');
  }

  editando = null;
  pintarTiendas();
}

/* ---------- pintado ---------- */

export function pintarTiendas() {
  if (!raiz) return;
  if (editando) return pintarEditor();

  const activas = TIENDAS.filter(t => t.activa);
  const paradas = TIENDAS.filter(t => !t.activa);

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Supermercados</h1>
      <p>${activas.length} activos${paradas.length ? ` · ${paradas.length} desactivados` : ''}</p>
    </div>

    <div class="aj-bloque">
      <p>Aquí puedes añadir la frutería del barrio, la carnicería o
      cualquier sitio donde compres. Cada uno lleva su color, que se
      usa en los tickets y en las listas agrupadas.</p>
      <p class="ga-nota"><b>La estrella marca los sitios a los que
      realmente vas.</b> ${hayFavoritas()
        ? 'Las comparativas de precio solo tienen en cuenta los marcados.'
        : 'Ahora mismo no hay ninguno marcado, así que se comparan todos. Comparar contra una tienda que te pilla lejos sale barato en la pantalla y caro en la vida.'}</p>
    </div>

    <div class="ga-acciones">
      <button class="btn-principal" id="tn-nueva">Añadir un sitio</button>
    </div>

    <div class="aj-bloque">
      <h2>En uso</h2>
      ${activas.map((t, i) => filaTienda(t, i, activas.length)).join('')}
    </div>

    ${paradas.length ? `
      <div class="aj-bloque">
        <h2>Desactivados</h2>
        <p class="ga-nota" style="padding-top:0;padding-bottom:0.8rem">
        No se ofrecen al comprar, pero sus tickets y precios siguen ahí.</p>
        ${paradas.map(t => filaTienda(t, -1, 0)).join('')}
      </div>` : ''}

    <div class="res-acciones">
      <button class="btn-secundario" id="tn-volver">Volver a ajustes</button>
    </div>`;
}

function filaTienda(t, i, total) {
  return `
    <div class="tn-fila" style="--marca:${t.color}" data-off="${!t.activa}">
      <i class="tn-sello">${inicialesTienda(t.id)}</i>
      <button class="tn-n" data-tn-editar="${t.id}">
        ${t.nombre}
        <em>${t.corto}${t.propia ? ' · tuya' : ''}${
          seUsaTienda(t.id) ? ' · con datos' : ''}</em>
      </button>
      ${t.activa ? `
        <button class="tn-fav" data-tn-fav="${t.id}"
                data-on="${!!t.favorita}"
                aria-label="${t.favorita ? 'Quitar de favoritos' : 'Marcar como favorito'} ${t.nombre}">
          ${t.favorita ? '★' : '☆'}
        </button>` : ''}
      ${t.activa && total > 1 ? `
        <button class="tn-orden" data-tn-subir="${t.id}" ${i === 0 ? 'disabled' : ''}
                aria-label="Subir ${t.nombre}">↑</button>
        <button class="tn-orden" data-tn-bajar="${t.id}"
                ${i === total - 1 ? 'disabled' : ''}
                aria-label="Bajar ${t.nombre}">↓</button>` : ''}
      <button class="tn-off" data-tn-activar="${t.id}"
              aria-label="${t.activa ? 'Desactivar' : 'Activar'} ${t.nombre}">
        ${t.activa ? '−' : '+'}
      </button>
    </div>`;
}

function pintarEditor() {
  const esNueva = editando === 'nueva';
  const t = esNueva
    ? { nombre: '', corto: '', color: colorElegido, propia: true }
    : TIENDA_POR_ID[editando];
  if (!t) { editando = null; return pintarTiendas(); }

  const usada = !esNueva && seUsaTienda(editando);

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>${esNueva ? 'Nuevo sitio' : 'Editar'}</h1>
      <p>${esNueva ? 'Frutería, carnicería, panadería…'
                   : t.propia ? 'Sitio tuyo' : 'De serie'}</p>
    </div>

    <div class="aj-bloque">
      <p class="fi-label">Nombre</p>
      <input class="ga-fecha" id="tn-nombre" type="text"
             value="${(t.nombre || '').replace(/"/g, '&quot;')}"
             placeholder="Frutería Paco" autocomplete="off">

      <p class="fi-label" style="margin-top:1.2rem">Tres letras para el ticket</p>
      <input class="ga-fecha" id="tn-corto" type="text" maxlength="3"
             value="${t.corto || ''}" placeholder="FRP" autocomplete="off">

      <p class="fi-label" style="margin-top:1.2rem">Color</p>
      <div class="tn-colores">
        ${COLORES_TIENDA.map(c => `
          <button data-tn-color="${c}" style="--marca:${c}"
                  aria-pressed="${colorElegido === c}"
                  aria-label="Color ${c}"></button>`).join('')}
      </div>

      <div class="tn-previa" style="--marca:${colorElegido}">
        <i>${esNueva ? '··' : inicialesTienda(editando)}</i>
        <span>Así se verá en el ticket</span>
      </div>
    </div>

    <div class="res-acciones">
      <button class="btn-principal" id="tn-guardar">Guardar</button>
      ${!esNueva && t.propia && !usada
        ? '<button class="btn-secundario" id="tn-borrar">Borrar</button>' : ''}
      ${usada ? `<p class="ga-nota" style="padding:0.4rem var(--pad-x)">
        Ya tiene tickets o precios asociados, así que no se puede borrar.
        Desactívala si dejas de ir.</p>` : ''}
      <button class="btn-secundario" id="tn-volver">Cancelar</button>
    </div>`;
}
