/* ============================================================
   VISTA ADMIN
   Catálogo editable, iconos, export e importación
   ============================================================ */

import { catalogoCompleto, POR_ID } from '../estado.js?v=24';
import { crearProducto, editarProducto, archivarProducto,
         restaurarProducto, borrarProductoNuevo, puedeBorrarse,
         catalogarPendiente, comprobarIconos, exportar,
         importarSnapshot, estadoCatalogo, rutaDe, slugDe,
         localesRedundantes, limpiarRedundantes }
  from '../catalogo-edit.js?v=24';
import { pendientes } from '../gastos.js?v=24';
import { SET_ICONOS } from '../../datos/iconos.js?v=24';
import { preferencias, alternarPreferencia, moverPreferencia } from '../precios.js?v=24';
import { tiendasActivas, TIENDA_POR_ID } from '../tiendas.js?v=24';
import { CATEGORIAS, CAT_POR_ID, FRECUENCIAS } from '../../datos/categorias.js?v=24';
import { iconoHTML } from '../iconos.js?v=24';
import { normalizar, $, tap } from '../util.js?v=24';

let raiz;
let pantalla = 'lista';     // lista | editor | iconos | datos
let filtro = 'todos';
let busqueda = '';
let editando = null;        // id o 'nuevo' o {pendiente: clave}
let informeIconos = null;
let comprobando = false;

const UNIDADES = [
  { id: 'kg', nombre: 'Por peso (kg)' },
  { id: 'l',  nombre: 'Por volumen (L)' },
  { id: 'ud', nombre: 'Por unidad' }
];

const FILTROS = [
  { id: 'todos',      nombre: 'Todos' },
  { id: 'nuevos',     nombre: 'Nuevos' },
  { id: 'editados',   nombre: 'Editados' },
  { id: 'archivados', nombre: 'Archivados' }
];

export function reiniciarAdmin() {
  pantalla = 'lista'; editando = null; busqueda = ''; filtro = 'todos';
}

function aviso(t) {
  document.dispatchEvent(new CustomEvent('aviso', { detail: t }));
}

/* ---------- arranque ---------- */

export function iniciarAdmin(nodo) {
  raiz = nodo;

  raiz.addEventListener('click', e => {
    const t = e.target;

    if (t.closest('#ad-volver')) {
      if (pantalla === 'lista') {
        document.dispatchEvent(new CustomEvent('ir', { detail: 'ajustes' }));
      } else { pantalla = 'lista'; editando = null; pintarAdmin(); }
      return;
    }

    if (t.closest('#ad-iconos')) { pantalla = 'iconos'; pintarAdmin(); return; }
    if (t.closest('#ad-datos'))  { pantalla = 'datos';  pintarAdmin(); return; }

    if (t.closest('#ad-limpiar-red')) {
      const n = limpiarRedundantes();
      aviso(n ? `${n} copia${n === 1 ? '' : 's'} sobrante${n === 1 ? '' : 's'} retirada${n === 1 ? '' : 's'}` : 'No había nada que limpiar');
      pintarAdmin();
      return;
    }

    if (t.closest('#ad-nuevo')) {
      editando = 'nuevo'; pantalla = 'editor'; pintarAdmin(); return;
    }

    const abrir = t.closest('[data-editar]');
    if (abrir) {
      tap(); editando = +abrir.dataset.editar; pantalla = 'editor'; pintarAdmin(); return;
    }

    const cat = t.closest('[data-catalogar]');
    if (cat) {
      tap();
      editando = { pendiente: cat.dataset.catalogar };
      pantalla = 'editor'; pintarAdmin(); return;
    }

    const f = t.closest('[data-filtro]');
    if (f) { tap(); filtro = f.dataset.filtro; pintarAdmin(); return; }

    if (t.closest('#ad-guardar')) { guardar(); return; }
    if (t.closest('#ad-archivar')) { alternarArchivo(); return; }
    if (t.closest('#ad-restaurar')) {
      restaurarProducto(editando); aviso('Cambios deshechos');
      pantalla = 'lista'; editando = null; pintarAdmin(); return;
    }
    if (t.closest('#ad-borrar')) {
      const r = borrarProductoNuevo(editando);
      aviso(r.ok ? 'Producto borrado' : r.error);
      if (r.ok) { pantalla = 'lista'; editando = null; }
      pintarAdmin(); return;
    }

    const pref = t.closest('[data-ad-pref]');
    if (pref) { tap(); alternarPreferencia(editando, pref.dataset.adPref); pintarAdmin(); return; }

    const sube = t.closest('[data-ad-subir]');
    if (sube) { tap(); moverPreferencia(editando, sube.dataset.adSubir, -1); pintarAdmin(); return; }

    const baja = t.closest('[data-ad-bajar]');
    if (baja) { tap(); moverPreferencia(editando, baja.dataset.adBajar, 1); pintarAdmin(); return; }

    if (t.closest('#ad-comprobar')) { lanzarComprobacion(); return; }
    if (t.closest('#ad-copiar-faltan')) { copiarFaltantes(); return; }
    if (t.closest('#ad-exportar')) { copiarExport(); return; }
    if (t.closest('#ad-importar')) { hacerImport(); return; }
  });

  raiz.addEventListener('input', e => {
    if (e.target.id === 'ad-buscar') {
      busqueda = e.target.value;
      pintarListado();
    }
  });
}

