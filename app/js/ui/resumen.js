/* ============================================================
   VISTA RESUMEN
   Lo seleccionado, con presupuesto estimado y comparativa
   entre supermercados
   ============================================================ */

import { estado, seleccionados, sumar, quitar, quitarLibre,
         anadirLibre, totalArticulos, fijarAgrupacion } from '../estado.js?v=22';
import { CATEGORIAS } from '../../datos/categorias.js?v=22';
import { TIENDA_POR_ID, TIENDAS } from '../tiendas.js?v=22';
import { estimarLista, compararTiendas, tiendaPreferida,
         preciosDe, marcaDe } from '../precios.js?v=22';
import { iconoHTML } from '../iconos.js?v=22';
import { urgenciaDe, fijarUrgencia, textoUrgencia, nivelUrgencia,
         urgentes } from '../reposicion.js?v=22';
import { euros, tap } from '../util.js?v=22';

let raiz;

const ICONO_X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

const ICONO_COMPARTIR = `<svg viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
  stroke-linejoin="round"><path d="M12 3v13M8 7l4-4 4 4"/>
  <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>`;

export function iniciarResumen(nodo) {
  raiz = nodo;

  raiz.addEventListener('click', e => {
    const mas = e.target.closest('[data-mas]');
    if (mas) { tap(); sumar(+mas.dataset.mas, 1); return; }

    const menos = e.target.closest('[data-menos]');
    if (menos) { tap(); sumar(+menos.dataset.menos, -1); return; }

    const fuera = e.target.closest('[data-quitar]');
    if (fuera) { tap(); quitar(+fuera.dataset.quitar); return; }

    const libre = e.target.closest('[data-quitar-libre]');
    if (libre) { tap(); quitarLibre(+libre.dataset.quitarLibre); return; }

    /* Tocar el nombre abre la ficha con los precios */
    const ficha = e.target.closest('[data-ficha]');
    if (ficha) {
      tap();
      document.dispatchEvent(new CustomEvent('abrir-ficha',
        { detail: +ficha.dataset.ficha }));
      return;
    }

    const urg = e.target.closest('[data-urgencia]');
    if (urg) { tap(); abrirUrgencia(+urg.dataset.urgencia); return; }

    const agrupar = e.target.closest('[data-agrupar]');
    if (agrupar) { tap(); fijarAgrupacion(agrupar.dataset.agrupar); return; }

    if (e.target.closest('#anadir-libre')) { anadirDesdeInput(); return; }

    if (e.target.closest('#compartir')) {
      document.dispatchEvent(new CustomEvent('abrir-compartir'));
      return;
    }
    if (e.target.closest('#ver-lista')) {
      document.dispatchEvent(new CustomEvent('ver-como-comprador'));
      return;
    }
    if (e.target.closest('#ver-cesta')) {
      document.dispatchEvent(new CustomEvent('ir', { detail: 'cesta' }));
      return;
    }
    if (e.target.closest('#ir-al-grid')) {
      document.dispatchEvent(new CustomEvent('ir', { detail: 'grid' }));
    }
  });

  raiz.addEventListener('keydown', e => {
    if (e.target.id === 'libre-txt' && e.key === 'Enter') anadirDesdeInput();
  });
}

function anadirDesdeInput() {
  const input = raiz.querySelector('#libre-txt');
  if (!input) return;
  const ok = anadirLibre(input.value);
  input.value = '';
  input.focus();
  if (!ok) {
    document.dispatchEvent(new CustomEvent('aviso',
      { detail: 'Eso ya está en la lista' }));
  }
}

/* ---------- líneas ---------- */

/* Precio estimado de una línea según la tienda preferida, o el
   más barato conocido si no hay preferencia */
function precioLinea(id, cant) {
  const filas = preciosDe(id);
  if (!filas.length) return null;
  const pref = tiendaPreferida(id);
  const f = filas.find(x => x.tienda === pref && x.formato != null)
         || filas.find(x => x.formato != null);
  return f ? f.formato * cant : null;
}

