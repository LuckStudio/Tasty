/* ============================================================
   VISTA LISTAS
   ============================================================ */

import { listas, listaActiva, cambiarA, crearLista, renombrarLista,
         borrarLista, vaciarLista, copiarA, cuantosEn, EMOJIS }
  from '../listas.js?v=25';
import { $, tap } from '../util.js?v=25';

let raiz;
let editando = null;          // id, 'nueva' o null
let emojiElegido = EMOJIS[0];

export function reiniciarListas() { editando = null; }

function aviso(t) {
  document.dispatchEvent(new CustomEvent('aviso', { detail: t }));
}

export function iniciarVistaListas(nodo) {
  raiz = nodo;

  raiz.addEventListener('click', e => {
    const t = e.target;

    if (t.closest('#ls-volver')) {
      if (editando) { editando = null; pintarListas(); }
      else document.dispatchEvent(new CustomEvent('ir', { detail: 'grid' }));
      return;
    }

    if (t.closest('#ls-nueva')) {
      editando = 'nueva';
      emojiElegido = EMOJIS[listas().length % EMOJIS.length];
      pintarListas();
      return;
    }

    const usar = t.closest('[data-ls-usar]');
    if (usar) {
      tap();
      const id = usar.dataset.lsUsar;
      if (cambiarA(id)) {
        aviso(`Ahora estás en «${listas().find(l => l.id === id).nombre}»`);
      }
      document.dispatchEvent(new CustomEvent('ir', { detail: 'grid' }));
      return;
    }

    const edit = t.closest('[data-ls-editar]');
    if (edit) {
      tap();
      editando = edit.dataset.lsEditar;
      emojiElegido = listas().find(l => l.id === editando)?.emoji || EMOJIS[0];
      pintarListas();
      return;
    }

    const em = t.closest('[data-ls-emoji]');
    if (em) { tap(); emojiElegido = em.dataset.lsEmoji; pintarListas(); return; }

    const copia = t.closest('[data-ls-copiar]');
    if (copia) { copiarAqui(copia.dataset.lsCopiar); return; }

    if (t.closest('#ls-guardar')) { guardar(); return; }
    if (t.closest('#ls-vaciar')) { confirmarVaciado(); return; }
    if (t.closest('#ls-borrar')) { confirmarBorrado(); return; }
    if (t.closest('#ls-copiar-menu')) { menuCopiar(); return; }
  });
}

function guardar() {
  const nombre = $('#ls-nombre', raiz)?.value || '';

  if (editando === 'nueva') {
    const r = crearLista({ nombre, emoji: emojiElegido });
    if (!r.ok) { aviso(r.error); return; }
    cambiarA(r.lista.id);
    aviso(`«${r.lista.nombre}» creada y activa`);
  } else {
    const r = renombrarLista(editando, { nombre, emoji: emojiElegido });
    if (!r.ok) { aviso(r.error); return; }
    aviso('Guardado');
  }
  editando = null;
  pintarListas();
}

function confirmarVaciado() {
  const l = listas().find(x => x.id === editando);
  const n = cuantosEn(l);
  if (!n) { aviso('Ya estaba vacía'); return; }

  document.dispatchEvent(new CustomEvent('abrir-hoja', {
    detail: {
      titulo: `Vaciar «${l.nombre}»`,
      opciones: [
        { texto: 'Vaciar', nota: `Se quitan ${n} cosas`, peligro: true,
          accion: () => { vaciarLista(editando); aviso('Lista vaciada'); pintarListas(); } },
        { texto: 'Cancelar' }
      ]
    }
  }));
}

function confirmarBorrado() {
  const l = listas().find(x => x.id === editando);
  const n = cuantosEn(l);

  document.dispatchEvent(new CustomEvent('abrir-hoja', {
    detail: {
      titulo: `Borrar «${l.nombre}»`,
      opciones: [
        { texto: 'Borrar la lista',
          nota: n ? `Se pierden ${n} cosas que tiene dentro` : 'Está vacía',
          peligro: true,
          accion: () => {
            const r = borrarLista(editando);
            aviso(r.ok ? 'Lista borrada' : r.error);
            if (r.ok) editando = null;
            pintarListas();
          } },
        { texto: 'Cancelar' }
      ]
    }
  }));
}