/* ---------- acciones ---------- */

function leerFormulario() {
  return {
    n: $('#ad-n', raiz)?.value ?? '',
    c: $('#ad-c', raiz)?.value ?? '',
    f: $('#ad-f', raiz)?.value ?? '2',
    u: $('#ad-u', raiz)?.value ?? 'ud',
    e: $('#ad-e', raiz)?.value ?? ''
  };
}

function guardar() {
  const datos = leerFormulario();

  if (editando === 'nuevo') {
    const r = crearProducto(datos);
    if (!r.ok) { aviso(r.error); return; }
    aviso(`${r.producto.n} añadido con el id ${r.producto.id}`);
  } else if (typeof editando === 'object' && editando.pendiente) {
    const r = catalogarPendiente(editando.pendiente, datos);
    if (!r.ok) { aviso(r.error); return; }
    aviso(`${r.producto.n} catalogado con el id ${r.producto.id}`);
  } else {
    const r = editarProducto(editando, {
      n: datos.n, c: datos.c, f: +datos.f, u: datos.u,
      e: datos.e.trim() || null
    });
    if (!r.ok) { aviso(r.error); return; }
    aviso('Guardado');
  }

  pantalla = 'lista'; editando = null; pintarAdmin();
}

function alternarArchivo() {
  const p = POR_ID[editando];
  if (!p) return;
  archivarProducto(editando, !p.a);
  aviso(p.a ? 'Producto recuperado' : 'Producto archivado');
  pantalla = 'lista'; editando = null; pintarAdmin();
}

async function lanzarComprobacion() {
  if (comprobando) return;
  comprobando = true;
  informeIconos = null;
  pintarAdmin();

  /* Solo se comprueban los SVG declarados: los demás usan emoji
     a propósito y pedirlos sería inventarse cientos de 404 */
  const lista = catalogoCompleto()
    .filter(p => !p.a && SET_ICONOS.has(slugDe(p)));

  if (!lista.length) {
    comprobando = false;
    informeIconos = { hay: [], faltan: [], ninguno: true };
    pintarAdmin();
    return;
  }
  const barra = $('#ad-progreso', raiz);

  informeIconos = await comprobarIconos(lista, (hechos, total) => {
    if (barra) barra.textContent = `Comprobando ${hechos} de ${total}…`;
  });

  comprobando = false;
  pintarAdmin();
}

function copiarFaltantes() {
  if (!informeIconos) return;
  const texto = informeIconos.faltan
    .map(x => `${x.ruta}   (${x.producto.n})`).join('\n');
  document.dispatchEvent(new CustomEvent('copiar', {
    detail: { texto, mensaje: `${informeIconos.faltan.length} rutas copiadas` }
  }));
}

function copiarExport() {
  const snapshot = exportar();
  document.dispatchEvent(new CustomEvent('copiar', {
    detail: {
      texto: JSON.stringify(snapshot, null, 2),
      mensaje: `Copiado · ${snapshot.resumen.productos} productos`
    }
  }));
}

function hacerImport() {
  const campo = $('#ad-json', raiz);
  const r = importarSnapshot(campo?.value || '');
  if (!r.ok) { aviso(r.error); return; }
  aviso(`${r.productos} productos · ${r.nuevos} nuevos · ${r.editados} editados`);
  pantalla = 'lista'; pintarAdmin();
}

/* ---------- pintado ---------- */

export function pintarAdmin() {
  if (!raiz) return;
  if (pantalla === 'editor') return pintarEditor();
  if (pantalla === 'iconos') return pintarIconos();
  if (pantalla === 'datos')  return pintarDatos();
  pintarLista();
}

