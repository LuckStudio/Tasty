/* ============================================================
   BÁSICOS DE DESPENSA
   ------------------------------------------------------------
   Aceite, sal, especias… se usan en casi todo y casi siempre hay. No
   tiene sentido que salgan como «sin comprobar» en cada bloque de
   cocina ni que se cuelen en cada lista generada: se marcan como
   básicos y la app solo se acuerda de ellos cuando se acaban.

   Se decide por producto, en la capa editable del catálogo (campo `bas`).
   Si el usuario no ha decidido nada, valen estos por defecto.
   ============================================================ */

import { editarProducto } from './catalogo-edit.js?v=39';

/* Aceite de oliva, sal, azúcar, vinagre, especias, pimentón, canela, orégano */
export const BASICOS_POR_DEFECTO = new Set([701, 702, 703, 713, 715, 716, 744, 745]);

export function esBasico(producto) {
  if (!producto) return false;
  if (producto.bas === true) return true;
  if (producto.bas === false) return false;
  return BASICOS_POR_DEFECTO.has(producto.id);
}

/* true = básico, false = no lo es, undefined = lo que diga el valor por defecto */
export function fijarBasico(id, valor) {
  return editarProducto(id, { bas: valor === undefined ? undefined : !!valor });
}
