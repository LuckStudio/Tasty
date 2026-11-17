/* ============================================================
   PIEZAS COMUNES DE RECETA
   Imagen (foto si hay; si no, color de la receta con el icono de
   su ingrediente principal), día y franja en texto.
   ============================================================ */

import { POR_ID } from '../estado.js?v=39';
import { colorDeReceta, aFecha, fechaISO, sumarDias, FRANJA_POR_ID } from '../menu.js?v=39';
import { sanearFoto, slugReceta } from '../recetas.js?v=39';
import { FOTOS_RECETAS } from '../../datos/fotos-recetas.js?v=39';
import { iconoHTML } from '../iconos.js?v=39';
import { esc } from '../util.js?v=39';

/* Si una foto no existe (todavía no se ha subido), se quita y se ve el
   color de la receta. Escucha en captura porque «error» no sube. */
let escuchando = false;
export function vigilarFotosDeReceta() {
  if (escuchando) return;
  escuchando = true;
  document.addEventListener('error', e => {
    if (e.target?.classList?.contains('rc-foto')) e.target.remove();
  }, true);
}

export function imagenReceta(r, extra = '') {
  const color = colorDeReceta(r);
  const principal = (r.ingredientes || []).find(i => i.id && POR_ID[i.id]);
  const icono = principal ? iconoHTML(POR_ID[principal.id]) : '<span aria-hidden="true">🍽️</span>';
  /* Foto: la indicada en la receta o la del nombre; solo si existe */
  const candidato = r.foto ? sanearFoto(r.foto) : slugReceta(r.nombre);
  const slug = FOTOS_RECETAS.has(candidato) ? candidato : '';
  return `<span class="rc-img ${extra}" style="--rc:${color}">
    <span class="rc-ico">${icono}</span>
    ${slug ? `<img class="rc-foto" src="recetas/${slug}.jpg" alt="" loading="lazy">` : ''}</span>`;
}

export const puntoReceta = r => `<i class="rc-punto" style="background:${colorDeReceta(r)}" aria-hidden="true"></i>`;

const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const diaCorto = f => DIAS[aFecha(f).getDay()];
export const diaLargo = f => DIAS_LARGOS[aFecha(f).getDay()];
export const diaNumero = f => aFecha(f).getDate();
export const mesCorto = f => MESES[aFecha(f).getMonth()];

/* «HOY», «MAÑANA» o «MAR» respecto a una fecha de referencia */
export function relativo(f, hoy = fechaISO()) {
  if (f === hoy) return 'HOY';
  if (f === sumarDias(hoy, 1)) return 'MAÑANA';
  return diaCorto(f);
}

export const nombreFranja = s => FRANJA_POR_ID[s]?.nombre || s;
export const pregunta = s => ({ desayuno: '¿Qué vais a desayunar?', comida: '¿Qué vais a comer?', merienda: '¿Qué vais a merendar?', cena: '¿Qué vais a cenar?' }[s] || '¿Qué vais a cocinar?');

/* Texto de «Tienes todo» / «Falta 2» para etiquetas */
export function etiquetaDisponibilidad(d) {
  if (d.faltan) return { texto: `Falta ${d.faltan}`, clase: 'rc-falta' };
  if (d.todo) return { texto: 'Tienes todo', clase: 'rc-todo' };
  return null;
}