function filtrar() {
  let lista = catalogoCompleto();

  if (filtro === 'nuevos')     lista = lista.filter(p => p.esNuevo);
  if (filtro === 'editados')   lista = lista.filter(p => p.editado);
  if (filtro === 'archivados') lista = lista.filter(p => p.a);
  else if (filtro === 'todos') lista = lista.filter(p => !p.a);

  if (busqueda.trim()) {
    const q = normalizar(busqueda.trim());
    lista = lista.filter(p => normalizar(p.n).includes(q));
  }
  return lista;
}

function filaProducto(p) {
  const etiquetas = [];
  if (p.esNuevo) etiquetas.push('<em class="ad-tag">Nuevo</em>');
  if (p.editado) etiquetas.push('<em class="ad-tag">Editado</em>');
  if (p.a)       etiquetas.push('<em class="ad-tag ad-tag-gris">Archivado</em>');

  return `
    <button class="ad-fila" data-editar="${p.id}">
      <span class="res-icono">${iconoHTML(p)}</span>
      <span class="ad-fila-n">${p.n}${etiquetas.length
        ? `<span class="ad-tags">${etiquetas.join('')}</span>` : ''}
        <em>${CAT_POR_ID[p.c]?.nombre || p.c} · ${p.u}</em></span>
      <span class="ad-id">${p.id}</span>
    </button>`;
}

function pintarListado() {
  const nodo = $('#ad-listado', raiz);
  if (!nodo) return;
  const lista = filtrar();
  nodo.innerHTML = lista.length
    ? lista.map(filaProducto).join('')
    : '<p class="ga-nota" style="padding:1.5rem 0">Nada por aquí.</p>';
  const cuenta = $('#ad-cuenta', raiz);
  if (cuenta) cuenta.textContent = lista.length;
}

