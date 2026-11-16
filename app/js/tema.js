/* ============================================================
   TEMA — claro, oscuro o el del sistema
   ------------------------------------------------------------
   Se guarda en su propia clave de localStorage, aparte del
   resto del estado, porque el <head> de index.html lo lee antes
   de que arranque la app para evitar el parpadeo blanco al
   abrir en oscuro.
   ============================================================ */

import { acentoAccesible } from './color.js?v=26';

const CLAVE = 'luckstudio_tema';

export const TEMAS = [
  { id: 'auto',   nombre: 'El del sistema' },
  { id: 'claro',  nombre: 'Claro'          },
  { id: 'oscuro', nombre: 'Oscuro'         }
];

export function temaActual() {
  return localStorage.getItem(CLAVE) || 'auto';
}

const CONSULTA = '(prefers-color-scheme: dark)';

function sistemaEnOscuro() {
  return !!window.matchMedia && window.matchMedia(CONSULTA).matches;
}

/* Qué se está viendo de verdad, resolviendo el automático */
export function temaEfectivo() {
  const t = temaActual();
  if (t !== 'auto') return t;
  return sistemaEnOscuro() ? 'oscuro' : 'claro';
}

function pintarBarraDelSistema() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const oscuro = temaEfectivo() === 'oscuro';
  /* Con tienda elegida, la barra del móvil toma su color */
  meta.content = tiendaColor
    ? (acentoAccesible(tiendaColor, oscuro)?.acento || '#F3F2EE')
    : (oscuro ? '#121418' : '#F3F2EE');
}

/* ---------- acento por tienda ----------
   Solo cambia el acento (cabeceras, botones, progreso, selección).
   Lo demás del sistema visual no se toca. */

let tiendaColor = null;

export function fijarAcentoTienda(hex) {
  tiendaColor = hex || null;
  const raiz = document.documentElement;
  const r = tiendaColor ? acentoAccesible(tiendaColor, temaEfectivo() === 'oscuro') : null;
  if (r) {
    raiz.style.setProperty('--acento', r.acento);
    raiz.style.setProperty('--sobre-acento', r.texto);
  } else {
    raiz.style.removeProperty('--acento');
    raiz.style.removeProperty('--sobre-acento');
  }
  pintarBarraDelSistema();
}

export function fijarTema(id) {
  localStorage.setItem(CLAVE, id);
  document.documentElement.dataset.tema = id;
  fijarAcentoTienda(tiendaColor);      // recalcula el contraste para el tema nuevo
}

export function iniciarTema() {
  document.documentElement.dataset.tema = temaActual();
  pintarBarraDelSistema();

  /* Si está en automático y el móvil cambia de tema al
     anochecer, la barra de estado se actualiza sola */
  if (window.matchMedia) {
    window.matchMedia(CONSULTA).addEventListener('change', () => {
      if (temaActual() === 'auto') fijarAcentoTienda(tiendaColor);
    });
  }
}
