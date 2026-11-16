/* ============================================================
   VISTA COMPRADOR
   Checklist en el supermercado, precios y ticket final
   ============================================================ */

import { compraActual, alternarHecho, fijarPrecio, cambiarCantidad,
         anadirExtra, quitarLinea, fijarTienda, fijarPago, progreso,
         total, previsto, sinPrecio, cuantosEstimados, fijarDescuento,
         totalDescuento, fijarTiendaSuelta, finalizar, ticketJSON,
         ticketTexto } from '../compra.js?v=26';
import { CAT_POR_ID } from '../../datos/categorias.js?v=26';
import { tiendasActivas, TIENDA_POR_ID } from '../tiendas.js?v=26';
import { POR_ID } from '../estado.js?v=26';
import { iconoHTML } from '../iconos.js?v=26';
import { preciosDe, formatoBase, NOMBRE_BASE, marcaDe } from '../precios.js?v=26';
import { periodicidad, ultimaCompra, diasDesde, textoUrgencia,
         nivelUrgencia } from '../reposicion.js?v=26';
import { tiendaPreferida } from '../precios.js?v=26';
import { ticketHTML } from './ticket.js?v=26';
import { euros, tap } from '../util.js?v=26';

let raiz, pie, ticketFinal = null;

const CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="m5 12 5 5L20 7"/></svg>`;

const EQUIS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

export const ICONO_TARJETA = `<svg viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="1.5" aria-hidden="true">
  <rect x="2" y="5" width="20" height="14"/><path d="M2 10h20"/>
  <path d="M5.5 15.5h3"/></svg>`;

export const ICONO_EFECTIVO = `<svg viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="1.5" aria-hidden="true">
  <rect x="2" y="6" width="20" height="12"/>
  <circle cx="12" cy="12" r="2.5"/><path d="M5.5 12h.01M18.5 12h.01"/></svg>`;

export function iniciarComprador(nodoLista, nodoPie) {
  raiz = nodoLista;
  pie = nodoPie;

  raiz.addEventListener('click', e => {
    const check = e.target.closest('[data-check]');
    if (check) { tap(); alternarHecho(+check.dataset.check); return; }

    const info = e.target.closest('[data-info]');
    if (info) { tap(); abrirInfo(+info.dataset.info); return; }

    const mas = e.target.closest('[data-mas]');
    if (mas) { tap(); cambiarCantidad(+mas.dataset.mas, 1); return; }

    const menos = e.target.closest('[data-menos]');
    if (menos) { tap(); cambiarCantidad(+menos.dataset.menos, -1); return; }

    const fuera = e.target.closest('[data-quitar]');
    if (fuera) { tap(); quitarLinea(+fuera.dataset.quitar); return; }

    if (e.target.closest('#cmp-anadir-btn')) anadirDesdeInput();
  });

  /* El precio se escribe mientras se teclea pero solo se guarda
     al salir del campo, para no redibujar en cada pulsación */
  raiz.addEventListener('change', e => {
    if (e.target.matches('[data-precio]')) {
      fijarPrecio(+e.target.dataset.precio, e.target.value);
    }
    if (e.target.matches('[data-desc]')) {
      fijarDescuento(+e.target.dataset.desc, e.target.value);
    }
  });

  raiz.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'cmp-extra') { anadirDesdeInput(); return; }
    if (e.target.matches('[data-precio]')) e.target.blur();
  });

  pie.addEventListener('keydown', e => {
    if (e.target.id !== 'cmp-sitio-txt') return;
    if (e.key === 'Enter') { e.preventDefault(); confirmarSitio(); }
    if (e.key === 'Escape') { pidiendoSitio = false; pintarPie(); }
  });

  pie.addEventListener('click', e => {
    const t = e.target.closest('[data-tienda]');
    if (t) {
      tap();
      fijarTienda(t.dataset.tienda || null);
      const n = cuantosEstimados();
      if (n) {
        document.dispatchEvent(new CustomEvent('aviso', {
          detail: `${n} ${n === 1 ? 'precio estimado' : 'precios estimados'} de esta tienda`
        }));
      }
      return;
    }
    if (e.target.closest('#cmp-otro-sitio')) { tap(); pedirSitio(); return; }
    if (e.target.closest('#cmp-sitio-ok')) { confirmarSitio(); return; }

    const pg = e.target.closest('[data-pago]');
    if (pg) { tap(); fijarPago(pg.dataset.pago); return; }
    if (e.target.closest('#cmp-finalizar')) confirmarFinal();
  });
}

function anadirDesdeInput() {
  const input = raiz.querySelector('#cmp-extra');
  if (!input || !anadirExtra(input.value)) return;
  input.value = '';
  input.focus();
}

/* ---------- pintar la checklist ---------- */

/* La exigencia de marca se ve en la propia línea: quien compra
   no debería tener que abrir nada para saber que aquí no vale
   cualquier cosa */
function marcaTexto(l) {
  if (l.k !== 'p') return '';
  const m = marcaDe(l.id);
  if (!m?.estricta) return '';
  return `<em class="cmp-marca">${m.texto || 'Solo la marca de siempre'}</em>`;
}

function lineaHTML(l, i) {
  const precio = l.precio != null
    ? String(l.precio).replace('.', ',')
    : '';
  return `
    <div class="cmp-linea" data-hecho="${l.hecho}"
         ${l.urg ? `data-urg="${nivelUrgencia(l.urg)}"` : ''}>
      <button class="cmp-check" data-check="${i}"
              role="checkbox" aria-checked="${l.hecho}"
              aria-label="${l.hecho ? 'Desmarcar' : 'Marcar'} ${l.n}">${CHECK}</button>

      <div class="cmp-cuerpo">
        <button class="cmp-nombre" data-info="${i}"
                aria-label="Más información sobre ${l.n}">
          <span class="cmp-icono">${l.k === 'p' && POR_ID[l.id]
            ? iconoHTML(POR_ID[l.id]) : `<span aria-hidden="true">${l.e || '✏️'}</span>`}</span>
          <span class="cmp-txt">${l.n}${l.cant > 1 ? `<b>×${l.cant}</b>` : ''}
            ${l.urg ? `<em class="cmp-urg">${textoUrgencia(l.urg)}</em>` : ''}
            ${marcaTexto(l)}</span>
        </button>
        ${l.hecho ? '' : `
        <div class="cmp-pasos">
          <button data-menos="${i}" aria-label="Menos cantidad">−</button>
          <span>${l.cant} ${l.cant === 1 ? 'unidad' : 'unidades'}</span>
          <button data-mas="${i}" aria-label="Más cantidad">+</button>
        </div>`}
      </div>

      ${l.k === 'x'
        ? `<button class="cmp-quitar" data-quitar="${i}"
                   aria-label="Quitar ${l.n}">${EQUIS}</button>`
        : ''}

      <div class="cmp-precios">
        <label class="cmp-precio">
          <span class="sr">Precio de ${l.n}</span>
          <input type="text" inputmode="decimal" data-precio="${i}"
                 value="${precio}" placeholder="0,00"
                 data-estimado="${!!l.estimado}"
                 enterkeyhint="done" autocomplete="off">
          <span aria-hidden="true">€</span>
        </label>
        <label class="cmp-desc">
          <span class="sr">Descuento en ${l.n}</span>
          <input type="text" inputmode="decimal" data-desc="${i}"
                 value="${l.desc != null ? String(l.desc).replace('.', ',') : ''}"
                 placeholder="dto" autocomplete="off">
          <span aria-hidden="true">€</span>
        </label>
      </div>
    </div>`;
}

export function pintarComprador() {
  const c = compraActual();
  if (!c || !raiz) return;

  const p = progreso();
  const nombreTienda = c.tienda
    ? TIENDA_POR_ID[c.tienda]?.nombre
    : (c.tiendaTexto || null);

  /* Orden: primero lo que falta, al final lo ya cogido.
     En el supermercado lo pendiente es lo único que importa. */
  const indexadas = c.lineas.map((l, i) => ({ l, i }));
  const pendientes = indexadas.filter(x => !x.l.hecho);
  const hechas = indexadas.filter(x => x.l.hecho);

  /* Cómo se agrupa lo pendiente:

     Si la lista reparte productos entre dos o más supermercados,
     manda el supermercado: lo primero que necesita saber quien
     compra es a qué tienda va cada cosa.

     Si todo es del mismo sitio (o no hay preferencias), manda la
     categoría, para no cruzar la tienda de punta a punta. */
  const tiendasEnJuego = new Set(
    pendientes.filter(x => x.l.k === 'p')
              .map(x => tiendaPreferida(x.l.id))
              .filter(Boolean)
  );
  const porTienda = tiendasEnJuego.size >= 2;

  let cuerpo = '';
  const grupos = new Map();

  for (const x of pendientes) {
    const clave = porTienda
      ? (x.l.k === 'p' ? tiendaPreferida(x.l.id) || 'libre' : 'libre')
      : (x.l.c || 'otros');
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(x);
  }

  /* Orden estable: el de tiendas.js o el de categorias.js */
  const orden = porTienda
    ? [...TIENDAS.filter(t => t.activa).map(t => t.id), 'libre']
    : [...grupos.keys()];

  for (const clave of orden) {
    const grupo = grupos.get(clave);
    if (!grupo?.length) continue;
    const nombre = porTienda
      ? (TIENDA_POR_ID[clave]?.nombre || 'Cualquier sitio')
      : (CAT_POR_ID[clave]?.nombre || 'Sin categoría');
    cuerpo += `<div class="cmp-grupo">${nombre}</div>`;
    cuerpo += grupo.map(x => lineaHTML(x.l, x.i)).join('');
  }

  if (hechas.length) {
    cuerpo += `<div class="cmp-grupo">En el carro · ${hechas.length}</div>`;
    cuerpo += hechas.map(x => lineaHTML(x.l, x.i)).join('');
  }

  raiz.innerHTML = `
    <div class="cmp-cab">
      <h1>Compra</h1>
      <div class="cmp-meta">
        <span>${nombreTienda || 'Sin supermercado'}</span>
        <span>${p.hechos} de ${p.total}</span>
      </div>
      <div class="cmp-barra"><i style="width:${p.pct}%"></i></div>
    </div>
    ${cuerpo}
    <div class="cmp-anadir">
      <input id="cmp-extra" type="text" placeholder="Añadir algo no previsto"
             autocomplete="off" enterkeyhint="done">
      <button id="cmp-anadir-btn">Añadir</button>
    </div>`;

  pintarPie();
}

function pintarPie() {
  const c = compraActual();
  if (!c) return;

  const estimados = cuantosEstimados();
  const enCarro = total();
  const prevision = previsto();
  const falta = Math.round((prevision - enCarro) * 100) / 100;
  const ahorro = totalDescuento();

  pie.innerHTML = `
    <div class="cmp-total">
      <span>En el carro${ahorro > 0.005 ? ` · ahorras ${euros(ahorro)}` : ''}</span>
      <b>${euros(enCarro)}</b>
    </div>
    ${falta > 0.005 ? `
      <div class="cmp-prevision">
        <span>Previsto al terminar${estimados
          ? ` · ${estimados} estimado${estimados === 1 ? '' : 's'}` : ''}</span>
        <b>${euros(prevision)}</b>
      </div>` : ''}

    <div class="cmp-tiendas" role="group" aria-label="Dónde estás comprando">
      ${tiendasActivas().map(t => `
        <button data-tienda="${t.id}" style="--marca:${t.color}"
                aria-pressed="${c.tienda === t.id}">${t.nombre}</button>`).join('')}
      <button id="cmp-otro-sitio" class="cmp-otro"
              aria-pressed="${!!c.tiendaTexto}">${
        c.tiendaTexto ? c.tiendaTexto : '+ Otro sitio'}</button>
    </div>

    ${pidiendoSitio ? `
      <div class="cmp-sitio">
        <input id="cmp-sitio-txt" type="text" enterkeyhint="done"
               value="${(c.tiendaTexto || '').replace(/"/g, '&quot;')}"
               placeholder="Frutería del mercado" autocomplete="off">
        <button id="cmp-sitio-ok">Listo</button>
      </div>` : ''}

    <div class="cmp-pago" role="group" aria-label="Forma de pago">
      <button data-pago="tarjeta" aria-pressed="${(c.pago || 'tarjeta') === 'tarjeta'}">
        ${ICONO_TARJETA} Tarjeta</button>
      <button data-pago="efectivo" aria-pressed="${c.pago === 'efectivo'}">
        ${ICONO_EFECTIVO} Metálico</button>
    </div>

    <div class="res-acciones" style="padding-left:0;padding-right:0">
      <button class="btn-principal" id="cmp-finalizar">Finalizar compra</button>
    </div>`;
}

/* ------------------------------------------------------------
   INFORMACIÓN DE UN PRODUCTO EN MEDIO DE LA COMPRA

   Quien está en el pasillo necesita otras cosas que quien hace
   la lista en casa: si el precio de aquí es bueno o no, cuánto
   sale el kilo, y si le estaban esperando en otra tienda.
   ------------------------------------------------------------ */
function abrirInfo(i) {
  const c = compraActual();
  const l = c?.lineas[i];
  if (!l) return;

  if (l.k !== 'p' || !POR_ID[l.id]) {
    document.dispatchEvent(new CustomEvent('abrir-hoja', {
      detail: {
        titulo: l.n,
        opciones: [
          { texto: 'Escrito a mano',
            nota: 'No está en el catálogo, así que no hay precios ni historial' },
          { texto: l.hecho ? 'Desmarcar' : 'Marcar como cogido',
            accion: () => alternarHecho(i) }
        ]
      }
    }));
    return;
  }

  const p = POR_ID[l.id];
  const filas = preciosDe(p.id);
  const aqui = c.tienda ? filas.find(f => f.tienda === c.tienda) : null;
  const barata = filas.find(f => f.base != null);
  const per = periodicidad(p.id);
  const dias = diasDesde(ultimaCompra(p.id));

  const opciones = [];

  const m = marcaDe(p.id);
  if (m?.estricta) {
    opciones.push({ texto: m.texto || 'Solo la marca de siempre',
                    nota: 'Aquí no vale cualquier marca' });
  }

  if (aqui) {
    opciones.push({
      texto: `Aquí: ${euros(aqui.formato)}${aqui.cantidad
        ? ` · ${aqui.cantidad} ${aqui.unidad}` : ''}`,
      nota: aqui.base != null
        ? `${formatoBase(aqui.base, p.u)}${aqui.viejo ? ' · dato antiguo' : ''}`
        : 'Sin precio por unidad'
    });
  }

  if (barata && (!aqui || barata.tienda !== c.tienda)) {
    const t = TIENDA_POR_ID[barata.tienda]?.nombre || barata.tienda;
    const dif = aqui?.base != null && barata.base
      ? Math.round((aqui.base / barata.base - 1) * 100) : null;
    opciones.push({
      texto: `Más barato en ${t}`,
      nota: `${formatoBase(barata.base, p.u)}${dif ? ` · aquí pagas un ${dif}% más` : ''}`
    });
  }

  if (!filas.length) {
    opciones.push({ texto: 'Sin precios guardados',
                    nota: 'Apunta lo que pagues y la próxima vez podrás comparar' });
  }

  if (dias != null) {
    opciones.push({
      texto: `Lo compras cada ${per.dias} días`,
      nota: `La última vez fue hace ${dias}`
    });
  }

  opciones.push({
    texto: l.hecho ? 'Desmarcar' : 'Marcar como cogido',
    accion: () => alternarHecho(i)
  });

  document.dispatchEvent(new CustomEvent('abrir-hoja', {
    detail: { titulo: `${p.n} · ${NOMBRE_BASE[p.u]}`, opciones }
  }));
}

/* Un sitio puntual que no merece crearse como tienda fija.
   El campo se abre dentro del pie en vez de usar un prompt del
   navegador: en una app instalada el prompt queda fuera de
   lugar, y en iOS a veces ni aparece. */
let pidiendoSitio = false;

function pedirSitio() {
  pidiendoSitio = !pidiendoSitio;
  pintarPie();
  if (pidiendoSitio) {
    const campo = pie.querySelector('#cmp-sitio-txt');
    campo?.focus();
    campo?.select();
  }
}

function confirmarSitio() {
  const campo = pie.querySelector('#cmp-sitio-txt');
  const limpio = (campo?.value || '').trim();
  if (!limpio) { pidiendoSitio = false; pintarPie(); return; }

  fijarTiendaSuelta(limpio);
  pidiendoSitio = false;
  document.dispatchEvent(new CustomEvent('aviso', {
    detail: `${limpio} · sin precios guardados de aquí`
  }));
}

/* ---------- finalizar ---------- */

function confirmarFinal() {
  const p = progreso();
  const sp = sinPrecio();
  const avisos = [];

  if (p.hechos === 0) {
    document.dispatchEvent(new CustomEvent('aviso', {
      detail: 'Marca lo que hayas cogido'
    }));
    return;
  }
  if (p.hechos < p.total) {
    avisos.push(`${p.total - p.hechos} sin coger, quedarán apuntados aparte`);
  }
  if (sp) {
    avisos.push(`${sp} sin precio, no suman al total`);
  }

  document.dispatchEvent(new CustomEvent('abrir-hoja', {
    detail: {
      titulo: 'Finalizar compra',
      opciones: [
        { texto: 'Cerrar y ver el ticket',
          nota: avisos.join(' · ') || 'Todo cogido y con precio',
          accion: () => {
            ticketFinal = finalizar();
            document.dispatchEvent(new CustomEvent('ir', { detail: 'ticket' }));
          } },
        { texto: 'Seguir comprando' }
      ]
    }
  }));
}

/* ---------- ticket ---------- */

export function pintarTicket(nodo, ticket) {
  const t = ticket || ticketFinal;
  if (!t) {
    nodo.innerHTML = `<div class="vacio"><p><strong>No hay ticket</strong>
      Termina una compra y aparecerá aquí.</p></div>`;
    return;
  }
  ticketFinal = t;

  const tienda = t.tienda ? TIENDA_POR_ID[t.tienda]?.nombre : null;

  nodo.innerHTML = `
    ${ticketHTML(t)}

    <div class="res-acciones">
      <button class="btn-principal" id="tk-enviar">Enviar ticket</button>
      <button class="btn-secundario" id="tk-editar">Editar esta compra</button>
      <button class="btn-secundario" id="tk-json">Copiar datos para la app</button>
      <button class="btn-secundario" id="tk-cerrar">Cerrar</button>
    </div>`;

  nodo.onclick = e => {
    if (e.target.closest('#tk-enviar')) {
      document.dispatchEvent(new CustomEvent('compartir-ticket', {
        detail: { texto: ticketTexto(t, tienda), json: ticketJSON(t) }
      }));
    }
    if (e.target.closest('#tk-editar')) {
      document.dispatchEvent(new CustomEvent('editar-ticket', { detail: t.id }));
    }
    if (e.target.closest('#tk-json')) {
      document.dispatchEvent(new CustomEvent('copiar', {
        detail: { texto: ticketJSON(t), mensaje: 'Datos del ticket copiados' }
      }));
    }
    if (e.target.closest('#tk-cerrar')) {
      document.dispatchEvent(new CustomEvent('salir-comprador'));
    }
  };
}

export function fijarTicketVisible(t) { ticketFinal = t; }