function menuCopiar() {
  const otras = listas().filter(l => l.id !== listaActiva().id);
  if (!otras.length) { aviso('No hay otra lista adonde copiar'); return; }

  document.dispatchEvent(new CustomEvent('abrir-hoja', {
    detail: {
      titulo: 'Copiar todo a…',
      opciones: otras.map(l => ({
        texto: `${l.emoji} ${l.nombre}`,
        nota: `Tiene ${cuantosEn(l)} cosas ahora`,
        accion: () => copiarAqui(l.id)
      }))
    }
  }));
}

function copiarAqui(id) {
  const r = copiarA(id);
  aviso(r.ok ? `${r.anadidos} cosas copiadas a «${r.nombre}»` : r.error);
  pintarListas();
}

/* ---------- pintado ---------- */

export function pintarListas() {
  if (!raiz) return;
  if (editando) return pintarEditor();

  const activa = listaActiva();
  const todas = listas();

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Listas</h1>
      <p>${todas.length} ${todas.length === 1 ? 'lista' : 'listas'} · estás en ${activa.nombre}</p>
    </div>

    <div class="aj-bloque">
      <p>Cada lista es independiente: lo que pongas en una no aparece en
      las otras. Sirve para separar la compra de casa de la del piso de
      la playa, la de la oficina o la de una fiesta.</p>
    </div>

    <div class="ls-fichas">
      ${todas.map(l => {
        const n = cuantosEn(l);
        const esActiva = l.id === activa.id;
        return `
          <div class="ls-ficha" data-activa="${esActiva}">
            <button class="ls-usar" data-ls-usar="${l.id}">
              <i>${l.emoji}</i>
              <span>${l.nombre}
                <em>${n ? `${n} ${n === 1 ? 'cosa' : 'cosas'}` : 'Vacía'}${
                  esActiva ? ' · en uso' : ''}</em></span>
            </button>
            <button class="ls-ed" data-ls-editar="${l.id}"
                    aria-label="Editar ${l.nombre}">✎</button>
          </div>`;
      }).join('')}
    </div>

    <div class="ga-acciones">
      <button class="btn-principal" id="ls-nueva">Nueva lista</button>
    </div>
    ${todas.length > 1 ? `
      <div class="ga-acciones" style="margin-top:0.5px">
        <button class="btn-secundario" id="ls-copiar-menu">Copiar esta lista a otra</button>
      </div>` : ''}

    <div class="res-acciones">
      <button class="btn-secundario" id="ls-volver">Volver</button>
    </div>`;
}

function pintarEditor() {
  const esNueva = editando === 'nueva';
  const l = esNueva
    ? { nombre: '', emoji: emojiElegido }
    : listas().find(x => x.id === editando);
  if (!l) { editando = null; return pintarListas(); }

  const n = esNueva ? 0 : cuantosEn(l);
  const unica = listas().length <= 1;

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>${esNueva ? 'Nueva lista' : 'Editar lista'}</h1>
      <p>${esNueva ? 'Se activará al crearla'
                   : `${n} ${n === 1 ? 'cosa dentro' : 'cosas dentro'}`}</p>
    </div>

    <div class="aj-bloque">
      <p class="fi-label">Nombre</p>
      <input class="ga-fecha" id="ls-nombre" type="text"
             value="${(l.nombre || '').replace(/"/g, '&quot;')}"
             placeholder="Piso de la playa" autocomplete="off">

      <p class="fi-label" style="margin-top:1.2rem">Icono</p>
      <div class="ls-emojis">
        ${EMOJIS.map(e => `
          <button data-ls-emoji="${e}"
                  aria-pressed="${emojiElegido === e}"
                  aria-label="Icono ${e}">${e}</button>`).join('')}
      </div>
    </div>

    <div class="res-acciones">
      <button class="btn-principal" id="ls-guardar">Guardar</button>
      ${!esNueva ? `
        ${n ? '<button class="btn-secundario" id="ls-vaciar">Vaciar la lista</button>' : ''}
        ${unica
          ? '<p class="ga-nota" style="padding:0.4rem var(--pad-x)">Es la única lista que hay, así que no se puede borrar.</p>'
          : '<button class="btn-secundario aj-peligro" id="ls-borrar">Borrar la lista</button>'}` : ''}
      <button class="btn-secundario" id="ls-volver">Cancelar</button>
    </div>`;
}
