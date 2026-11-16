/* ============================================================
   VISTA GRID
   Secciones plegables · conmutador frecuencia / tipo · búsqueda
   ============================================================ */

import { PRODUCTOS, cantidad, alternar, sumar, estado, anadirLibre }
  from '../estado.js?v=26';
import { CATEGORIAS, FRECUENCIAS } from '../../datos/categorias.js?v=26';
import { iconoHTML } from '../iconos.js?v=26';
import { sugerencias, descartarSugerencia, periodicidad,
         textoOrigen } from '../reposicion.js?v=26';
import { masBaratoQue } from '../precios.js?v=26';
import { normalizar, tap } from '../util.js?v=26';

let raiz, busqueda = '';
const plegadas = new Set(
  FRECUENCIAS.filter(f => !f.abierto).map(f => `f${f.id}`)
);

export function iniciarGrid(nodo) {
  raiz = nodo;
  let temporizador, abriendoFicha = false;

  /* Un único listener delegado para los cientos de botones */
  raiz.addEventListener('click', e => {
    /* Descartar una sugerencia sin añadirla */
    const fuera = e.target.closest('[data-descartar-sug]');
    if (fuera) {
      e.stopPropagation();
      const id = Number(fuera.dataset.descartarSug);
      const dias = descartarSugerencia(id);
      document.dispatchEvent(new CustomEvent('aviso', {
        detail: `No se sugerirá en ${dias} días`
      }));
      return;
    }

    const cab = e.target.closest('.seccion-cab');
    if (cab) {
      const clave = cab.parentElement.dataset.clave;
      plegadas.has(clave) ? plegadas.delete(clave) : plegadas.add(clave);
      pintarGrid();
      return;
    }

    /* La esquina de un producto seleccionado lo saca de la lista.
       Antes solo se podía quitar desde el resumen o la ficha. */
    const quitar = e.target.closest('.prod-quitar');
    if (quitar) {
      e.stopPropagation();
      tap(15);
      sumar(Number(quitar.closest('.prod').dataset.id), -99);
      return;
    }

    const btn = e.target.closest('.prod');
    if (btn) {
      /* Si la pulsación larga ya abrió la ficha, el clic que
         llega después no debe sumar una unidad de más */
      if (abriendoFicha) { abriendoFicha = false; return; }
      tap();
      const id = Number(btn.dataset.id);
      const eraNuevo = !cantidad(id);
      eraNuevo ? alternar(id) : sumar(id, 1);
      /* Solo al añadirlo por primera vez: repetir el aviso en
         cada toque sería insoportable */
      if (eraNuevo) avisarAlternativa(id);
      return;
    }

    const libre = e.target.closest('[data-anadir-libre]');
    if (libre) {
      anadirLibre(busqueda);
      fijarBusqueda('');
      document.dispatchEvent(new CustomEvent('aviso', {
        detail: 'Añadido a la lista'
      }));
    }
  });

  /* Mantener pulsado abre la ficha del producto: precios por
     supermercado, preferencia y cantidad. Quitarlo de la lista
     se hace desde ahí o desde el resumen. */
  raiz.addEventListener('pointerdown', e => {
    const btn = e.target.closest('.prod');
    if (!btn) return;
    abriendoFicha = false;
    temporizador = setTimeout(() => {
      tap(20);
      abriendoFicha = true;
      document.dispatchEvent(new CustomEvent('abrir-ficha',
        { detail: Number(btn.dataset.id) }));
      temporizador = null;
    }, 480);
  });
  const cancelar = () => clearTimeout(temporizador);
  raiz.addEventListener('pointerup', cancelar);
  raiz.addEventListener('pointercancel', cancelar);
  raiz.addEventListener('pointermove', cancelar);
}

/* Si hay algo equivalente y bastante más barato, se dice una
   vez, sin bloquear nada. La decisión sigue siendo tuya. */
function avisarAlternativa(id) {
  const alt = masBaratoQue(id);
  if (!alt) return;

  document.dispatchEvent(new CustomEvent('abrir-aviso-accion', {
    detail: {
      texto: `${alt.producto.n} sale un ${alt.ahorro}% más barato`,
      accion: 'Cambiar',
      alHacer: () => {
        const cant = cantidad(id) || 1;
        sumar(id, -99);
        for (let i = 0; i < cant; i++) {
          cantidad(alt.producto.id) ? sumar(alt.producto.id, 1)
                                    : alternar(alt.producto.id);
        }
        document.dispatchEvent(new CustomEvent('aviso', {
          detail: `${alt.producto.n} en su lugar`
        }));
      }
    }
  }));
}

