/* ============================================================
   VISTA DIETA
   Comidas del día, recetas activas e inactivas, y qué falta
   ============================================================ */

import { COMIDAS, PLANES, COMIDA_POR_ID, PLAN_POR_ID, recetas,
         recetaPorId, crearReceta, editarReceta, borrarReceta,
         alternarActiva, anadirIngrediente, quitarIngrediente,
         cambiarIngrediente, nombreIngrediente, cuentaPorComida,
         faltaPorAnadir, recetasCubiertas, productosDe, textosDe,
         buscarParaReceta, resumenDieta, exportarRecetas, recetasTexto,
         validarRecetas, importarRecetas } from '../recetas.js?v=27';
import { POR_ID, cantidad, alternar, sumar, anadirLibre } from '../estado.js?v=27';
import { iconoHTML } from '../iconos.js?v=27';
import { DIETA } from '../../datos/recetas-dieta.js?v=27';
import { $, tap } from '../util.js?v=27';

let raiz;
let pantalla = 'inicio';       // inicio | receta | falta
let abierta = null;            // id de la receta que se edita
let comidaAbierta = 'comida';
let sugeridos = [];

export function reiniciarDieta() {
  pantalla = 'inicio'; abierta = null; sugeridos = [];
}

function aviso(t) {
  document.dispatchEvent(new CustomEvent('aviso', { detail: t }));
}

/* ---------- arranque ---------- */

export function iniciarDieta(nodo) {
  raiz = nodo;

  raiz.addEventListener('click', e => {
    const t = e.target;

    if (t.closest('#di-volver')) {
      if (pantalla !== 'inicio') { pantalla = 'inicio'; abierta = null; pintarDieta(); }
      else document.dispatchEvent(new CustomEvent('ir', { detail: 'grid' }));
      return;
    }

    const comida = t.closest('[data-di-comida]');
    if (comida) {
      tap();
      const id = comida.dataset.diComida;
      comidaAbierta = comidaAbierta === id ? null : id;
      pintarDieta();
      return;
    }

    const nueva = t.closest('[data-di-nueva]');
    if (nueva) { crearAqui(nueva.dataset.diNueva); return; }

    /* Tocar una receta abre el acceso rápido, no el editor:
       nueve de cada diez veces lo que quieres es meter sus cosas
       en la lista, no cambiarle el nombre */
    const ver = t.closest('[data-di-receta]');
    if (ver) { tap(); abrirRapido(ver.dataset.diReceta); return; }

    const editar = t.closest('[data-di-editar]');
    if (editar) {
      e.stopPropagation(); tap();
      abierta = editar.dataset.diEditar; pantalla = 'receta'; pintarDieta();
      return;
    }

    const act = t.closest('[data-di-activa]');
    if (act) { e.stopPropagation(); tap(); alternarActiva(act.dataset.diActiva); pintarDieta(); return; }

    if (t.closest('#di-falta')) { pantalla = 'falta'; pintarDieta(); return; }
    if (t.closest('#di-cargar-plan')) { cargarPlan(); return; }
    if (t.closest('#di-exportar')) { menuExportar(); return; }
    if (t.closest('#di-importar')) { pantalla = 'importar'; pintarDieta(); return; }
    if (t.closest('#di-pegar')) { pegar(); return; }
    if (t.closest('#di-confirmar-import')) { hacerImport(false); return; }
    if (t.closest('#di-sustituir')) { hacerImport(true); return; }
    if (t.closest('#di-anadir-todo')) { volcarALista(); return; }

    /* --- dentro de una receta --- */
    const plan = t.closest('[data-di-plan]');
    if (plan) { tap(); editarReceta(abierta, { plan: plan.dataset.diPlan }); pintarDieta(); return; }

    const cambiaComida = t.closest('[data-di-mover]');
    if (cambiaComida) { tap(); editarReceta(abierta, { comida: cambiaComida.dataset.diMover }); pintarDieta(); return; }

    if (t.closest('#di-guardar')) { guardarReceta(); return; }
    if (t.closest('#di-borrar')) { confirmarBorrado(); return; }
    if (t.closest('#di-activa-toggle')) { alternarActiva(abierta); pintarDieta(); return; }

    const sug = t.closest('[data-di-sug]');
    if (sug) { meterIngrediente(+sug.dataset.diSug); return; }
    if (t.closest('#di-ing-libre')) { meterIngrediente(null); return; }

    const quita = t.closest('[data-di-quitar-ing]');
    if (quita) { tap(); quitarIngrediente(abierta, +quita.dataset.diQuitarIng); pintarDieta(); return; }

    const irFicha = t.closest('[data-di-ficha]');
    if (irFicha) {
      tap();
      document.dispatchEvent(new CustomEvent('abrir-ficha',
        { detail: +irFicha.dataset.diFicha }));
    }
  });

  raiz.addEventListener('input', e => {
    if (e.target.id === 'di-buscar') {
      sugeridos = buscarParaReceta(e.target.value);
      pintarSugerencias(e.target.value);
    }
  });

  raiz.addEventListener('change', e => {
    const cant = e.target.closest('[data-di-cant]');
    if (cant) {
      cambiarIngrediente(abierta, +cant.dataset.diCant, { cant: cant.value });
      return;
    }
    const un = e.target.closest('[data-di-unidad]');
    if (un) cambiarIngrediente(abierta, +un.dataset.diUnidad, { unidad: un.value });
  });

  raiz.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'di-buscar') {
      e.preventDefault();
      sugeridos.length ? meterIngrediente(sugeridos[0].id) : meterIngrediente(null);
    }
  });
}