/* Pone o quita la fecha límite de un producto */
function abrirUrgencia(id) {
  const actual = urgenciaDe(id);
  const hoy = new Date();
  const enDias = n => {
    const d = new Date(hoy);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const opciones = [
    { texto: 'Para hoy', accion: () => fijarUrgencia(id, enDias(0)) },
    { texto: 'Para mañana', accion: () => fijarUrgencia(id, enDias(1)) },
    { texto: 'En 3 días', accion: () => fijarUrgencia(id, enDias(3)) },
    { texto: 'En una semana', accion: () => fijarUrgencia(id, enDias(7)) }
  ];
  if (actual) {
    opciones.push({ texto: 'Quitar la fecha', peligro: true,
                    accion: () => fijarUrgencia(id, null) });
  }

  document.dispatchEvent(new CustomEvent('abrir-hoja', {
    detail: { titulo: '¿Para cuándo hace falta?', opciones }
  }));
}

function lineaProducto({ producto: p, cantidad: c }) {
  const precio = precioLinea(p.id, c);
  const urg = urgenciaDe(p.id);
  const nivel = nivelUrgencia(urg);
  return `
    <div class="res-linea" ${urg ? `data-urg="${nivel}"` : ''}>
      <span class="res-icono">${iconoHTML(p)}</span>
      <button class="res-nombre" data-ficha="${p.id}"
              style="text-align:left" aria-label="Ver precios de ${p.n}">
        ${p.n}
        ${urg ? `<em class="res-urg">${textoUrgencia(urg)}</em>` : ''}
        ${marcaDe(p.id)?.estricta
          ? `<em class="res-marca">${marcaDe(p.id).texto || 'Marca concreta'}</em>` : ''}
      </button>
      <button class="res-reloj" data-urgencia="${p.id}"
              aria-label="Fecha límite de ${p.n}"
              data-puesta="${!!urg}">⏱</button>
      ${precio != null ? `<span class="res-precio">${euros(precio)}</span>` : ''}
      <span class="res-pasos">
        <button data-menos="${p.id}" aria-label="Quitar uno de ${p.n}">−</button>
        <span>${c}</span>
        <button data-mas="${p.id}" aria-label="Añadir uno de ${p.n}">+</button>
      </span>
      <button class="res-quitar" data-quitar="${p.id}"
              aria-label="Sacar ${p.n} de la lista">${ICONO_X}</button>
    </div>`;
}

function lineaLibre(texto, i) {
  return `
    <div class="res-linea">
      <span class="res-icono" aria-hidden="true">✏️</span>
      <span class="res-nombre">${texto}<em>Escrito a mano</em></span>
      <button class="res-quitar" data-quitar-libre="${i}"
              aria-label="Sacar ${texto} de la lista">${ICONO_X}</button>
    </div>`;
}

/* ---------- presupuesto ---------- */

function panelPresupuesto(lista) {
  const est = estimarLista(lista);
  if (!est.conocidos && !est.desconocidos) return '';

  const comp = compararTiendas(lista);
  const ahorro = comp.filas.length > 1
    ? comp.filas[comp.filas.length - 1].total - comp.filas[0].total
    : 0;

  return `
    <div class="pr-panel">
      <div class="pr-cab">
        <span>Estimado</span>
        <b>${euros(est.total)}</b>
      </div>

      ${est.desconocidos ? `
        <p class="pr-nota">Calculado sobre ${est.conocidos}
        ${est.conocidos === 1 ? 'producto' : 'productos'}.
        ${est.desconocidos} sin precio todavía: toca su nombre para añadirlo.</p>`
      : ''}

      ${comp.filas.length ? `
        <p class="pr-nota">Comparando ${comp.cesta} de ${comp.total} productos,
        los únicos con precio en todos estos supermercados:</p>
        ${comp.filas.map((t, i) => `
          <div class="pr-tienda" data-mejor="${i === 0}">
            <span>${t.nombre}${i === 0 ? '<em>más barato</em>' : ''}</span>
            <b>${euros(t.total)}</b>
          </div>`).join('')}
        ${ahorro > 0.01 ? `
          <p class="pr-nota">Entre el más caro y el más barato hay
          ${euros(ahorro)} de diferencia.</p>` : ''}
      ` : ''}
    </div>`;
}

/* Lo que tiene fecha límite, arriba del todo: si algo hace falta
   hoy, es lo primero que hay que ver al abrir el resumen */
function panelUrgentes() {
  const filas = urgentes().filter(f => f.dias <= 2);
  if (!filas.length) return '';

  return `
    <div class="res-urgentes">
      <b>Con fecha</b>
      ${filas.map(f => `
        <div class="res-urgente" data-nivel="${f.nivel}">
          <span>${f.producto.n}</span>
          <em>${textoUrgencia(f.fecha)}</em>
        </div>`).join('')}
    </div>`;
}

/* ---------- pintado ---------- */

export function pintarResumen() {
  if (!raiz) return;

  const items = seleccionados();
  const libres = estado.libres;
  const total = totalArticulos();

  if (!total) {
    raiz.innerHTML = `
      <div class="vacio">
        <p><strong>La lista está vacía</strong>
        Toca productos en el grid y aparecerán aquí listos para compartir.</p>
        <div class="res-acciones">
          <button class="btn-secundario" id="ir-al-grid">Ir al grid</button>
        </div>
      </div>`;
    return;
  }

  const porTienda = estado.ajustes.agrupar === 'tienda';
  let cuerpo = '';

  if (porTienda) {
    /* Agrupado por dónde has decidido comprar cada cosa */
    const grupos = new Map();
    for (const item of items) {
      const t = tiendaPreferida(item.producto.id) || 'libre';
      if (!grupos.has(t)) grupos.set(t, []);
      grupos.get(t).push(item);
    }

    const orden = [...TIENDAS.filter(t => t.activa).map(t => t.id), 'libre'];
    for (const t of orden) {
      const grupo = grupos.get(t);
      if (!grupo?.length) continue;
      const sub = grupo.reduce(
        (a, x) => a + (precioLinea(x.producto.id, x.cantidad) || 0), 0);
      cuerpo += `<div class="res-grupo-cab">
        ${TIENDA_POR_ID[t]?.nombre || 'Cualquier sitio'}
        ${sub ? ` · ${euros(sub)}` : ''}</div>`;
      cuerpo += grupo.map(lineaProducto).join('');
    }
  } else {
    for (const cat of CATEGORIAS) {
      const grupo = items.filter(x => x.producto.c === cat.id);
      if (!grupo.length) continue;
      cuerpo += `<div class="res-grupo-cab">${cat.nombre}</div>`;
      cuerpo += grupo.map(lineaProducto).join('');
    }
  }

  if (libres.length) {
    cuerpo += `<div class="res-grupo-cab">Añadidos a mano</div>`;
    cuerpo += libres.map(lineaLibre).join('');
  }

  const unidades = items.reduce((a, x) => a + x.cantidad, 0) + libres.length;
  const distintos = items.length + libres.length;
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Lista</h1>
      <p>${plural(distintos, 'producto', 'productos')} ·
         ${plural(unidades, 'unidad', 'unidades')}</p>
    </div>

    ${panelUrgentes()}

    ${panelPresupuesto(estado.lista)}

    <div class="res-agrupar" role="group" aria-label="Cómo agrupar la lista"
         style="margin-top:1.4rem">
      <button data-agrupar="categoria" aria-pressed="${!porTienda}">Por categoría</button>
      <button data-agrupar="tienda" aria-pressed="${porTienda}">Por supermercado</button>
    </div>

    ${cuerpo}

    <div class="res-anadir">
      <input id="libre-txt" type="text" placeholder="Añadir algo que no está"
             autocomplete="off" enterkeyhint="done">
      <button id="anadir-libre">Añadir</button>
    </div>
    <div class="res-acciones">
      <button class="btn-principal" id="compartir">
        ${ICONO_COMPARTIR} Compartir lista
      </button>
      <button class="btn-secundario" id="ver-lista">
        Ver lista para comprar
      </button>
      <button class="btn-secundario" id="ver-cesta">
        Dónde comprar hoy
      </button>
    </div>`;
}
