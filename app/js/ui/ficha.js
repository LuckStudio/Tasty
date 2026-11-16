/* ============================================================
   FICHA DE PRODUCTO
   Precios por supermercado, comparativa y preferencia
   ============================================================ */

import { POR_ID, cantidad, sumar, alternar } from '../estado.js?v=24';
import { preciosDe, guardarPrecio, borrarPrecio, preferencias,
         alternarPreferencia, moverPreferencia, calcularBase, aNumero,
         formatoBase, FORMATOS, NOMBRE_BASE, DIAS_VIEJO,
         equivalentes, enlazarEquivalente, desenlazarEquivalente,
         masBaratoQue, marcaDe, fijarMarca } from '../precios.js?v=24';
import { tiendasActivas, TIENDA_POR_ID } from '../tiendas.js?v=24';
import { CAT_POR_ID } from '../../datos/categorias.js?v=24';
import { PRODUCTOS } from '../estado.js?v=24';
import { historialHTML } from './stats.js?v=24';
import { periodicidad, fijarPeriodicidad, textoOrigen, ultimaCompra,
         diasDesde } from '../reposicion.js?v=24';
import { iconoHTML } from '../iconos.js?v=24';
import { datos } from '../almacen.js?v=24';
import { editarProducto } from '../catalogo-edit.js?v=24';
import { SECCIONES, seccionDe, SECCION_POR_ID } from '../secciones.js?v=24';
import { textosDe as textosDeTicket } from '../alias.js?v=24';
import { recetas as todasLasRecetas } from '../recetas.js?v=24';
import { serie, tendencia } from '../historial.js?v=24';
import { euros, esc, $, tap } from '../util.js?v=24';

let fondo, cuerpo, idActual = null, formAbierto = false, tiendaForm = null;

