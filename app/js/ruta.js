/* ============================================================
   RUTA DE COMPRA — lo que necesita el modo supermercado
   ------------------------------------------------------------
   · agrupar las líneas de la compra según el recorrido de la tienda
   · estimar lo que costaría la compra en cada tienda
   · recordar la última tienda y cuándo se fue a cada una
   El orden de las secciones lo pone js/secciones.js.
   ============================================================ */

import { datos } from './almacen.js?v=29';
import { POR_ID } from './estado.js?v=29';
import { preciosDe } from './precios.js?v=29';
import { favoritas } from './tiendas.js?v=29';
import { seccionDe, agruparPorRuta, rutaDe, SECCION_POR_ID, SIN_SECCION }
  from './secciones.js?v=29';

/* Líneas de la compra -> grupos numerados en el orden de la ruta.
   Cada grupo: { seccion, nombre, numero, hechos, total, items:[{i,l,hecho}] }
   Lo hecho baja al final de su sección. Lo escrito a mano y lo que
   no tiene sección va a «Sin sección». */
export function gruposDeCompra(lineas, ruta) {
  const items = lineas.map((l, i) => ({
    i, l, hecho: !!l.hecho,
    seccion: l.k === 'p' && POR_ID[l.id] ? seccionDe(POR_ID[l.id]) : SIN_SECCION
  }));
  return agruparPorRuta(items, ruta).map((g, n) => ({
    ...g, numero: n + 1,
    hechos: g.items.filter(x => x.hecho).length,
    total: g.items.length
  }));
}

/* Qué sección toca primero: la primera con algo por coger; si todo
   está cogido, la última. */
export function seccionActual(grupos) {
  const i = grupos.findIndex(g => g.hechos < g.total);
  return i >= 0 ? i : Math.max(0, grupos.length - 1);
}

/* Lo que costaría esta compra en una tienda con los precios que se
   conocen de ella. Lo que no tiene precio ahí se cuenta aparte: no se
   inventa una cifra. */
export function estimarLineas(lineas, tiendaId) {
  let total = 0, conocidos = 0, sinPrecio = 0;
  for (const l of lineas) {
    if (l.k !== 'p') continue;
    const fila = preciosDe(l.id).find(f => f.tienda === tiendaId && f.formato != null);
    if (!fila) { sinPrecio++; continue; }
    total += fila.formato * (l.cant || 1);
    conocidos++;
  }
  return { total: Math.round(total * 100) / 100, conocidos, sinPrecio };
}

/* ---------- última tienda y última vez ---------- */

export function recordarTienda(id, ahora = new Date()) {
  datos.ajustes.ultimaTienda = id;
  datos.ajustes.visitas ??= {};
  datos.ajustes.visitas[id] = ahora.toISOString();
}

export function ultimaTienda() { return datos.ajustes?.ultimaTienda || null; }

/* Fecha de la última compra en una tienda: la de su último ticket o la
   de la última vez que se eligió, la más reciente. null si nunca. */
export function ultimaVez(tiendaId) {
  const fechas = datos.tickets.filter(t => t.tienda === tiendaId).map(t => t.fecha);
  const v = datos.ajustes?.visitas?.[tiendaId];
  if (v) fechas.push(v);
  return fechas.sort().pop() || null;
}

export function textoHace(iso, ahora = Date.now()) {
  if (!iso) return null;
  const dias = Math.floor((ahora - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? 'hace 1 mes' : `hace ${meses} meses`;
}

/* La última usada primero, luego las favoritas y después el resto en
   su orden. */
export function ordenarTiendas(tiendas) {
  const ult = ultimaTienda();
  const fav = new Set(favoritas().map(t => t.id));
  const peso = t => (t.id === ult ? 0 : fav.has(t.id) ? 1 : 2);
  return [...tiendas].sort((a, b) => peso(a) - peso(b) || (a.orden ?? 0) - (b.orden ?? 0));
}

/* Los primeros pasillos de la ruta de una tienda, para enseñarlos
   como vista previa */
export function resumenRuta(tiendaId, max = 4) {
  const r = rutaDe(tiendaId);
  const ocultas = new Set(r.ocultas);
  return r.orden.filter(id => !ocultas.has(id)).slice(0, max).map(id => SECCION_POR_ID[id].nombre);
}