/* ---------- acciones ---------- */

function crearAqui(comida) {
  const r = crearReceta({ nombre: 'Receta sin nombre', comida, plan: 'varias' });
  if (!r.ok) { aviso(r.error); return; }
  abierta = r.receta.id;
  pantalla = 'receta';
  pintarDieta();
  setTimeout(() => $('#di-nombre', raiz)?.select(), 60);
}

function guardarReceta() {
  const nombre = $('#di-nombre', raiz)?.value || '';
  const notas = $('#di-notas', raiz)?.value || '';
  const r = editarReceta(abierta, { nombre, notas });
  if (!r.ok) { aviso(r.error); return; }
  aviso('Receta guardada');
  pantalla = 'inicio';
  abierta = null;
  pintarDieta();
}

function meterIngrediente(id) {
  const campo = $('#di-buscar', raiz);
  const texto = campo ? campo.value.trim() : '';
  const r = anadirIngrediente(abierta, { id, texto });
  if (!r.ok) { aviso(r.error); return; }
  sugeridos = [];
  pintarDieta();
  $('#di-buscar', raiz)?.focus();
}

function confirmarBorrado() {
  const r = recetaPorId(abierta);
  document.dispatchEvent(new CustomEvent('abrir-hoja', {
    detail: {
      titulo: `Borrar «${r.nombre}»`,
      opciones: [
        { texto: 'Borrar', nota: `${r.ingredientes.length} ingredientes`,
          peligro: true,
          accion: () => {
            borrarReceta(abierta);
            abierta = null; pantalla = 'inicio';
            aviso('Receta borrada'); pintarDieta();
          } },
        { texto: 'Cancelar' }
      ]
    }
  }));
}

/* Mete en la lista todo lo que hace falta y aún no está */
function volcarALista() {
  const ids = productosDe().filter(id => !cantidad(id));
  const textos = textosDe();
  let n = 0;

  for (const id of ids) { alternar(id); n++; }
  for (const t of textos) { if (anadirLibre(t)) n++; }

  aviso(n ? `${n} ${n === 1 ? 'cosa añadida' : 'cosas añadidas'} a la lista`
          : 'Ya estaba todo en la lista');
  pintarDieta();
}

