/* ============================================================
   UI DEL ESCÁNER Y DE LOS AJUSTES DE GEMINI
   ============================================================ */

import { hayClave, guardarClave, borrarClave, claveEnmascarada,
         modeloManual, fijarModeloManual, ultimoModeloUsado,
         modelosEnCache, modelosDisponibles, probar }
  from '../gemini.js?v=23';
import { esc, tap, $ } from '../util.js?v=23';

/* ---------- ajustes ---------- */

let estadoPrueba = null;      // { tipo: 'ok'|'error'|'cargando', texto }
let editandoClave = false;

export function ajustesGeminiHTML() {
  const tiene = hayClave();
  const cache = modelosEnCache();
  const manual = modeloManual();
  const usado = ultimoModeloUsado();

  return `
    <h2>Escáner de tickets · Gemini</h2>
    <p>Hace una foto al ticket y Tasty lee los productos y los precios. La
    clave se guarda <b>solo en este dispositivo</b>: no va al repositorio ni a
    las copias que exportas. Consíguela gratis en
    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>.</p>

    ${tiene && !editandoClave ? `
      <div class="aj-dato"><span>Clave</span><span>${esc(claveEnmascarada())}</span></div>
      <div class="aj-dato"><span>Modelo en uso</span>
        <span>${usado ? esc(usado) : 'se elige solo al escanear'}</span></div>
      <div class="aj-dato"><span>Selección</span>
        <span>${manual ? 'manual' : 'automática · más reciente'}</span></div>

      <label class="fi-label" style="display:block;margin-top:1.2rem" for="aj-gem-modelo">Forzar un modelo</label>
      <select id="aj-gem-modelo" class="ga-fecha">
        <option value="">Automático (recomendado)</option>
        ${[...new Set([...(manual ? [manual] : []), ...cache])].map(m =>
          `<option value="${esc(m)}" ${m === manual ? 'selected' : ''}>${esc(m)}</option>`).join('')}
      </select>
      <p class="ga-nota">${cache.length
        ? `${cache.length} modelos compatibles. La lista se renueva sola cada 24 h.`
        : 'Pulsa «Probar» para cargar la lista de modelos.'}</p>

      ${estadoPrueba ? `<p class="ga-nota" role="status" style="color:${
        estadoPrueba.tipo === 'error' ? 'var(--accent)' : 'inherit'}">${esc(estadoPrueba.texto)}</p>` : ''}

      <button class="btn-secundario" id="aj-gem-probar" style="margin-top:0.8rem">Probar la conexión</button>
      <button class="btn-secundario" id="aj-gem-cambiar" style="margin-top:0.5px">Cambiar clave</button>
      <button class="btn-secundario aj-peligro" id="aj-gem-borrar" style="margin-top:0.5px">Quitar clave</button>
    ` : `
      <label class="fi-label" style="display:block;margin-top:1rem" for="aj-gem-clave">Clave de Gemini</label>
      <input id="aj-gem-clave" class="ga-fecha" type="password" autocomplete="off"
             autocapitalize="off" spellcheck="false" placeholder="Pega aquí la clave">
      ${estadoPrueba?.tipo === 'error' ? `<p class="ga-nota" style="color:var(--accent)">${esc(estadoPrueba.texto)}</p>` : ''}
      <button class="btn-principal" id="aj-gem-guardar" style="margin-top:0.8rem">Guardar clave</button>
      ${tiene ? '<button class="btn-secundario" id="aj-gem-cancelar" style="margin-top:0.5px">Cancelar</button>' : ''}
    `}`;
}

export function pintarBloqueGemini() {
  const n = $('#aj-gemini');
  if (n) n.innerHTML = ajustesGeminiHTML();
}

export function iniciarAjustesGemini() {
  const raiz = $('#v-ajustes');

  raiz.addEventListener('click', async e => {
    const t = e.target;
    if (!t.closest('#aj-gemini')) return;

    if (t.closest('#aj-gem-guardar')) {
      const r = guardarClave($('#aj-gem-clave').value);
      estadoPrueba = r.ok ? null : { tipo: 'error', texto: r.error };
      if (r.ok) editandoClave = false;
      tap(); pintarBloqueGemini();
      return;
    }
    if (t.closest('#aj-gem-cambiar'))  { editandoClave = true; estadoPrueba = null; pintarBloqueGemini(); return; }
    if (t.closest('#aj-gem-cancelar')) { editandoClave = false; estadoPrueba = null; pintarBloqueGemini(); return; }
    if (t.closest('#aj-gem-borrar')) {
      document.dispatchEvent(new CustomEvent('abrir-hoja', { detail: {
        titulo: 'Quitar la clave de Gemini',
        opciones: [
          { texto: 'Quitar clave', nota: 'El escáner dejará de funcionar hasta que pongas otra',
            peligro: true, accion: () => { borrarClave(); fijarModeloManual(''); estadoPrueba = null; pintarBloqueGemini(); } },
          { texto: 'Cancelar' }
        ] } }));
      return;
    }
    if (t.closest('#aj-gem-probar')) {
      estadoPrueba = { tipo: 'cargando', texto: 'Probando…' };
      pintarBloqueGemini();
      try {
        await modelosDisponibles({ refrescar: true });
        const r = await probar();
        estadoPrueba = { tipo: 'ok', texto: `Funciona con ${r.modelo}.` };
      } catch (err) {
        estadoPrueba = { tipo: 'error', texto: err.message || 'No ha funcionado.' };
      }
      pintarBloqueGemini();
    }
  });

  raiz.addEventListener('change', e => {
    if (e.target.id === 'aj-gem-modelo') {
      fijarModeloManual(e.target.value);
      pintarBloqueGemini();
    }
  });
}