export function iniciarFicha(nodoFondo, nodoCuerpo) {
  fondo = nodoFondo;
  cuerpo = nodoCuerpo;

  fondo.addEventListener('click', e => {
    if (e.target === fondo) cerrarFicha();
  });

  cuerpo.addEventListener('click', e => {
    const t = e.target;

    if (t.closest('#fi-cerrar')) { cerrarFicha(); return; }

    if (t.closest('#fi-historial')) {
      const id = idActual;
      cerrarFicha();
      document.dispatchEvent(new CustomEvent('abrir-historial', { detail: id }));
      return;
    }

    const pref = t.closest('[data-pref]');
    if (pref) { tap(); alternarPreferencia(idActual, pref.dataset.pref); pintar(); return; }

    const quitarEq = t.closest('[data-quitar-eq]');
    if (quitarEq) {
      tap();
      desenlazarEquivalente(idActual, +quitarEq.dataset.quitarEq);
      pintar();
      return;
    }

    const irEq = t.closest('[data-ir-eq]');
    if (irEq) { tap(); abrirFicha(+irEq.dataset.irEq); return; }

    if (t.closest('#fi-eq-anadir')) { menuEquivalentes(); return; }

    const marca = t.closest('[data-marca]');
    if (marca) {
      tap();
      const modo = marca.dataset.marca;
      const actual = marcaDe(idActual);
      fijarMarca(idActual, {
        estricta: modo === 'estricta',
        texto: modo === 'estricta' ? (actual?.texto || '') : ''
      });
      pintar();
      return;
    }

    if (t.closest('#fi-marca-guardar')) {
      fijarMarca(idActual, { estricta: true, texto: $('#fi-marca-txt', cuerpo)?.value });
      pintar();
      document.dispatchEvent(new CustomEvent('aviso', { detail: 'Marca guardada' }));
      return;
    }

    if (t.closest('#fi-periodo-guardar')) {
      fijarPeriodicidad(idActual, $('#fi-periodo', cuerpo)?.value);
      pintar();
      document.dispatchEvent(new CustomEvent('aviso', { detail: 'Periodicidad guardada' }));
      return;
    }
    if (t.closest('#fi-periodo-auto')) {
      fijarPeriodicidad(idActual, null);
      pintar();
      document.dispatchEvent(new CustomEvent('aviso', { detail: 'Vuelve a calcularse sola' }));
      return;
    }

    const sube = t.closest('[data-subir]');
    if (sube) { tap(); moverPreferencia(idActual, sube.dataset.subir, -1); pintar(); return; }

    const baja = t.closest('[data-bajar]');
    if (baja) { tap(); moverPreferencia(idActual, baja.dataset.bajar, 1); pintar(); return; }

    if (t.closest('#fi-nuevo')) {
      formAbierto = !formAbierto;
      tiendaForm = tiendaForm || tiendasActivas()[0]?.id || null;
      pintar();
      return;
    }

    const elegir = t.closest('[data-form-tienda]');
    if (elegir) { tap(); tiendaForm = elegir.dataset.formTienda; pintar(); return; }

    if (t.closest('#fi-guardar')) { guardarDesdeForm(); return; }

    const borrar = t.closest('[data-borrar]');
    if (borrar) {
      tap();
      borrarPrecio(idActual, borrar.dataset.borrar);
      pintar();
      return;
    }

    const mas = t.closest('#fi-mas');
    if (mas) { tap(); cantidad(idActual) ? sumar(idActual, 1) : alternar(idActual); pintar(); return; }

    const menos = t.closest('#fi-menos');
    if (menos) { tap(); sumar(idActual, -1); pintar(); return; }
  });

  /* Vista previa del €/kg mientras se escribe */
  cuerpo.addEventListener('input', e => {
    if (e.target.closest('#fi-form')) refrescarPrevia();
  });
  cuerpo.addEventListener('change', e => {
    if (e.target.id === 'fi-seccion') {
      /* «Según categoría» = sin elegir: se quita la sección propia */
      editarProducto(idActual, { s: e.target.value || undefined });
      pintar();
      return;
    }
    if (e.target.id === 'fi-pu') {
      const g = aNumero(e.target.value);
      editarProducto(idActual, { pu: g > 0 && g < 100000 ? Math.round(g * 10) / 10 : undefined });
      pintar();
      return;
    }
    if (e.target.closest('#fi-form')) refrescarPrevia();
  });
  cuerpo.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.closest('#fi-form')) guardarDesdeForm();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !fondo.hidden) cerrarFicha();
  });
}

export function abrirFicha(id) {
  if (!POR_ID[id]) return;
  idActual = Number(id);
  formAbierto = false;
  tiendaForm = preferencias(id)[0] || tiendasActivas()[0]?.id || null;
  fondo.hidden = false;
  pintar();
}

export function cerrarFicha() {
  fondo.hidden = true;
  idActual = null;
  formAbierto = false;
}

document.addEventListener('abrir-ficha', e => abrirFicha(e.detail));

/* ---------- previa del precio base ---------- */

function datosForm() {
  const p = POR_ID[idActual];
  return {
    precio: aNumero($('#fi-precio', cuerpo)?.value),
    cant: aNumero($('#fi-cantidad', cuerpo)?.value),
    unidad: $('#fi-unidad', cuerpo)?.value,
    base: p.u
  };
}

function refrescarPrevia() {
  const nodo = $('#fi-previa', cuerpo);
  if (!nodo) return;
  const { precio, cant, unidad, base } = datosForm();
  const r = calcularBase(precio, cant, unidad, base);
  nodo.textContent = r == null
    ? `Escribe precio y formato para ver el ${NOMBRE_BASE[base]}`
    : `= ${formatoBase(r, base)}`;
  nodo.dataset.listo = r != null;
}

function guardarDesdeForm() {
  const { precio, cant, unidad } = datosForm();
  const ok = guardarPrecio(idActual, tiendaForm, {
    precio, cantidad: cant, unidad
  });
  if (!ok) {
    document.dispatchEvent(new CustomEvent('aviso', {
      detail: 'Faltan el precio o el formato'
    }));
    return;
  }
  formAbierto = false;
  pintar();
  document.dispatchEvent(new CustomEvent('aviso', { detail: 'Precio guardado' }));
}

