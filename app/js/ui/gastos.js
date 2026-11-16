/* ============================================================
   VISTA GASTOS
   Historial de compras, importar un ticket, crearlo a mano
   y bandeja de productos pendientes de catalogar
   ============================================================ */

import { listaTickets, ticketPorId, borrarTicket, validarTicket,
         importarTicket, crearTicketManual, actualizarTicket,
         buscarProductos, pendientes, pendientesSugeridos,
         descartarPendiente, resumenGasto, UMBRAL_SUGERENCIA }
  from '../gastos.js?v=18';
import { tiendasActivas, TIENDA_POR_ID } from '../tiendas.js?v=18';
import { POR_ID } from '../estado.js?v=18';
import { aNumero } from '../precios.js?v=18';
import { iconoHTML } from '../iconos.js?v=18';
import { pintarStats, fijarPeriodo } from './stats.js?v=18';
import { euros, tap, $ } from '../util.js?v=18';

let raiz;
let pantalla = 'lista';        // lista | importar | editor | stats
const mesesCerrados = new Set();   // meses plegados en el historial
let borrador = null;
let sugerencias = [];

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
               'agosto','septiembre','octubre','noviembre','diciembre'];

function hoy() { return new Date().toISOString().slice(0, 10); }

function nuevoBorrador() {
  return { id: null, tienda: null, fecha: hoy(), pago: 'tarjeta', lineas: [] };
}

/* Convierte un ticket guardado en borrador editable */
function borradorDe(t) {
  return {
    id: t.id,
    tienda: t.tienda,
    fecha: t.fecha.slice(0, 10),
    pago: t.pago || 'tarjeta',
    lineas: t.lineas.map(l => ({
      id: l.id, n: l.n, c: l.c, cant: l.cant, precio: l.precio
    }))
  };
}

export function abrirEdicionTicket(id) {
  const t = ticketPorId(id);
  if (!t) return false;
  borrador = borradorDe(t);
  pantalla = 'editor';
  pintarGastos();
  return true;
}

/* ---------- arranque ---------- */