/* ------------------------------------------------------------
   ACCESO RÁPIDO A UNA RECETA

   Se abre al tocarla desde la lista. Enseña sus ingredientes con
   el estado de cada uno y deja marcarlos uno a uno o de golpe.

   Cada línea dice si ya está en la lista, así que se ve de un
   vistazo qué falta para poder cocinarla.
   ------------------------------------------------------------ */
function abrirRapido(id) {
  const r = recetaPorId(id);
  if (!r) return;

  const opciones = [];

  const delCatalogo = r.ingredientes.filter(i => i.id && POR_ID[i.id]);
  const sueltos = r.ingredientes.filter(i => !i.id || !POR_ID[i.id]);
  const faltan = delCatalogo.filter(i => !cantidad(i.id));

  if (faltan.length) {
    opciones.push({
      texto: `Añadir lo que falta · ${faltan.length}`,
      nota: faltan.map(i => POR_ID[i.id].n).join(', '),
      accion: () => {
        for (const i of faltan) alternar(i.id);
        aviso(`${faltan.length} ${faltan.length === 1
          ? 'producto añadido' : 'productos añadidos'}`);
        setTimeout(() => abrirRapido(id), 250);
      }
    });
  }

  /* Cada ingrediente por separado, con su estado */
  for (const ing of delCatalogo) {
    const c = cantidad(ing.id);
    const p = POR_ID[ing.id];
    opciones.push({
      texto: `${c ? '✓ ' : '＋ '}${p.n}`,
      nota: c
        ? `Ya en la lista${c > 1 ? ` · ×${c}` : ''} · tocar para quitarlo`
        : `${ing.cant}${ing.unidad} · tocar para añadirlo`,
      accion: () => {
        c ? sumar(ing.id, -99) : alternar(ing.id);
        setTimeout(() => abrirRapido(id), 250);
      }
    });
  }

  for (const ing of sueltos) {
    opciones.push({
      texto: ing.texto || 'Sin nombre',
      nota: 'Escrito a mano, no se puede marcar'
    });
  }

  if (!r.ingredientes.length) {
    opciones.push({ texto: 'Todavía sin ingredientes',
                    nota: 'Ábrela para añadírselos' });
  }

  opciones.push({
    texto: r.activa ? 'Desactivar receta' : 'Activar receta',
    nota: r.activa
      ? 'Dejará de contar para la compra'
      : 'Volverá a contar para la compra',
    accion: () => { alternarActiva(id); pintarDieta(); }
  });

  opciones.push({
    texto: 'Editar la receta',
    nota: 'Nombre, ingredientes, cantidades y notas',
    accion: () => { abierta = id; pantalla = 'receta'; pintarDieta(); }
  });

  const hechos = delCatalogo.length - faltan.length;

  document.dispatchEvent(new CustomEvent('abrir-hoja', {
    detail: {
      titulo: delCatalogo.length
        ? `${r.nombre} · ${hechos} de ${delCatalogo.length} en la lista`
        : r.nombre,
      opciones
    }
  }));
}

/* ------------------------------------------------------------
   CARGAR EL PLAN QUE VIENE DE SERIE

   Se fusiona igual que cualquier recetario importado: lo que
   coincida en nombre y comida se actualiza, lo demás se añade.
   Así se puede volver a cargar sin miedo a duplicar nada.
   ------------------------------------------------------------ */
function cargarPlan() {
  const yaHay = resumenDieta().total;

  const hacerlo = () => {
    const r = importarRecetas(DIETA);
    const partes = [];
    if (r.nuevas) partes.push(`${r.nuevas} recetas nuevas`);
    if (r.actualizadas) partes.push(`${r.actualizadas} actualizadas`);
    if (r.sinEnlazar.length) partes.push(`${r.sinEnlazar.length} sin catalogar`);
    aviso(partes.join(' · ') || 'Ya estaba todo cargado');
    pintarDieta();
  };

  if (!yaHay) { hacerlo(); return; }

  document.dispatchEvent(new CustomEvent('abrir-hoja', {
    detail: {
      titulo: 'Cargar la dieta estricta',
      opciones: [
        { texto: 'Fusionar con lo que tengo',
          nota: `Tienes ${yaHay} recetas. Las que coincidan se actualizan, ` +
                'el resto se queda',
          accion: hacerlo },
        { texto: 'Cancelar' }
      ]
    }
  }));
}