/* ---------- pintado ---------- */

function filaPrecio(f, unidadBase, prefs) {
  const t = TIENDA_POR_ID[f.tienda];
  const puesto = prefs.indexOf(f.tienda);
  const formato = f.cantidad
    ? `${f.formato != null ? euros(f.formato) : '—'} · ${f.cantidad} ${f.unidad}`
    : (f.formato != null ? euros(f.formato) : '—');

  return `
    <div class="fi-fila" data-viejo="${f.viejo}">
      <div class="fi-fila-cab">
        <button class="fi-tienda" data-pref="${f.tienda}"
                style="--marca:${t?.color || 'var(--muted)'}"
                aria-pressed="${puesto >= 0}"
                aria-label="Preferencia de ${t?.nombre}">
          ${puesto === 0 ? '<i aria-hidden="true">★</i>'
            : puesto > 0 ? `<i class="fi-puesto" aria-hidden="true">${puesto + 1}</i>` : ''}
          ${t?.nombre || f.tienda}
        </button>
        ${f.masBarato ? '<span class="fi-tag">Más barato</span>' : ''}
        ${f.diferencia ? `<span class="fi-dif">+${f.diferencia}%</span>` : ''}
      </div>
      <div class="fi-fila-datos">
        <b>${f.base != null ? formatoBase(f.base, unidadBase) : 'sin comparar'}</b>
        <span>${formato}</span>
      </div>
      ${f.viejo ? `<p class="fi-viejo">Dato de hace más de ${DIAS_VIEJO} días</p>` : ''}
      ${f.local ? `<button class="fi-borrar" data-borrar="${f.tienda}">Borrar</button>` : ''}
    </div>`;
}

function pintar() {
  const p = POR_ID[idActual];
  if (!p) return;

  const filas = preciosDe(p.id);
  const prefs = preferencias(p.id);
  const cant = cantidad(p.id);
  const cat = CAT_POR_ID[p.c]?.nombre || '';

  const sinPrecioDe = tiendasActivas()
    .filter(t => !filas.some(f => f.tienda === t.id));

  cuerpo.innerHTML = `
    <div class="fi-cab">
      <span class="fi-icono">${iconoHTML(p)}</span>
      <div class="fi-titulo">
        <h2>${p.n}</h2>
        <p>${cat} · se compara por ${NOMBRE_BASE[p.u]}</p>
      </div>
      <button class="barra-btn" id="fi-cerrar" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>

    ${bloqueFicha(p)}

    <div class="fi-lista">
      <div class="fi-cant">
        <span>En la lista</span>
        <span class="res-pasos">
          <button id="fi-menos" aria-label="Quitar uno">−</button>
          <span>${cant}</span>
          <button id="fi-mas" aria-label="Añadir uno">+</button>
        </span>
      </div>
    </div>

    ${filas.length
      ? filas.map(f => filaPrecio(f, p.u, prefs)).join('')
      : `<p class="fi-nada">Todavía no hay ningún precio de este producto.
         Añade uno y podrás comparar supermercados y estimar el coste
         de la lista antes de salir de casa.</p>`}

    ${bloqueMarca(p.id)}

    ${bloqueEquivalentes(p.id)}

    ${bloquePeriodicidad(p.id)}

    <div class="fi-donde">
      <p class="fi-label">Dónde comprarlo</p>
      ${prefs.length ? `
        <ol class="fi-orden">
          ${prefs.map((t, i) => `
            <li style="--marca:${TIENDA_POR_ID[t]?.color || 'var(--muted)'}">
              <b>${i === 0 ? '★' : i + 1}</b>
              <span>${TIENDA_POR_ID[t]?.nombre || t}
                <em>${i === 0 ? 'Primera opción' : 'Plan B'}</em></span>
              <button data-subir="${t}" ${i === 0 ? 'disabled' : ''}
                      aria-label="Subir ${TIENDA_POR_ID[t]?.nombre}">↑</button>
              <button data-bajar="${t}" ${i === prefs.length - 1 ? 'disabled' : ''}
                      aria-label="Bajar ${TIENDA_POR_ID[t]?.nombre}">↓</button>
              <button data-pref="${t}" aria-label="Quitar ${TIENDA_POR_ID[t]?.nombre}">×</button>
            </li>`).join('')}
        </ol>
        <p class="ga-nota">La primera manda para agrupar la lista y estimar
        el gasto. Las siguientes son el plan B si está cerrado o no queda.</p>`
      : '<p class="ga-nota">Sin preferencia. Toca el nombre de un supermercado de arriba para ponerlo el primero.</p>'}

      <div class="cmp-tiendas" style="margin-top:0.8rem">
        ${tiendasActivas().filter(t => !prefs.includes(t.id)).map(t => `
          <button data-pref="${t.id}" style="--marca:${t.color}">+ ${t.nombre}</button>`).join('')}
      </div>
    </div>

    <button class="fi-anadir" id="fi-nuevo" aria-expanded="${formAbierto}">
      ${formAbierto ? 'Cancelar' : 'Añadir precio'}
    </button>

    ${formAbierto ? formularioHTML(p, sinPrecioDe) : ''}

    ${formAbierto ? '' : historialHTML(p.id)}`;

  if (formAbierto) refrescarPrevia();
}