export function iniciarGastos(nodo) {
  raiz = nodo;

  raiz.addEventListener('click', e => {
    const t = e.target;

    if (t.closest('#ga-importar')) { pantalla = 'importar'; pintarGastos(); return; }
    if (t.closest('#ga-stats'))    { pantalla = 'stats';    pintarGastos(); return; }
    if (t.closest('#st-volver'))   { pantalla = 'lista';    pintarGastos(); return; }

    const per = t.closest('[data-periodo]');
    if (per) { tap(); fijarPeriodo(per.dataset.periodo); pintarGastos(); return; }

    const verProd = t.closest('[data-ver-prod]');
    if (verProd) {
      tap();
      document.dispatchEvent(new CustomEvent('abrir-ficha',
        { detail: +verProd.dataset.verProd }));
      return;
    }
    if (t.closest('#ga-nuevo')) {
      borrador = nuevoBorrador(); pantalla = 'editor'; pintarGastos(); return;
    }
    if (t.closest('#ga-volver')) { pantalla = 'lista'; borrador = null; pintarGastos(); return; }

    if (t.closest('#ga-pegar')) { pegarDelPortapapeles(); return; }
    if (t.closest('#ga-confirmar-importar')) { hacerImportacion(); return; }

    const mes = t.closest('[data-mes]');
    if (mes) {
      tap();
      const k = mes.dataset.mes;
      mesesCerrados.has(k) ? mesesCerrados.delete(k) : mesesCerrados.add(k);
      pintarGastos();
      return;
    }

    const ed = t.closest('[data-editar-ticket]');
    if (ed) { tap(); abrirEdicionTicket(ed.dataset.editarTicket); return; }

    const pg = t.closest('[data-ed-pago]');
    if (pg) { tap(); borrador.pago = pg.dataset.edPago; pintarGastos(); return; }

    const ver = t.closest('[data-ver-ticket]');
    if (ver) {
      tap();
      document.dispatchEvent(new CustomEvent('ver-ticket',
        { detail: ver.dataset.verTicket }));
      return;
    }

    const borrarTk = t.closest('[data-borrar-ticket]');
    if (borrarTk) { confirmarBorrado(borrarTk.dataset.borrarTicket); return; }

    const quitarPend = t.closest('[data-descartar]');
    if (quitarPend) { tap(); descartarPendiente(quitarPend.dataset.descartar); return; }

    /* ---- editor ---- */
    const tienda = t.closest('[data-ed-tienda]');
    if (tienda) { tap(); borrador.tienda = tienda.dataset.edTienda; pintarGastos(); return; }

    const sug = t.closest('[data-sug]');
    if (sug) { anadirLinea(Number(sug.dataset.sug)); return; }

    if (t.closest('#ga-libre')) { anadirLinea(null); return; }

    const quitar = t.closest('[data-ed-quitar]');
    if (quitar) { tap(); borrador.lineas.splice(+quitar.dataset.edQuitar, 1); pintarGastos(); return; }

    if (t.closest('#ga-guardar')) { guardarBorrador(); return; }
  });

  raiz.addEventListener('input', e => {
    if (e.target.id === 'ga-buscar') {
      sugerencias = buscarProductos(e.target.value);
      pintarSugerencias(e.target.value);
    }
  });

  raiz.addEventListener('change', e => {
    if (!borrador) return;
    if (e.target.id === 'ga-fecha') { borrador.fecha = e.target.value; return; }
    const precio = e.target.closest('[data-ed-precio]');
    if (precio) {
      borrador.lineas[+precio.dataset.edPrecio].precio = aNumero(precio.value);
      actualizarTotalBorrador();
    }
    const cant = e.target.closest('[data-ed-cant]');
    if (cant) {
      borrador.lineas[+cant.dataset.edCant].cant =
        Math.max(1, parseInt(cant.value, 10) || 1);
    }
  });

  raiz.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'ga-buscar') {
      e.preventDefault();
      sugerencias.length ? anadirLinea(sugerencias[0].id) : anadirLinea(null);
    }
  });
}

/* ---------- editor ---------- */

function anadirLinea(id) {
  const input = $('#ga-buscar', raiz);
  const texto = input ? input.value.trim() : '';
  const p = id ? POR_ID[id] : null;
  if (!p && !texto) return;

  borrador.lineas.push({
    id: p ? p.id : null,
    n: p ? p.n : texto,
    cant: 1,
    precio: null
  });
  tap();
  sugerencias = [];
  pintarGastos();
  const nuevo = $('#ga-buscar', raiz);
  if (nuevo) nuevo.focus();
}

function actualizarTotalBorrador() {
  const nodo = $('#ga-total', raiz);
  if (!nodo || !borrador) return;
  const t = borrador.lineas.reduce((a, l) => a + (l.precio ?? 0), 0);
  nodo.textContent = euros(t);
}

function guardarBorrador() {
  const editando = !!borrador.id;
  const r = editando
    ? actualizarTicket(borrador.id, borrador)
    : crearTicketManual(borrador);

  if (!r.ok) { aviso(r.error); return; }
  pantalla = 'lista';
  borrador = null;
  aviso(mensajeDeAlta(r, editando));
  pintarGastos();
}

function mensajeDeAlta(r, editando = false) {
  const partes = [editando ? 'Compra actualizada' : 'Compra guardada'];
  if (r.aprendidos) {
    partes.push(r.aprendidos === 1 ? '1 precio al día' : `${r.aprendidos} precios al día`);
  }
  if (r.nuevos) {
    partes.push(r.nuevos === 1 ? '1 por catalogar' : `${r.nuevos} por catalogar`);
  }
  return partes.join(' · ');
}

function aviso(texto) {
  document.dispatchEvent(new CustomEvent('aviso', { detail: texto }));
}

/* ---------- importar ---------- */