/* ---------- exportar e importar ---------- */

function menuExportar() {
  const d = exportarRecetas();
  const json = JSON.stringify(d, null, 2);

  document.dispatchEvent(new CustomEvent('abrir-hoja', {
    detail: {
      titulo: `Exportar ${d.resumen.total} recetas`,
      opciones: [
        { texto: 'Descargar archivo',
          nota: 'Un .json con todo: ingredientes, cantidades y notas',
          accion: () => {
            document.dispatchEvent(new CustomEvent('descargar-archivo', {
              detail: { nombre: 'recetas.json', contenido: json }
            }));
          } },
        { texto: 'Copiar al portapapeles',
          nota: 'Para pegarlo en otro dispositivo',
          accion: () => document.dispatchEvent(new CustomEvent('copiar', {
            detail: { texto: json, mensaje: 'Recetas copiadas' } })) },
        { texto: 'Copiar como texto legible',
          nota: 'Para leerlo o mandarlo por mensaje',
          accion: () => document.dispatchEvent(new CustomEvent('copiar', {
            detail: { texto: recetasTexto(), mensaje: 'Texto copiado' } })) },
        { texto: 'Importar recetas',
          nota: 'Traer un recetario de otro sitio',
          accion: () => { pantalla = 'importar'; pintarDieta(); } }
      ]
    }
  }));
}

async function pegar() {
  try {
    const texto = await navigator.clipboard.readText();
    const campo = $('#di-json', raiz);
    if (campo) campo.value = texto;
  } catch {
    aviso('Pega el texto a mano en el recuadro');
  }
}

function hacerImport(sustituir) {
  const v = validarRecetas($('#di-json', raiz)?.value || '');
  if (!v.ok) { aviso(v.error); return; }

  const r = importarRecetas(v.datos, { sustituir });

  const partes = [];
  if (r.nuevas) partes.push(`${r.nuevas} nuevas`);
  if (r.actualizadas) partes.push(`${r.actualizadas} actualizadas`);
  if (r.sinEnlazar.length) partes.push(`${r.sinEnlazar.length} sin catalogar`);

  aviso(partes.join(' · ') || 'No había nada que importar');
  pantalla = 'inicio';
  pintarDieta();
}

/* ---------- pintado ---------- */

export function pintarDieta() {
  if (!raiz) return;
  if (pantalla === 'receta') return pintarReceta();
  if (pantalla === 'falta') return pintarFalta();
  if (pantalla === 'importar') return pintarImportarRecetas();
  pintarInicio();
}