function pintarLista() {
  const est = estadoCatalogo();
  const pend = pendientes();
  const redundantes = localesRedundantes();

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Catálogo</h1>
      <p>${est.activos} activos · ${est.nuevos} nuevos · ${est.editados} editados</p>
    </div>

    <div class="ga-acciones">
      <button class="btn-secundario" id="ad-iconos">Iconos</button>
      <button class="btn-secundario" id="ad-datos">Copia y export</button>
    </div>
    <div class="ga-acciones" style="margin-top:0.5px">
      <button class="btn-principal" id="ad-nuevo">Añadir producto</button>
    </div>

    ${redundantes.length ? `
      <div class="ga-aviso">
        <b>${redundantes.length} ${redundantes.length === 1
          ? 'producto ya consolidado' : 'productos ya consolidados'}</b>
        <p>${redundantes.map(p => p.n).join(', ')} ya
        ${redundantes.length === 1 ? 'está' : 'están'} en el catálogo de
        serie, así que ${redundantes.length === 1 ? 'tu copia local sobra' : 'tus copias locales sobran'}.
        Puedes retirar${redundantes.length === 1 ? 'la' : 'las'} sin perder nada.</p>
      </div>
      <div class="ga-acciones">
        <button class="btn-secundario" id="ad-limpiar-red">Retirar copias sobrantes</button>
      </div>` : ''}

    ${pend.length ? `
      <div class="aj-bloque">
        <h2>Por catalogar · ${pend.length}</h2>
        ${pend.map(p => `
          <button class="ad-fila" data-catalogar="${p.clave}">
            <span class="res-icono" aria-hidden="true">＋</span>
            <span class="ad-fila-n">${p.nombre}
              <em>${p.veces} ${p.veces === 1 ? 'compra' : 'compras'}</em></span>
            <span class="ad-id">añadir</span>
          </button>`).join('')}
      </div>` : ''}

    <div class="ga-buscador" style="margin-top:1.4rem">
      <input id="ad-buscar" type="text" placeholder="Buscar en el catálogo"
             value="${busqueda}" autocomplete="off">
    </div>

    <div class="st-periodos">
      ${FILTROS.map(f => `
        <button data-filtro="${f.id}"
                aria-pressed="${filtro === f.id}">${f.nombre}</button>`).join('')}
    </div>

    <div class="ad-cuenta"><span id="ad-cuenta">0</span> productos</div>
    <div id="ad-listado"></div>

    <div class="res-acciones">
      <button class="btn-secundario" id="ad-volver">Volver a ajustes</button>
    </div>`;

  pintarListado();
}

function pintarEditor() {
  const esNuevo = editando === 'nuevo';
  const esPendiente = typeof editando === 'object' && editando.pendiente;

  let p = { n: '', c: 'despensa', f: 2, u: 'ud', e: '' };
  let titulo = 'Nuevo producto';

  if (esPendiente) {
    const pend = pendientes().find(x => x.clave === editando.pendiente);
    p = { n: pend?.nombre || '', c: 'despensa', f: 2, u: 'ud', e: '' };
    titulo = 'Catalogar';
  } else if (!esNuevo) {
    p = POR_ID[editando] || p;
    titulo = 'Editar producto';
  }

  const slugPrevisto = p.n ? slugDe({ n: p.n }) : '…';
  const rutaPrevista = p.n && p.c ? rutaDe({ n: p.n, c: p.c }) : '';

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>${titulo}</h1>
      <p>${esNuevo || esPendiente
        ? 'Se le asignará un id permanente'
        : `Id ${p.id} · no cambia nunca`}</p>
    </div>

    <div class="aj-bloque">
      <p class="fi-label">Nombre</p>
      <input class="ga-fecha" id="ad-n" type="text" value="${p.n.replace(/"/g, '&quot;')}"
             placeholder="Tomate cherry" autocomplete="off">

      <p class="fi-label" style="margin-top:1.2rem">Categoría</p>
      <select class="ga-fecha" id="ad-c">
        ${CATEGORIAS.map(c => `
          <option value="${c.id}" ${c.id === p.c ? 'selected' : ''}>${c.nombre}</option>`).join('')}
      </select>

      <p class="fi-label" style="margin-top:1.2rem">Con qué frecuencia se compra</p>
      <select class="ga-fecha" id="ad-f">
        ${FRECUENCIAS.map(f => `
          <option value="${f.id}" ${f.id === p.f ? 'selected' : ''}>${f.nombre}</option>`).join('')}
      </select>

      <p class="fi-label" style="margin-top:1.2rem">Cómo se compara su precio</p>
      <select class="ga-fecha" id="ad-u">
        ${UNIDADES.map(u => `
          <option value="${u.id}" ${u.id === p.u ? 'selected' : ''}>${u.nombre}</option>`).join('')}
      </select>

      <p class="fi-label" style="margin-top:1.2rem">Emoji de reserva</p>
      <input class="ga-fecha" id="ad-e" type="text" value="${p.e || ''}"
             placeholder="🍅" maxlength="4" autocomplete="off">
      <p class="ga-nota">Se usa mientras no exista su SVG.</p>
    </div>

    ${!esNuevo && !esPendiente ? bloqueDonde(p.id) : ''}

    ${rutaPrevista ? `
      <div class="aj-bloque">
        <h2>Su icono irá aquí</h2>
        <code class="ad-ruta">${rutaPrevista}</code>
        <p class="ga-nota">Si cambias el nombre cambia también la ruta del icono.
        El archivo actual dejaría de encontrarse y habría que renombrarlo.</p>
      </div>` : ''}

    <div class="res-acciones">
      <button class="btn-principal" id="ad-guardar">Guardar</button>
      ${!esNuevo && !esPendiente ? `
        ${p.editado ? '<button class="btn-secundario" id="ad-restaurar">Deshacer mis cambios</button>' : ''}
        ${puedeBorrarse(p.id)
          ? '<button class="btn-secundario" id="ad-borrar">Borrar del todo</button>'
          : `<button class="btn-secundario" id="ad-archivar">${
              p.a ? 'Recuperar' : 'Archivar'}</button>`}` : ''}
      <button class="btn-secundario" id="ad-volver">Cancelar</button>
    </div>`;
}

/* Orden de preferencia de compra: dónde ir primero y el plan B */
function bloqueDonde(id) {
  const prefs = preferencias(id);
  return `
    <div class="aj-bloque">
      <h2>Dónde comprarlo</h2>
      ${prefs.length ? `
        <ol class="fi-orden">
          ${prefs.map((t, i) => `
            <li style="--marca:${TIENDA_POR_ID[t]?.color || 'var(--muted)'}">
              <b>${i === 0 ? '★' : i + 1}</b>
              <span>${TIENDA_POR_ID[t]?.nombre || t}
                <em>${i === 0 ? 'Primera opción' : 'Plan B'}</em></span>
              <button data-ad-subir="${t}" ${i === 0 ? 'disabled' : ''}
                      aria-label="Subir">↑</button>
              <button data-ad-bajar="${t}" ${i === prefs.length - 1 ? 'disabled' : ''}
                      aria-label="Bajar">↓</button>
              <button data-ad-pref="${t}" aria-label="Quitar">×</button>
            </li>`).join('')}
        </ol>` : '<p class="ga-nota" style="padding-top:0">Sin preferencia todavía.</p>'}

      <div class="cmp-tiendas" style="margin-top:0.8rem">
        ${tiendasActivas().filter(t => !prefs.includes(t.id)).map(t => `
          <button data-ad-pref="${t.id}" style="--marca:${t.color}">+ ${t.nombre}</button>`).join('')}
      </div>
      <p class="ga-nota">La primera manda para agrupar la lista y estimar el
      gasto. Las siguientes son adonde ir si está cerrado o no queda.</p>
    </div>`;
}

