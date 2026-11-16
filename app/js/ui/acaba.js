/* ============================================================
   AVISO RÁPIDO «SE ESTÁ ACABANDO»  (pantalla 08)
   ------------------------------------------------------------
   Botón flotante siempre a mano (también al cocinar). Con uno o dos
   toques se marca lo que se acaba o se ha acabado y pasa AL MOMENTO
   a la lista de la compra, sin duplicar si ya estaba.
   ============================================================ */

import { PRODUCTOS, POR_ID } from '../estado.js?v=35';
import { stockDe, aLaLista } from '../despensa.js?v=35';
import { tocaHoy } from '../menu.js?v=35';
import { iconoHTML } from '../iconos.js?v=35';
import { normalizar, esc, tap } from '../util.js?v=35';

let fab = null, fondo = null;
let nivel = 'acaba', q = '', elegidos = new Set();

export function iniciarAcaba() {
  fab = document.createElement('button');
  fab.className = 'fab-acaba';
  fab.id = 'fab-acaba';
  fab.innerHTML = '<span aria-hidden="true">＋</span> Se acaba';
  fab.setAttribute('aria-label', 'Avisar de que algo se acaba');
  document.body.appendChild(fab);

  fondo = document.createElement('div');
  fondo.className = 'hoja-fondo';
  fondo.id = 'acaba-fondo';
  fondo.hidden = true;
  fondo.style.zIndex = 55;
  document.body.appendChild(fondo);

  fab.addEventListener('click', () => { tap(); abrir(); });
  fondo.addEventListener('click', e => {
    const t = e.target;
    if (t === fondo || t.closest('#ac-cerrar')) { cerrar(); return; }
    const nv = t.closest('[data-ac-nivel]');
    if (nv) { tap(); nivel = nv.dataset.acNivel; pintar(); return; }
    const p = t.closest('[data-ac-prod]');
    if (p) {
      tap();
      const id = +p.dataset.acProd;
      elegidos.has(id) ? elegidos.delete(id) : elegidos.add(id);
      pintar(); return;
    }
    if (t.closest('#ac-anadir') && elegidos.size) {
      const r = aLaLista([...elegidos], nivel);
      cerrar();
      document.dispatchEvent(new CustomEvent('aviso', { detail: r.anadidos
        ? `${r.anadidos} ${r.anadidos === 1 ? 'producto añadido' : 'productos añadidos'} a la lista${r.yaEstaban ? ` · ${r.yaEstaban} ya estaba${r.yaEstaban === 1 ? '' : 'n'}` : ''}`
        : 'Ya estaba en la lista' }));
    }
  });
  fondo.addEventListener('input', e => {
    if (e.target.id !== 'ac-buscar') return;
    q = e.target.value;
    const c = fondo.querySelector('#ac-grid');
    if (c) c.innerHTML = grid();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !fondo.hidden) cerrar(); });
}

/* El botón se esconde donde estorba: comprando, eligiendo tienda… */
export function mostrarAcaba(visible) {
  if (fab) fab.hidden = !visible;
  /* Reserva sitio al final de las pantallas para que no tape sus botones */
  document.body.classList.toggle('con-fab', !!visible);
}

function abrir() { nivel = 'acaba'; q = ''; elegidos = new Set(); delete fondo.dataset.v; pintar(); fondo.hidden = false; }
function cerrar() { fondo.hidden = true; }

/* Primero lo del bloque de cocina de esta tarde y lo habitual */
function sugeridos() {
  const ids = [];
  try { for (const f of tocaHoy().consolidado) if (f.id && POR_ID[f.id] && !ids.includes(f.id)) ids.push(f.id); } catch { /* sin plan */ }
  for (const p of PRODUCTOS) if (p.f === 3 && !ids.includes(p.id)) ids.push(p.id);
  return ids.slice(0, 18);
}

function grid() {
  const texto = normalizar(q.trim());
  const lista = texto
    ? PRODUCTOS.filter(p => normalizar(p.n).includes(texto)).slice(0, 18).map(p => p.id)
    : sugeridos();
  if (!lista.length) return '<p class="ga-nota" style="grid-column:1/-1;padding:1rem 0">No hay ningún producto con ese nombre.</p>';
  return lista.map(id => {
    const p = POR_ID[id], e = stockDe(id)?.estado;
    return `<button class="ac-prod" data-ac-prod="${id}" aria-pressed="${elegidos.has(id)}">
      <span class="ac-ico">${iconoHTML(p)}</span><b>${esc(p.n)}</b>
      ${e === 'acaba' ? '<small class="ac-e acaba">SE ACABA</small>' : e === 'agotado' ? '<small class="ac-e agotado">AGOTADO</small>' : ''}</button>`;
  }).join('');
}

function pintar() {
  const hayQ = q.trim();
  fondo.innerHTML = `
    <div class="hoja ac-hoja" role="dialog" aria-modal="true" aria-label="¿Qué se está acabando?" ${fondo.dataset.v ? 'style="animation:none"' : ''}>
      <div class="ac-cab"><h2>¿Qué se está acabando?</h2><button class="rv-atras" id="ac-cerrar" aria-label="Cerrar">×</button></div>
      <div class="ct-modos" role="group">
        <button data-ac-nivel="acaba" aria-pressed="${nivel === 'acaba'}">Se está acabando</button>
        <button data-ac-nivel="agotado" aria-pressed="${nivel === 'agotado'}">Se ha acabado</button></div>
      <div class="pr-buscar" style="padding:0.8rem 0 0"><input id="ac-buscar" type="search" value="${esc(q)}" placeholder="Busca cualquier producto" autocomplete="off" aria-label="Buscar producto"></div>
      <p class="rv-meta ac-sub">${hayQ ? 'RESULTADOS' : 'EN ESTE BLOQUE Y HABITUALES'}</p>
      <div class="ac-grid" id="ac-grid">${grid()}</div>
      <button class="btn-principal" id="ac-anadir" ${elegidos.size ? '' : 'disabled'}>${elegidos.size
        ? `Añadir ${elegidos.size} a la lista de la compra` : 'Elige lo que se acaba'}</button>
    </div>`;
  fondo.dataset.v = '1';
}