async function pegarDelPortapapeles() {
  try {
    const texto = await navigator.clipboard.readText();
    const campo = $('#ga-json', raiz);
    if (campo) { campo.value = texto; campo.dispatchEvent(new Event('input')); }
  } catch {
    aviso('Pega el texto a mano en el recuadro');
  }
}

function hacerImportacion() {
  const campo = $('#ga-json', raiz);
  const v = validarTicket(campo?.value || '');
  if (!v.ok) { aviso(v.error); return; }

  const r = importarTicket(v.ticket);
  if (!r.ok) { aviso(r.error); return; }

  pantalla = 'lista';
  aviso(mensajeDeAlta(r).replace('Compra guardada', 'Ticket importado'));
  pintarGastos();
}

function confirmarBorrado(id) {
  const t = ticketPorId(id);
  if (!t) return;
  document.dispatchEvent(new CustomEvent('abrir-hoja', {
    detail: {
      titulo: 'Borrar esta compra',
      opciones: [
        { texto: 'Borrar',
          nota: `${euros(t.total)} · los precios aprendidos se quedan`,
          peligro: true,
          accion: () => { borrarTicket(id); aviso('Compra borrada'); } },
        { texto: 'Cancelar' }
      ]
    }
  }));
}

/* ---------- pintado ---------- */

/* Un ticket puede venir de una tienda del catálogo o de un sitio
   puntual escrito a mano. Los dos tienen nombre. */
function nombreDeTicket(t) {
  if (t.tienda) return TIENDA_POR_ID[t.tienda]?.nombre || t.tienda;
  if (t.tiendaTexto) return t.tiendaTexto;
  return 'Sin supermercado';
}

function fechaCorta(iso) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()].slice(0, 3)}`;
}

function pintarSugerencias(texto) {
  const nodo = $('#ga-sugerencias', raiz);
  if (!nodo) return;
  if (!texto.trim()) { nodo.innerHTML = ''; return; }

  nodo.innerHTML = `
    ${sugerencias.map(p => `
      <button class="ga-sug" data-sug="${p.id}">
        <span class="res-icono">${iconoHTML(p)}</span>${p.n}
      </button>`).join('')}
    <button class="ga-sug ga-sug-libre" id="ga-libre">
      <span class="res-icono" aria-hidden="true">＋</span>
      Añadir “${texto.trim()}” como producto nuevo
    </button>`;
}

export function pintarGastos() {
  if (!raiz) return;
  if (pantalla === 'importar') return pintarImportar();
  if (pantalla === 'editor')   return pintarEditor();
  if (pantalla === 'stats')    return pintarStats(raiz);

  const tickets = listaTickets();
  const res = resumenGasto();
  const pend = pendientes();
  const sug = pendientesSugeridos();

  const [anio, mes] = res.mes.split('-');

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Gastos</h1>
      <p>${MESES[+mes - 1]} de ${anio}</p>
    </div>

    <div class="pr-panel" style="margin-top:1.2rem">
      <div class="pr-cab">
        <span>Este mes</span>
        <b>${euros(res.total)}</b>
      </div>
      <p class="pr-nota">${res.compras
        ? `${res.compras} ${res.compras === 1 ? 'compra' : 'compras'} este mes ·
           ${res.historico} en total`
        : 'Todavía no hay ninguna compra este mes.'}</p>
    </div>

    <div class="ga-acciones">
      <button class="btn-secundario" id="ga-nuevo">Nueva compra</button>
      <button class="btn-secundario" id="ga-importar">Importar ticket</button>
    </div>
    ${tickets.length ? `
      <div class="ga-acciones" style="margin-top:0.5px">
        <button class="btn-principal" id="ga-stats">Ver estadísticas</button>
      </div>` : ''}

    ${sug.length ? `
      <div class="ga-aviso">
        <b>${sug.length === 1 ? 'Un producto se repite' : `${sug.length} productos se repiten`}</b>
        <p>${sug.map(p => p.nombre).join(', ')}.
        ${sug.length === 1
          ? `Ha aparecido en ${UMBRAL_SUGERENCIA} compras o más sin estar
             en el catálogo. Merece la pena añadirlo.`
          : `Han aparecido en ${UMBRAL_SUGERENCIA} compras o más sin estar
             en el catálogo. Merece la pena añadirlos.`}</p>
      </div>` : ''}

    ${pend.length ? `
      <div class="aj-bloque">
        <h2>Por catalogar · ${pend.length}</h2>
        ${pend.map(p => `
          <div class="ga-pend">
            <span>${p.nombre}
              <em>${p.veces} ${p.veces === 1 ? 'vez' : 'veces'}${
                p.tiendas.length ? ' · ' + p.tiendas
                  .map(t => TIENDA_POR_ID[t]?.nombre || t).join(', ') : ''}</em></span>
            ${p.precio != null ? `<b>${euros(p.precio)}</b>` : ''}
            <button data-descartar="${p.clave}" aria-label="Descartar ${p.nombre}">×</button>
          </div>`).join('')}
        <p class="ga-nota">Se añaden al catálogo desde el editor, en la Fase 6.
        Mientras tanto quedan apuntados aquí para no olvidarlos.</p>
      </div>` : ''}

    <div class="aj-bloque">
      <h2>Historial${tickets.length ? ` · ${tickets.length}` : ''}</h2>
      ${tickets.length ? porMeses(tickets) : ''}
      ${!tickets.length ? '<p>Aquí aparecerán todas las compras: las que termines en el móvil, las que te manden y las que apuntes a mano.</p>' : ''}
    </div>`;
}