function pintarIconos() {
  const total = catalogoCompleto().filter(p => !p.a).length;

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Iconos</h1>
      <p>${total} productos activos</p>
    </div>

    <div class="aj-bloque">
      <p>Por defecto cada producto usa su <b>emoji</b>. Se ve igual en
      todos los móviles y no hay que dibujar nada.</p>
      <p>Si quieres sustituir alguno por un SVG tuyo: dibújalo siguiendo
      <code>iconos/LEEME.txt</code>, súbelo a
      <code>iconos/[categoría]/[nombre].svg</code> y escribe su nombre en
      <code>datos/iconos.js</code>. Solo se piden al servidor los que
      estén declarados ahí.</p>
    </div>

    ${comprobando ? `
      <div class="aj-bloque"><p id="ad-progreso">Comprobando…</p></div>`
    : informeIconos ? `
      <div class="st-cifras">
        <div class="st-cifra"><b>${informeIconos.hay.length}</b><span>Con SVG</span></div>
        <div class="st-cifra"><b>${informeIconos.faltan.length}</b><span>Con emoji</span></div>
      </div>

      ${informeIconos.ninguno ? `
        <div class="aj-bloque"><p>No hay ningún SVG declarado en
        <code>datos/iconos.js</code>, así que todos los productos van con
        su emoji.</p></div>`
      : informeIconos.faltan.length ? `
        <div class="aj-bloque">
          <h2>Sin SVG todavía</h2>
          ${informeIconos.faltan.slice(0, 40).map(x => `
            <div class="ad-ruta-fila">
              <code>${x.ruta}</code>
              <span>${x.producto.n}</span>
            </div>`).join('')}
          ${informeIconos.faltan.length > 40
            ? `<p class="ga-nota">Y ${informeIconos.faltan.length - 40} más.</p>` : ''}
        </div>
        <div class="res-acciones">
          <button class="btn-secundario" id="ad-copiar-faltan">Copiar todas las rutas</button>
        </div>` : `
        <div class="aj-bloque"><p>Todos los productos tienen su SVG.</p></div>`}

      <div class="res-acciones">
        <button class="btn-secundario" id="ad-comprobar">Volver a comprobar</button>
      </div>`
    : `
      <div class="res-acciones">
        <button class="btn-principal" id="ad-comprobar">Comprobar iconos</button>
      </div>`}

    <div class="res-acciones">
      <button class="btn-secundario" id="ad-volver">Volver</button>
    </div>`;
}

function pintarDatos() {
  const est = estadoCatalogo();

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Copia y export</h1>
      <p>${est.sinCambios ? 'Sin cambios locales' : 'Hay cambios sin consolidar'}</p>
    </div>

    <div class="aj-bloque">
      <h2>Exportar</h2>
      <p>Copia una instantánea completa: el catálogo tal y como debe
      quedar, más el detalle de qué has tocado y desde qué valor. Sirve
      para regenerar <code>datos/catalogo.js</code> y también como copia
      de seguridad.</p>
      <div class="aj-dato"><span>Productos</span><span>${est.total}</span></div>
      <div class="aj-dato"><span>Nuevos</span><span>${est.nuevos}</span></div>
      <div class="aj-dato"><span>Editados</span><span>${est.editados}</span></div>
      <div class="aj-dato"><span>Archivados</span><span>${est.archivados}</span></div>
    </div>

    <div class="res-acciones">
      <button class="btn-principal" id="ad-exportar">Copiar instantánea</button>
    </div>

    <div class="aj-bloque">
      <h2>Importar</h2>
      <p>Pega aquí una instantánea para restaurarla en este dispositivo.
      Sustituye los cambios locales, los precios y las preferencias.</p>
    </div>

    <div class="ga-json">
      <textarea id="ad-json" rows="5" placeholder='{"app":"lista-compra-luckstudio"…}'
                spellcheck="false"></textarea>
    </div>

    <div class="res-acciones">
      <button class="btn-secundario" id="ad-importar">Importar instantánea</button>
      <button class="btn-secundario" id="ad-volver">Volver</button>
    </div>`;
}
