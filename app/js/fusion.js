/* ============================================================
   FUSIONAR PRODUCTOS DUPLICADOS  (M6)
   ------------------------------------------------------------
   Cuando hay dos productos que son el mismo, todo lo del que
   desaparece pasa al que se queda y el primero queda ARCHIVADO
   (nunca se borra: su id sigue reservado, como manda el catálogo).

   Pasa al producto que se queda:
     · las líneas de los tickets y de la compra en curso
     · las cantidades en las listas (se suman)
     · los precios por tienda (gana el dato más reciente)
     · las tiendas preferidas, equivalentes, marca exigida,
       periodicidad, urgencia y avisos
     · los ingredientes de las recetas
     · los textos de ticket recordados
     · la sección y el peso medio, si el que se queda no los tenía
   ============================================================ */

import { datos, guardar } from './almacen.js?v=39';
import { POR_ID } from './estado.js?v=39';
import { editarProducto } from './catalogo-edit.js?v=39';
import { moverAlias } from './alias.js?v=39';

const k = id => String(id);

/* Mueve datos[de] a datos[a]; si ya existía el destino se combina */
function mover(obj, de, a, combinar) {
  if (!obj || !Object.prototype.hasOwnProperty.call(obj, k(de))) return false;
  const valor = obj[k(de)];
  delete obj[k(de)];
  obj[k(a)] = Object.prototype.hasOwnProperty.call(obj, k(a)) ? combinar(obj[k(a)], valor) : valor;
  return true;
}

const conservarDestino = (dest) => dest;
const unionLista = (a, b) => [...new Set([...(a || []), ...(b || [])])];
const masReciente = (a, b) => ((b?.d || '') > (a?.d || '') ? b : a);

export function puedeFusionar(deId, aId) {
  if (deId === aId) return { ok: false, error: 'Elige otro producto distinto.' };
  if (!POR_ID[deId] || !POR_ID[aId]) return { ok: false, error: 'Ese producto ya no existe.' };
  if (POR_ID[aId].a) return { ok: false, error: 'El producto de destino está archivado.' };
  return { ok: true };
}

export function fusionarProductos(deId, aId) {
  const v = puedeFusionar(deId, aId);
  if (!v.ok) return v;
  const origen = POR_ID[deId], destino = POR_ID[aId];
  const informe = { tickets: 0, listas: 0, recetas: 0, precios: 0, textos: 0 };

  /* tickets y compra en curso: se reenlazan las líneas */
  const reenlazar = lineas => {
    let n = 0;
    for (const l of lineas || []) {
      if (l.id === deId) { l.id = aId; l.n = destino.n; l.c = destino.c; n++; }
    }
    return n;
  };
  for (const t of datos.tickets) informe.tickets += reenlazar(t.lineas) ? 1 : 0;
  reenlazar(datos.compra?.lineas);

  /* listas: las cantidades se suman */
  const sumar = (a, b) => (+a || 0) + (+b || 0);
  const antes = informe.listas;
  for (const l of datos.listas || []) {
    if (mover(l.lista, deId, aId, sumar)) informe.listas++;
    mover(l.urgencia, deId, aId, (a, b) => (a < b ? a : b));       // la fecha más próxima
  }
  if (mover(datos.lista, deId, aId, sumar) && informe.listas === antes) informe.listas++;
  mover(datos.urgencia, deId, aId, (a, b) => (a < b ? a : b));

  /* precios: por tienda gana el dato más reciente */
  if (mover(datos.preciosLocal, deId, aId, (dest, src) => {
    const res = { ...dest };
    for (const [tienda, dato] of Object.entries(src)) {
      res[tienda] = res[tienda] ? masReciente(res[tienda], dato) : dato;
    }
    return res;
  })) informe.precios++;

  mover(datos.prefTienda, deId, aId, unionLista);
  mover(datos.marcas, deId, aId, conservarDestino);
  mover(datos.periodicidad, deId, aId, conservarDestino);
  mover(datos.sugerenciasFuera, deId, aId, conservarDestino);

  /* equivalentes: se une y se sustituye el id viejo en todas las listas */
  mover(datos.sustitutos, deId, aId, unionLista);
  for (const [clave, lista] of Object.entries(datos.sustitutos || {})) {
    const nueva = unionLista(lista.map(x => (x === deId ? aId : x)), [])
      .filter(x => x !== +clave);                                  // nadie es equivalente de sí mismo
    if (nueva.length) datos.sustitutos[clave] = nueva; else delete datos.sustitutos[clave];
  }

  /* recetas */
  for (const r of datos.recetas || []) {
    let toco = false;
    for (const ing of r.ingredientes || []) {
      if (ing.id === deId) { ing.id = aId; toco = true; }
    }
    if (toco) informe.recetas++;
  }

  informe.textos = moverAlias(deId, aId);

  /* lo editable pasa al destino si no lo tenía; el origen se archiva */
  const heredar = {};
  if (origen.s && !destino.s) heredar.s = origen.s;
  if (origen.pu && !destino.pu) heredar.pu = origen.pu;
  if (Object.keys(heredar).length) editarProducto(aId, heredar);
  editarProducto(deId, { a: true });

  guardar();
  return { ok: true, informe, destino: aId };
}