/* El historial se agrupa por meses, cada uno con su total y
   plegable. Al cabo de unos meses una lista plana es inservible. */
function porMeses(tickets) {
  const grupos = new Map();
  for (const t of tickets) {
    const k = t.fecha.slice(0, 7);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(t);
  }

  const mesActual = new Date().toISOString().slice(0, 7);
  let html = '';

  for (const [k, lista] of grupos) {
    const abierto = !mesesCerrados.has(k) && (k === mesActual || grupos.size <= 2
      || [...grupos.keys()].indexOf(k) === 0);
    const total = lista.reduce((a, t) => a + (t.total || 0), 0);
    const [anio, mes] = k.split('-');

    html += `
      <button class="ga-mes" data-mes="${k}" aria-expanded="${abierto}">
        <span>${MESES[+mes - 1]} ${anio}
          <em>${lista.length} ${lista.length === 1 ? 'compra' : 'compras'}</em></span>
        <b>${euros(total)}</b>
        <i class="seccion-flecha" aria-hidden="true"></i>
      </button>
      <div class="ga-mes-cuerpo" ${abierto ? '' : 'hidden'}>
        ${lista.map(filaTicket).join('')}
      </div>`;
  }
  return html;
}

function filaTicket(t) {
  return `
        <div class="ga-fila" ${t.tienda
          ? `style="--marca:${TIENDA_POR_ID[t.tienda]?.color || 'var(--muted)'}"` : ''}>
          <button data-ver-ticket="${t.id}">
            <span>${fechaCorta(t.fecha)}
              <em>${nombreDeTicket(t)}
                  · ${t.lineas.length} art.${t.editado ? ' · editado' : ''}</em></span>
            <b>${euros(t.total)}</b>
          </button>
          <button class="ga-icono" data-editar-ticket="${t.id}"
                  aria-label="Editar compra">✎</button>
          <button class="ga-borrar" data-borrar-ticket="${t.id}"
                  aria-label="Borrar compra">×</button>
        </div>`;
}

