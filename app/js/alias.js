/* ============================================================
   ALIAS DE TICKET — la memoria de equivalencias
   ------------------------------------------------------------
   El ticket dice «BANDEJA KIWI 500 G» o «HACENDADO MEZCLA 4» y
   el producto de la app se llama «Kiwi». Cuando el usuario
   enlaza un texto con un producto, se recuerda POR CADENA y la
   próxima vez se enlaza solo.

   Un producto puede tener varios textos (marcas, tiendas).
   datos.alias = { [cadena]: { [texto normalizado]: idProducto } }
   ============================================================ */

import { datos, guardar } from './almacen.js?v=26';

/* Mismo texto, mismo alias: sin mayúsculas, tildes, números de
   peso al final ni espacios de más. */
export function claveDeTexto(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ%\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const propio = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const PELIGROSAS = new Set(['__proto__', 'constructor', 'prototype']);

export function buscarAlias(cadena, texto) {
  const t = datos.alias && propio(datos.alias, cadena) ? datos.alias[cadena] : null;
  const k = claveDeTexto(texto);
  const id = t && propio(t, k) ? t[k] : null;
  return Number.isFinite(id) ? id : null;
}

export function aprenderAlias(cadena, texto, idProducto) {
  const k = claveDeTexto(texto);
  if (!cadena || !k || PELIGROSAS.has(cadena) || PELIGROSAS.has(k)
      || !Number.isFinite(idProducto)) return false;
  datos.alias ??= {};
  if (!propio(datos.alias, cadena)) datos.alias[cadena] = {};
  if (datos.alias[cadena][k] === idProducto) return false;
  datos.alias[cadena][k] = idProducto;
  guardar();
  return true;
}

export function olvidarAlias(cadena, texto) {
  const tabla = datos.alias?.[cadena];
  if (!tabla) return;
  delete tabla[claveDeTexto(texto)];
  if (!Object.keys(tabla).length) delete datos.alias[cadena];
  guardar();
}

/* Todos los textos que se enlazan con un producto: [{cadena, texto}] */
export function textosDe(idProducto) {
  const out = [];
  for (const [cadena, tabla] of Object.entries(datos.alias || {})) {
    for (const [texto, id] of Object.entries(tabla)) {
      if (id === idProducto) out.push({ cadena, texto });
    }
  }
  return out;
}

/* Fusionar dos productos duplicados: los textos del que desaparece
   pasan al que se queda. */
export function moverAlias(deId, aId) {
  let n = 0;
  for (const tabla of Object.values(datos.alias || {})) {
    for (const [texto, id] of Object.entries(tabla)) {
      if (id === deId) { tabla[texto] = aId; n++; }
    }
  }
  if (n) guardar();
  return n;
}