function pintarInicio() {
  const res = resumenDieta();

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Dieta</h1>
      <p>${res.total
        ? `${res.activas} de ${res.total} recetas activas`
        : 'Sin recetas todavía'}</p>
    </div>

    ${res.total ? `
      <div class="st-cifras">
        <div class="st-cifra"><b>${res.activas}</b><span>Activas</span></div>
        <div class="st-cifra"><b>${res.ingredientes}</b><span>Ingredientes</span></div>
      </div>

      ${res.faltan ? `
        <div class="ga-aviso">
          <b>Faltan ${res.faltan} ${res.faltan === 1 ? 'cosa' : 'cosas'} por comprar</b>
          <p>De lo que llevan tus recetas activas, eso no está en la lista.</p>
        </div>
        <div class="ga-acciones">
          <button class="btn-principal" id="di-falta">Ver qué falta</button>
        </div>`
      : `<div class="aj-bloque"><p>Todo lo de tus recetas activas está ya en
         la lista de la compra.</p></div>`}
    ` : `
      <div class="aj-bloque">
        <p>Aquí van las recetas de cada comida del día, con sus ingredientes
        enlazados al catálogo. Así la app puede decirte qué te falta para
        cocinar lo que tienes planeado.</p>
        <p class="ga-nota">Las recetas se marcan como <b>activas</b> cuando
        son de las que rotas ahora. Las inactivas no desaparecen: siguen
        aquí para consultarlas, pero no cuentan para la compra.</p>
      </div>
      <div class="ga-aviso">
        <b>La dieta estricta viene incluida</b>
        <p>20 recetas repartidas en las cinco comidas, con sus cantidades,
        sus notas y la suplementación. Cárgala de un botón y ajústala a tu
        gusto desde ahí.</p>
      </div>`}

    ${COMIDAS.map(c => bloqueComida(c)).join('')}

    <div class="ga-acciones" style="margin-top:1.4rem">
      <button class="btn-principal" id="di-cargar-plan">${
        res.total ? 'Recargar la dieta estricta' : 'Cargar la dieta estricta'}</button>
    </div>
    <div class="ga-acciones" style="margin-top:0.5px">
      <button class="btn-secundario" id="di-exportar">Exportar recetas</button>
      <button class="btn-secundario" id="di-importar">Importar</button>
    </div>

    <div class="res-acciones">
      <button class="btn-secundario" id="di-volver">Volver a la lista</button>
    </div>`;
}

function bloqueComida(c) {
  const cuenta = cuentaPorComida(c.id);
  const abiertaEsta = comidaAbierta === c.id;
  const lista = recetas({ comida: c.id });

  return `
    <section class="seccion" data-abierta="${abiertaEsta}">
      <button class="seccion-cab" data-di-comida="${c.id}"
              aria-expanded="${abiertaEsta}">
        <h2>${c.nombre}</h2>
        <span class="seccion-cuenta">${cuenta.activas
          ? `${cuenta.activas} activas` : cuenta.total ? `${cuenta.total} guardadas` : '—'}</span>
        <span class="seccion-flecha" aria-hidden="true"></span>
      </button>

      ${abiertaEsta ? `
        <div class="di-recetas">
          ${PLANES.map(pl => {
            const suyas = lista.filter(r => r.plan === pl.id);
            if (!suyas.length) return '';
            return `
              <p class="di-plan">${pl.nombre}</p>
              ${suyas.map(r => filaReceta(r)).join('')}`;
          }).join('')}
          ${!lista.length
            ? '<p class="ga-nota" style="padding:0.8rem var(--pad-x)">Sin recetas para esta comida.</p>'
            : ''}
          <button class="di-nueva" data-di-nueva="${c.id}">+ Añadir receta a ${c.nombre.toLowerCase()}</button>
        </div>` : ''}
    </section>`;
}

function filaReceta(r) {
  const delCatalogo = r.ingredientes.filter(i => i.id && POR_ID[i.id]);
  const enLista = delCatalogo.filter(i => cantidad(i.id)).length;
  const completa = delCatalogo.length && enLista === delCatalogo.length;

  return `
    <div class="di-fila" data-activa="${r.activa}" data-lista="${completa}">
      <button class="di-check" data-di-activa="${r.id}"
              role="checkbox" aria-checked="${r.activa}"
              aria-label="${r.activa ? 'Desactivar' : 'Activar'} ${r.nombre}">
        ${r.activa ? '●' : '○'}
      </button>
      <button class="di-n" data-di-receta="${r.id}">
        ${r.nombre}
        <em>${delCatalogo.length
          ? `${enLista} de ${delCatalogo.length} en la lista`
          : r.ingredientes.length ? `${r.ingredientes.length} ingredientes`
          : 'Sin ingredientes'}${r.activa ? '' : ' · inactiva'}</em>
      </button>
      ${delCatalogo.length ? `
        <span class="di-progreso" aria-hidden="true">
          <i style="width:${Math.round(enLista / delCatalogo.length * 100)}%"></i>
        </span>` : ''}
      <button class="di-ed" data-di-editar="${r.id}"
              aria-label="Editar ${r.nombre}">✎</button>
    </div>`;
}

/* ---------- editor de receta ---------- */

function pintarReceta() {
  const r = recetaPorId(abierta);
  if (!r) { pantalla = 'inicio'; return pintarInicio(); }

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>${r.nombre}</h1>
      <p>${COMIDA_POR_ID[r.comida]?.nombre} · ${PLAN_POR_ID[r.plan]?.nombre}
         · ${r.activa ? 'activa' : 'inactiva'}</p>
    </div>

    <div class="aj-bloque">
      <p class="fi-label">Nombre</p>
      <input class="ga-fecha" id="di-nombre" type="text"
             value="${r.nombre.replace(/"/g, '&quot;')}" autocomplete="off">

      <p class="fi-label" style="margin-top:1.2rem">Comida del día</p>
      <div class="cmp-tiendas">
        ${COMIDAS.map(c => `
          <button data-di-mover="${c.id}"
                  aria-pressed="${r.comida === c.id}">${c.nombre}</button>`).join('')}
      </div>

      <p class="fi-label" style="margin-top:1.2rem">Plan</p>
      <div class="cmp-pago">
        ${PLANES.map(p => `
          <button data-di-plan="${p.id}"
                  aria-pressed="${r.plan === p.id}">${p.nombre}</button>`).join('')}
      </div>

      <div class="di-activa">
        <span>${r.activa
          ? 'Activa: cuenta para la compra'
          : 'Inactiva: se guarda pero no cuenta'}</span>
        <button id="di-activa-toggle">${r.activa ? 'Desactivar' : 'Activar'}</button>
      </div>
    </div>

    <div class="aj-bloque">
      <h2>Ingredientes · ${r.ingredientes.length}</h2>
      ${r.ingredientes.length ? r.ingredientes.map((ing, i) => `
        <div class="di-ing">
          <span class="res-icono">${ing.id && POR_ID[ing.id]
            ? iconoHTML(POR_ID[ing.id]) : '<span aria-hidden="true">✏️</span>'}</span>
          <span class="di-ing-n">${nombreIngrediente(ing)}
            ${ing.id ? '' : '<em>Solo texto, no cuenta para la compra</em>'}</span>
          <label class="ga-mini">
            <span class="sr">Cantidad</span>
            <input type="text" inputmode="decimal" data-di-cant="${i}"
                   value="${String(ing.cant).replace('.', ',')}">
          </label>
          <label class="pp-unidad">
            <span class="sr">Unidad</span>
            <select data-di-unidad="${i}">
              ${['ud', 'g', 'kg', 'ml', 'l', 'cda', 'cdta'].map(u => `
                <option value="${u}" ${ing.unidad === u ? 'selected' : ''}>${u}</option>`).join('')}
            </select>
          </label>
          ${ing.id ? `<button class="di-ir" data-di-ficha="${ing.id}"
                             aria-label="Ver ficha">›</button>` : ''}
          <button class="ga-borrar" data-di-quitar-ing="${i}"
                  aria-label="Quitar ${nombreIngrediente(ing)}">×</button>
        </div>`).join('')
      : '<p class="ga-nota" style="padding-top:0">Todavía sin ingredientes.</p>'}
    </div>

    <div class="ga-buscador">
      <input id="di-buscar" type="text" placeholder="Buscar o escribir un ingrediente"
             autocomplete="off" enterkeyhint="done">
      <div id="di-sugerencias"></div>
    </div>

    <div class="aj-bloque">
      <p class="fi-label">Notas</p>
      <textarea class="di-notas" id="di-notas" rows="3"
                placeholder="Cómo se hace, tiempos, trucos…">${r.notas || ''}</textarea>
    </div>

    <div class="res-acciones">
      <button class="btn-principal" id="di-guardar">Guardar</button>
      <button class="btn-secundario aj-peligro" id="di-borrar">Borrar receta</button>
      <button class="btn-secundario" id="di-volver">Volver</button>
    </div>`;
}

