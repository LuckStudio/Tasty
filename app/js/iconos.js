/* ============================================================
   ICONOS
   ------------------------------------------------------------
   El emoji es lo normal. Se ve igual en todos los móviles, no
   pesa nada y no hay que dibujar nada.

   Un SVG propio solo se pide si está declarado en
   datos/iconos.js. Antes se intentaban todos y los que no
   existían daban un 404: funcionaba, pero llenaba la consola de
   errores y hacía cientos de peticiones inútiles.
   ============================================================ */

import { slug, rutaIcono } from './util.js?v=26';
import { SET_ICONOS } from '../datos/iconos.js?v=26';

/* Si un SVG declarado no está en el servidor, se apunta para no
   volver a pedirlo durante esta sesión */
const fallidos = new Set();

function reserva(p) {
  if (p.e) return `<span aria-hidden="true">${p.e}</span>`;
  return `<span class="prod-inicial" aria-hidden="true">${p.n[0].toUpperCase()}</span>`;
}

/* Devuelve el HTML interior del contenedor de icono */
export function iconoHTML(p) {
  const s = slug(p.n);
  const ruta = rutaIcono(p);

  if (!SET_ICONOS.has(s) || fallidos.has(ruta)) return reserva(p);

  return `<img src="${ruta}" alt="" loading="lazy" decoding="async"
               data-reserva="${encodeURIComponent(reserva(p))}"
               data-ruta="${ruta}">`;
}

/* Un solo listener para toda la app: cuando un SVG no existe,
   se sustituye por el emoji y se apunta para no reintentarlo */
export function vigilarIconos(raiz = document) {
  raiz.addEventListener('error', e => {
    const img = e.target;
    if (img.tagName !== 'IMG' || !img.dataset.reserva) return;
    fallidos.add(img.dataset.ruta);
    img.outerHTML = decodeURIComponent(img.dataset.reserva);
  }, true);   // en fase de captura: los errores de img no burbujean
}
