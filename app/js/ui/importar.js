/* ============================================================
   VISTA IMPORTAR
   ------------------------------------------------------------
   Importar aquí FUSIONA, no sustituye. Es lo que hace falta
   para el flujo real: el móvil va acumulando compras, cada
   cierto tiempo se vuelca en el ordenador, y el ordenador
   guarda el histórico completo sin perder lo que ya tenía.
   ============================================================ */

import { validarCopia, fusionar, cuantoHay } from '../datos-io.js?v=25';
import { euros, $, tap } from '../util.js?v=25';

let raiz, previa = null;

export function reiniciarImportar() { previa = null; }

function aviso(t) {
  document.dispatchEvent(new CustomEvent('aviso', { detail: t }));
}

export function iniciarImportar(nodo) {
  raiz = nodo;

  raiz.addEventListener('click', e => {
    if (e.target.closest('#im-volver')) {
      previa = null;
      document.dispatchEvent(new CustomEvent('ir', { detail: 'ajustes' }));
      return;
    }
    if (e.target.closest('#im-archivo')) { $('#im-file', raiz)?.click(); return; }
    if (e.target.closest('#im-pegar')) { pegar(); return; }
    if (e.target.closest('#im-revisar')) { revisar(); return; }
    if (e.target.closest('#im-confirmar')) { confirmar(); return; }
    if (e.target.closest('#im-otra')) { previa = null; pintarImportar(); return; }
  });

  raiz.addEventListener('change', async e => {
    if (e.target.id !== 'im-file') return;
    const f = e.target.files?.[0];
    if (!f) return;
    const texto = await f.text();
    const campo = $('#im-json', raiz);
    if (campo) campo.value = texto;
    revisar();
  });
}

async function pegar() {
  try {
    const texto = await navigator.clipboard.readText();
    const campo = $('#im-json', raiz);
    if (campo) campo.value = texto;
    revisar();
  } catch {
    aviso('Pega el texto a mano en el recuadro');
  }
}

function revisar() {
  const v = validarCopia($('#im-json', raiz)?.value || '');
  if (!v.ok) { aviso(v.error); return; }
  previa = v;
  pintarImportar();
}

function confirmar() {
  if (!previa) return;
  const informe = fusionar(previa.copia);
  previa = null;

  const partes = [];
  if (informe.ticketsNuevos) partes.push(`${informe.ticketsNuevos} compras nuevas`);
  if (informe.ticketsActualizados) partes.push(`${informe.ticketsActualizados} actualizadas`);
  if (informe.precios) partes.push(`${informe.precios} precios`);
  if (informe.productos) partes.push(`${informe.productos} productos`);
  if (informe.tiendas) partes.push(`${informe.tiendas} tiendas`);

  aviso(partes.length ? partes.join(' · ') : 'No había nada nuevo que añadir');
  pintarImportar();
}

/* ---------- pintado ---------- */

export function pintarImportar() {
  if (!raiz) return;

  const ahora = cuantoHay();

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Importar</h1>
      <p>Se fusiona con lo que ya hay</p>
    </div>

    <div class="aj-bloque">
      <p>Lo que llegue se <b>añade</b> a lo que ya tienes. Si algo coincide
      (una compra con el mismo identificador, por ejemplo) se sobrescribe con
      la versión que llega. Lo que tenías y no venga en el archivo <b>no se
      toca</b>.</p>
      <p class="ga-nota">Sirve para volcar el móvil en el ordenador cada
      cierto tiempo y dejar el ordenador como archivo completo.</p>
    </div>

    <div class="aj-bloque">
      <h2>Ahora mismo tienes</h2>
      <div class="aj-dato"><span>Compras</span><span>${ahora.tickets}</span></div>
      <div class="aj-dato"><span>Gasto registrado</span><span>${euros(ahora.gasto)}</span></div>
      <div class="aj-dato"><span>Precios</span><span>${ahora.precios}</span></div>
      <div class="aj-dato"><span>Productos tuyos</span><span>${ahora.productos}</span></div>
      <div class="aj-dato"><span>Tiendas tuyas</span><span>${ahora.tiendas}</span></div>
    </div>

    ${previa ? bloquePrevia() : bloqueEntrada()}

    <div class="res-acciones">
      <button class="btn-secundario" id="im-volver">Volver a ajustes</button>
    </div>`;
}

function bloqueEntrada() {
  return `
    <div class="ga-acciones">
      <button class="btn-principal" id="im-archivo">Elegir archivo</button>
    </div>
    <input type="file" id="im-file" accept=".json,application/json" hidden>

    <div class="ga-json" style="margin-top:1.2rem">
      <textarea id="im-json" rows="5" spellcheck="false"
                placeholder="…o pega aquí el contenido de la copia"></textarea>
      <button class="btn-secundario" id="im-pegar">Pegar del portapapeles</button>
    </div>

    <div class="res-acciones">
      <button class="btn-secundario" id="im-revisar">Revisar lo que llega</button>
    </div>`;
}

function bloquePrevia() {
  const c = previa.copia;
  const r = c.resumen || {};
  const tickets = Array.isArray(c.tickets) ? c.tickets.length : 0;

  const fecha = d => d
    ? new Date(d).toLocaleDateString('es-ES',
        { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return `
    <div class="im-previa">
      <h2>Lo que trae este archivo</h2>
      <div class="aj-dato"><span>Exportado el</span><span>${fecha(c.exportado)}</span></div>
      <div class="aj-dato"><span>Compras</span><span>${tickets}</span></div>
      ${r.gastoTotal != null
        ? `<div class="aj-dato"><span>Gasto</span><span>${euros(r.gastoTotal)}</span></div>` : ''}
      ${r.primerTicket
        ? `<div class="aj-dato"><span>Periodo</span><span>${
            fecha(r.primerTicket)} — ${fecha(r.ultimoTicket)}</span></div>` : ''}
      <div class="aj-dato"><span>Precios</span><span>${
        Object.keys(c.preciosLocal || {}).length}</span></div>
      <div class="aj-dato"><span>Productos propios</span><span>${
        c.catalogoLocal?.nuevos?.length || 0}</span></div>
      <div class="aj-dato"><span>Tiendas propias</span><span>${
        c.tiendasLocal?.propias?.length || 0}</span></div>
      ${previa.tipo === 'snapshot'
        ? '<p class="ga-nota">Es una instantánea del catálogo, así que no trae compras.</p>'
        : ''}
    </div>

    <div class="res-acciones">
      <button class="btn-principal" id="im-confirmar">Fusionar con lo que tengo</button>
      <button class="btn-secundario" id="im-otra">Elegir otro archivo</button>
    </div>`;
}