function pintarImportar() {
  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Importar</h1>
      <p>Ticket recibido</p>
    </div>

    <div class="aj-bloque">
      <p>Pega aquí los datos del ticket que te hayan mandado. Es el texto
      que sale al pulsar <b>Copiar datos para la app</b> al terminar una
      compra.</p>
    </div>

    <div class="ga-json">
      <textarea id="ga-json" rows="6" placeholder='{"v":1,"id":"t…"}'
                autocomplete="off" spellcheck="false"></textarea>
      <button class="btn-secundario" id="ga-pegar">Pegar del portapapeles</button>
    </div>

    <div class="res-acciones">
      <button class="btn-principal" id="ga-confirmar-importar">Importar</button>
      <button class="btn-secundario" id="ga-volver">Cancelar</button>
    </div>`;
}

function pintarEditor() {
  const total = borrador.lineas.reduce((a, l) => a + (l.precio ?? 0), 0);

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>${borrador.id ? 'Editar compra' : 'Nueva compra'}</h1>
      <p>${borrador.id ? 'Se recalculan el total y los precios' : 'Apuntar lo comprado'}</p>
    </div>

    <div class="aj-bloque">
      <h2>Supermercado</h2>
      <div class="cmp-tiendas">
        ${tiendasActivas().map(t => `
          <button data-ed-tienda="${t.id}" style="--marca:${t.color}"
                  aria-pressed="${borrador.tienda === t.id}">${t.nombre}</button>`).join('')}
      </div>

      <p class="fi-label" style="margin-top:1.2rem">Fecha</p>
      <input class="ga-fecha" id="ga-fecha" type="date" value="${borrador.fecha}" max="${hoy()}">

      <p class="fi-label" style="margin-top:1.2rem">Forma de pago</p>
      <div class="cmp-pago">
        <button data-ed-pago="tarjeta"
                aria-pressed="${borrador.pago === 'tarjeta'}">Tarjeta</button>
        <button data-ed-pago="efectivo"
                aria-pressed="${borrador.pago === 'efectivo'}">Metálico</button>
      </div>
    </div>

    <div class="ga-buscador">
      <input id="ga-buscar" type="text" placeholder="Buscar o escribir un producto"
             autocomplete="off" enterkeyhint="done">
      <div id="ga-sugerencias"></div>
    </div>

    ${borrador.lineas.length ? borrador.lineas.map((l, i) => `
      <div class="ga-linea">
        <span class="res-icono">${l.id ? iconoHTML(POR_ID[l.id]) : '<span aria-hidden="true">＋</span>'}</span>
        <span class="ga-linea-n">${l.n}${l.id ? '' : '<em>Nuevo</em>'}</span>
        <label class="ga-mini">
          <span class="sr">Cantidad de ${l.n}</span>
          <input type="text" inputmode="numeric" data-ed-cant="${i}" value="${l.cant}">
        </label>
        <label class="cmp-precio">
          <span class="sr">Precio de ${l.n}</span>
          <input type="text" inputmode="decimal" data-ed-precio="${i}"
                 value="${l.precio != null ? String(l.precio).replace('.', ',') : ''}"
                 placeholder="0,00">
          <span aria-hidden="true">€</span>
        </label>
        <button class="ga-borrar" data-ed-quitar="${i}"
                aria-label="Quitar ${l.n}">×</button>
      </div>`).join('')
    : '<p class="ga-nota" style="padding:1.4rem var(--pad-x)">Busca productos arriba y ve añadiéndolos. Lo que no esté en el catálogo se puede escribir igual.</p>'}

    <div class="pr-panel" style="margin-top:1.4rem">
      <div class="pr-cab">
        <span>Total</span>
        <b id="ga-total">${euros(total)}</b>
      </div>
    </div>

    <div class="res-acciones">
      <button class="btn-principal" id="ga-guardar">${
        borrador.id ? 'Guardar cambios' : 'Guardar compra'}</button>
      <button class="btn-secundario" id="ga-volver">Cancelar</button>
    </div>`;
}

/* Permite volver a la lista desde fuera (al cambiar de pestaña) */
export function reiniciarGastos() {
  pantalla = 'lista';
  borrador = null;
  sugerencias = [];
}
