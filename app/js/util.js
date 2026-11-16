/* ============================================================
   UTILIDADES COMPARTIDAS
   ============================================================ */

/* Convierte el nombre de un producto en el nombre de su
   archivo SVG. Minúsculas, sin acentos, espacios como guion
   bajo, sin caracteres raros.
     "Plátanos"         -> platanos
     "Patatas fritas"   -> patatas_fritas
     "Judías verdes"    -> judias_verdes
     "Papel de aluminio"-> papel_de_aluminio            */
export function slug(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // quita acentos
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')      // fuera símbolos
    .trim()
    .replace(/[\s-]+/g, '_');          // espacios -> _
}

/* Ruta del icono de un producto */
export function rutaIcono(p) {
  return `iconos/${p.c}/${slug(p.n)}.svg`;
}

/* Quita acentos para buscar sin que importen las tildes */
export function normalizar(txt) {
  return txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* Escapa texto para meterlo en HTML o en un atributo. Imprescindible
   con lo que viene de fuera (fotos de tickets leídas por IA). */
export function esc(t) {
  return String(t ?? '').replace(/[&<>"'`]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
}

/* Formato de moneda español */
export function euros(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR'
  }).format(n);
}

/* Atajo de selección */
export const $  = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* Crea un elemento con clase y contenido opcionales */
export function el(tag, clase, html) {
  const n = document.createElement(tag);
  if (clase) n.className = clase;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

/* ------------------------------------------------------------
   IDENTIFICADORES ÚNICOS

   Date.now() a secas NO vale: dos cosas creadas en el mismo
   milisegundo salen con el mismo id, y a partir de ahí una pisa
   a la otra sin dar ningún error. Pasa de verdad en cuanto algo
   se crea en bucle.

   El contador garantiza que no se repitan aunque se creen mil
   seguidas, y la marca de tiempo mantiene el orden cronológico.
   ------------------------------------------------------------ */
let contador = 0;

export function nuevoId(prefijo = '') {
  contador = (contador + 1) % 1296;      // 36^2, dos caracteres
  return prefijo
    + Date.now().toString(36)
    + contador.toString(36).padStart(2, '0');
}

/* Vibración corta al tocar, si el móvil lo soporta */
export function tap(ms = 8) {
  if (navigator.vibrate) navigator.vibrate(ms);
}
