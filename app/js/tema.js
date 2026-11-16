/* ============================================================
   TEMA — claro, oscuro o el del sistema
   ------------------------------------------------------------
   Se guarda en su propia clave de localStorage, aparte del
   resto del estado, porque el <head> de index.html lo lee antes
   de que arranque la app para evitar el parpadeo blanco al
   abrir en oscuro.
   ============================================================ */

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
  if (meta) meta.content = temaEfectivo() === 'oscuro' ? '#0a0a0a' : '#ffffff';
}

export function fijarTema(id) {
  localStorage.setItem(CLAVE, id);
  document.documentElement.dataset.tema = id;
  pintarBarraDelSistema();
}

export function iniciarTema() {
  document.documentElement.dataset.tema = temaActual();
  pintarBarraDelSistema();

  /* Si está en automático y el móvil cambia de tema al
     anochecer, la barra de estado se actualiza sola */
  if (window.matchMedia) {
    window.matchMedia(CONSULTA).addEventListener('change', () => {
      if (temaActual() === 'auto') pintarBarraDelSistema();
    });
  }
}