/* ------------------------------------------------------------
   DATOS DE LA FICHA: sección, peso medio, tendencia, textos de
   ticket y recetas. Lo editable (sección, peso medio) vive en la
   capa editable del catálogo, así que se exporta con el resto.
   ------------------------------------------------------------ */
function bloqueFicha(p) {
  const sec = seccionDe(p);
  const propia = !!(p.s && SECCION_POR_ID[p.s]);
  const todos = serie(p.id, datos.tickets, p);
  const tend = tendencia(todos);
  const textos = textosDeTicket(p.id);
  const enRecetas = todasLasRecetas().filter(r => (r.ingredientes || []).some(i => i.id === p.id));

  const chipTend = !tend ? '' : tend.estado === 'baja' ? `<span class="fi-chip fi-baja">↓ ${tend.pct} % en 3 meses</span>`
    : tend.estado === 'sube' ? `<span class="fi-chip fi-sube">↑ ${tend.pct} % en 3 meses</span>`
    : '<span class="fi-chip">Precio estable</span>';

  return `
    <div class="fi-datos">
      <div class="fi-chips">
        <span class="fi-chip">${esc(SECCION_POR_ID[sec]?.nombre || 'Sin sección')}</span>
        <span class="fi-chip">Se vende por ${p.u === 'ud' ? 'unidad' : p.u === 'l' ? 'litro' : 'kg'}</span>
        ${chipTend}
      </div>

      <button class="fi-hist" id="fi-historial">
        <span>Cómo ha cambiado el precio</span><b aria-hidden="true">›</b></button>

      <label class="fi-dato"><span>Sección del supermercado</span>
        <select id="fi-seccion" class="ga-fecha">
          <option value="">Según su categoría (${esc(SECCION_POR_ID[seccionDe({ c: p.c })]?.nombre || '—')})</option>
          ${SECCIONES.map(s => `<option value="${s.id}" ${propia && p.s === s.id ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}
        </select></label>

      ${p.u === 'kg' ? `
      <label class="fi-dato"><span>Peso medio de una unidad (g)</span>
        <input id="fi-pu" class="ga-fecha" inputmode="decimal" placeholder="Ej.: 85"
               value="${p.pu ? String(p.pu).replace('.', ',') : ''}"></label>
      <p class="ga-nota">Sirve para pasar de «6 kiwis» a gramos en recetas y comparar precios.</p>` : ''}

      ${textos.length ? `<p class="fi-label">Así aparece en los tickets</p>
        <div class="fi-chips">${textos.map(t => `<span class="fi-ticket">${esc(t.texto.toUpperCase())}</span>`).join('')}</div>` : ''}

      ${enRecetas.length ? `<p class="fi-label">En tus recetas</p>
        <div class="fi-chips">${enRecetas.map(r => `<span class="fi-chip">${esc(r.nombre)}</span>`).join('')}</div>` : ''}
    </div>`;
}

/* ------------------------------------------------------------
   CADA CUÁNTO SE COMPRA

   Si hay historial suficiente la cifra sale sola de los tickets.
   Se puede fijar a mano, y entonces manda esa. La interfaz dice
   siempre de dónde viene el número: una estimación sin historial
   no puede presentarse como si fuera un dato.
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   MARCA EXIGIDA

   Para cuando compra otra persona. Que en la lista ponga
   "cualquiera vale" o "solo Marca X" ahorra la llamada desde el
   pasillo del súper.
   ------------------------------------------------------------ */
function bloqueMarca(id) {
  const m = marcaDe(id);
  const estricta = !!m?.estricta;

  return `
    <div class="fi-marca">
      <p class="fi-label">Exigencia de marca</p>
      <div class="cmp-pago">
        <button data-marca="libre" aria-pressed="${!estricta}">Cualquiera vale</button>
        <button data-marca="estricta" aria-pressed="${estricta}">Marca concreta</button>
      </div>
      ${estricta ? `
        <div class="fi-campos" style="margin-top:0.7rem">
          <label class="fi-dato">
            <span class="sr">Qué marca</span>
            <input id="fi-marca-txt" type="text"
                   value="${(m?.texto || '').replace(/"/g, '&quot;')}"
                   placeholder="Solo marca X" autocomplete="off">
          </label>
          <button class="fi-anadir" id="fi-marca-guardar"
                  style="margin:0;flex:0 0 auto;padding:0.55rem 0.9rem">Guardar</button>
        </div>
        <p class="ga-nota">Aparecerá destacado en la lista de quien vaya a comprar.</p>`
      : ''}
    </div>`;
}

/* ------------------------------------------------------------
   EQUIVALENTES

   Dos productos que se sustituyen entre sí. Sirve para que la
   app pueda avisarte de que hay algo igual de válido y más
   barato antes de que lo metas en la lista.
   ------------------------------------------------------------ */
function bloqueEquivalentes(id) {
  const eq = equivalentes(id);
  const barato = masBaratoQue(id);

  return `
    <div class="fi-eq">
      <p class="fi-label">Equivalentes</p>

      ${barato ? `
        <div class="fi-alternativa">
          <b>${barato.producto.n} sale un ${barato.ahorro}% más barato</b>
          <span>${formatoBase(barato.precio.base, barato.producto.u)}
            en ${TIENDA_POR_ID[barato.precio.tienda]?.nombre || barato.precio.tienda}
            ${barato.enlazado ? '' : ' · misma categoría'}</span>
          <button data-ir-eq="${barato.producto.id}">Ver ficha</button>
        </div>` : ''}

      ${eq.length ? `
        <div class="fi-eq-lista">
          ${eq.map(x => `
            <div class="fi-eq-item">
              <button data-ir-eq="${x}">${POR_ID[x]?.n}</button>
              <button data-quitar-eq="${x}" aria-label="Desenlazar">×</button>
            </div>`).join('')}
        </div>`
      : '<p class="ga-nota" style="padding-top:0">Sin equivalentes enlazados. Se buscan candidatos en su misma categoría.</p>'}

      <button class="fi-anadir" id="fi-eq-anadir">Enlazar un equivalente</button>
    </div>`;
}

function menuEquivalentes() {
  const p = POR_ID[idActual];
  const ya = equivalentes(idActual);

  /* Solo tiene sentido enlazar cosas comparables: misma unidad
     y misma categoría. Un yogur por unidad y un queso por kilo
     no se pueden comparar en precio. */
  const candidatos = PRODUCTOS
    .filter(x => x.id !== idActual && x.c === p.c && x.u === p.u && !ya.includes(x.id))
    .slice(0, 12);

  if (!candidatos.length) {
    document.dispatchEvent(new CustomEvent('aviso', {
      detail: 'No hay otros productos comparables en su categoría'
    }));
    return;
  }

  document.dispatchEvent(new CustomEvent('abrir-hoja', {
    detail: {
      titulo: `Equivalente a ${p.n}`,
      opciones: candidatos.map(c => ({
        texto: c.n,
        nota: CAT_POR_ID[c.c]?.nombre,
        accion: () => { enlazarEquivalente(idActual, c.id); pintar(); }
      }))
    }
  }));
}

function bloquePeriodicidad(id) {
  const per = periodicidad(id);
  const ultima = ultimaCompra(id);
  const dias = diasDesde(ultima);
  const toca = dias != null && dias >= per.dias * 0.85;

  return `
    <div class="fi-periodo">
      <p class="fi-label">Cada cuánto lo compras</p>

      <div class="fi-periodo-cifra" data-toca="${toca}">
        <b>${per.dias}</b>
        <span>días<em>${textoOrigen(per.origen, per.compras)}</em></span>
      </div>

      ${ultima ? `
        <p class="fi-periodo-nota" data-toca="${toca}">
          Última vez hace <b>${dias} ${dias === 1 ? 'día' : 'días'}</b>.
          ${toca ? 'Ya tocaría reponerlo.' : `Tocaría en ${per.dias - dias} días.`}
        </p>`
      : '<p class="fi-periodo-nota">Todavía no lo has comprado con la app.</p>'}

      <div class="fi-campos" style="margin-top:0.8rem">
        <label class="fi-dato">
          <span class="sr">Días entre compras</span>
          <input id="fi-periodo" type="text" inputmode="numeric"
                 value="${per.origen === 'manual' ? per.dias : ''}"
                 placeholder="${per.dias}" autocomplete="off">
          <b>días</b>
        </label>
        <button class="fi-anadir" id="fi-periodo-guardar"
                style="margin:0;flex:0 0 auto;padding:0.55rem 0.9rem">Fijar</button>
      </div>
      ${per.origen === 'manual'
        ? '<button class="fi-borrar" id="fi-periodo-auto" style="position:static;opacity:1;margin-top:0.5rem">Volver al cálculo automático</button>'
        : ''}
    </div>`;
}

function formularioHTML(p, sugeridas) {
  const unidades = FORMATOS[p.u] || FORMATOS.ud;
  const orden = [...sugeridas, ...tiendasActivas().filter(t => !sugeridas.includes(t))];

  return `
    <div class="fi-form" id="fi-form">
      <p class="fi-label">Supermercado</p>
      <div class="cmp-tiendas">
        ${orden.map(t => `
          <button data-form-tienda="${t.id}" style="--marca:${t.color}"
                  aria-pressed="${tiendaForm === t.id}">${t.nombre}</button>`).join('')}
      </div>

      <p class="fi-label">Lo que pagas en caja</p>
      <div class="fi-campos">
        <label class="fi-dato">
          <span class="sr">Precio</span>
          <input id="fi-precio" type="text" inputmode="decimal"
                 placeholder="1,29" autocomplete="off">
          <b>€</b>
        </label>
        <span class="fi-por">por</span>
        <label class="fi-dato">
          <span class="sr">Cantidad del formato</span>
          <input id="fi-cantidad" type="text" inputmode="decimal"
                 placeholder="${p.u === 'ud' ? '1' : '200'}" autocomplete="off">
        </label>
        <label class="fi-campo fi-campo-select">
          <span class="sr">Unidad</span>
          <select id="fi-unidad">
            ${unidades.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('')}
          </select>
        </label>
      </div>

      <p class="fi-previa" id="fi-previa" data-listo="false"></p>
      <button class="btn-principal" id="fi-guardar">Guardar precio</button>
    </div>`;
}