export function fijarBusqueda(texto) {
  busqueda = texto;
  const input = document.querySelector('#buscar');
  if (input && input.value !== texto) input.value = texto;
  document.querySelector('#limpiar').hidden = !texto;
  pintarGrid();
}

function filtrar() {
  if (!busqueda.trim()) return PRODUCTOS;
  const q = normalizar(busqueda.trim());
  return PRODUCTOS.filter(p => normalizar(p.n).includes(q));
}

function botonHTML(p) {
  const c = cantidad(p.id);
  return `
    <button class="prod" data-id="${p.id}" aria-pressed="${c > 0}">
      <span class="prod-icono">${iconoHTML(p)}</span>
      <span class="prod-nombre">${p.n}</span>
      <span class="prod-cant" ${c > 1 ? '' : 'hidden'}>×${c}</span>
      ${c > 0 ? `<span class="prod-quitar" role="button" tabindex="0"
                       aria-label="Quitar ${p.n} de la lista">×</span>` : ''}
    </button>`;
}

/* ------------------------------------------------------------
   SUGERIDOS

   Va por encima de todo lo demás porque responde a la pregunta
   con la que abres la app: "¿qué me falta?". Cada botón dice
   cuánto hace que lo compraste, que es el dato que te hace
   decidir en medio segundo.
   ------------------------------------------------------------ */
function seccionSugeridos() {
  const filas = sugerencias();
  if (!filas.length) return '';

  const clave = 'sugeridos';
  const abierta = !plegadas.has(clave);

  return `
    <section class="seccion seccion-sug" data-clave="${clave}"
             data-abierta="${abierta}">
      <button class="seccion-cab" aria-expanded="${abierta}">
        <h2>Sugeridos</h2>
        <span class="seccion-cuenta">${filas.length}</span>
        <span class="seccion-flecha" aria-hidden="true"></span>
      </button>
      <div class="grid">
        ${filas.map(f => botonSugerido(f)).join('')}
      </div>
    </section>`;
}

function botonSugerido({ producto: p, dias, periodo, origen }) {
  const c = cantidad(p.id);
  return `
    <button class="prod prod-sug" data-id="${p.id}" aria-pressed="${c > 0}"
            title="Lo compras cada ${periodo} días · ${textoOrigen(origen, 0)}">
      <span class="prod-icono">${iconoHTML(p)}</span>
      <span class="prod-nombre">${p.n}</span>
      <span class="prod-hace">hace ${dias} d</span>
      <span class="prod-cant" ${c > 1 ? '' : 'hidden'}>×${c}</span>
      <span class="prod-descartar" role="button" tabindex="0"
            data-descartar-sug="${p.id}"
            aria-label="No sugerir ${p.n}">×</span>
    </button>`;
}

function seccionHTML(clave, titulo, productos) {
  if (!productos.length) return '';
  const abierta = !plegadas.has(clave);
  return `
    <section class="seccion" data-clave="${clave}" data-abierta="${abierta}">
      <button class="seccion-cab" aria-expanded="${abierta}">
        <h2>${titulo}</h2>
        <span class="seccion-cuenta">${productos.length}</span>
        <span class="seccion-flecha" aria-hidden="true"></span>
      </button>
      <div class="grid">${productos.map(botonHTML).join('')}</div>
    </section>`;
}

export function pintarGrid() {
  if (!raiz) return;

  const lista = filtrar();

  if (!lista.length) {
    raiz.innerHTML = `
      <div class="sin-resultados">
        <p>Ningún producto se llama “${busqueda}”.</p>
        <button data-anadir-libre>Añadir a la lista igualmente</button>
      </div>`;
    return;
  }

  /* Al buscar se muestra todo junto: las secciones estorban */
  if (busqueda.trim()) {
    raiz.innerHTML = `
      <section class="seccion" data-abierta="true">
        <div class="grid">${lista.map(botonHTML).join('')}</div>
      </section>`;
    return;
  }

  let html = seccionSugeridos();

  if (estado.ajustes.vista === 'frecuencia') {
    for (const f of FRECUENCIAS) {
      html += seccionHTML(
        `f${f.id}`, f.nombre, lista.filter(p => p.f === f.id)
      );
    }
  } else {
    for (const c of CATEGORIAS) {
      html += seccionHTML(
        `c${c.id}`, c.nombre, lista.filter(p => p.c === c.id)
      );
    }
  }

  raiz.innerHTML = html;
}