function pintarSugerencias(texto) {
  const nodo = $('#di-sugerencias', raiz);
  if (!nodo) return;
  if (!texto.trim()) { nodo.innerHTML = ''; return; }

  nodo.innerHTML = `
    ${sugeridos.map(p => `
      <button class="ga-sug" data-di-sug="${p.id}">
        <span class="res-icono">${iconoHTML(p)}</span>${p.n}
      </button>`).join('')}
    <button class="ga-sug ga-sug-libre" id="di-ing-libre">
      <span class="res-icono" aria-hidden="true">＋</span>
      Añadir “${texto.trim()}” como texto suelto
    </button>`;
}

function pintarImportarRecetas() {
  const res = resumenDieta();

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Importar recetas</h1>
      <p>Ahora tienes ${res.total}</p>
    </div>

    <div class="aj-bloque">
      <p>Pega aquí un recetario exportado, o el contenido de un archivo
      <code>.json</code> de recetas.</p>
      <p class="ga-nota">Cada ingrediente se vuelve a enlazar con el
      catálogo: primero por su identificador y, si no cuadra, buscando su
      nombre. Lo que no encuentre se queda como texto suelto y se te
      dice cuántos han sido.</p>
    </div>

    <div class="ga-json">
      <textarea id="di-json" rows="6" spellcheck="false"
                placeholder='{"formato":"lista-compra-recetas"…}'></textarea>
      <button class="btn-secundario" id="di-pegar">Pegar del portapapeles</button>
    </div>

    <div class="res-acciones">
      <button class="btn-principal" id="di-confirmar-import">Añadir a lo que tengo</button>
      <button class="btn-secundario aj-peligro" id="di-sustituir">Sustituir todas mis recetas</button>
      <button class="btn-secundario" id="di-volver">Cancelar</button>
    </div>`;
}

/* ---------- qué falta ---------- */

function pintarFalta() {
  const faltan = faltaPorAnadir();
  const cubiertas = recetasCubiertas();

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Qué falta</h1>
      <p>Para tus recetas activas</p>
    </div>

    ${faltan.length ? `
      <div class="aj-bloque">
        <h2>No está en la lista · ${faltan.length}</h2>
        ${faltan.map(ing => `
          <div class="di-ing">
            <span class="res-icono">${ing.id && POR_ID[ing.id]
              ? iconoHTML(POR_ID[ing.id]) : '<span aria-hidden="true">✏️</span>'}</span>
            <span class="di-ing-n">${ing.id ? POR_ID[ing.id]?.n : ing.texto}
              <em>${ing.cant}${ing.unidad} · ${ing.recetas.length === 1
                ? ing.recetas[0]
                : `en ${ing.recetas.length} recetas`}${ing.mezcla ? ' · unidades mezcladas' : ''}</em></span>
          </div>`).join('')}
      </div>
      <div class="ga-acciones">
        <button class="btn-principal" id="di-anadir-todo">Añadirlo todo a la lista</button>
      </div>`
    : `<div class="aj-bloque"><p>No falta nada: todo lo de tus recetas
       activas ya está en la lista.</p></div>`}

    ${cubiertas.length ? `
      <div class="aj-bloque">
        <h2>Qué podrías cocinar</h2>
        <p class="ga-nota" style="padding-top:0;padding-bottom:0.8rem">
        Según lo que hay en la lista. La app no sabe qué tienes en la
        despensa, así que esto mira solo lo que vas a comprar.</p>
        ${cubiertas.map(c => `
          <div class="di-cubierta">
            <div class="st-fila-cab">
              <span>${c.receta.nombre}<em>${c.tengo} de ${c.total}</em></span>
              <b>${c.pct}%</b>
            </div>
            <div class="st-barra"><i style="width:${Math.max(c.pct, 1)}%"></i></div>
            ${c.faltan.length ? `<p class="di-faltan">Falta: ${c.faltan.join(', ')}</p>` : ''}
          </div>`).join('')}
      </div>` : ''}

    <div class="res-acciones">
      <button class="btn-secundario" id="di-volver">Volver</button>
    </div>`;
}
