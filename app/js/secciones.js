/* ============================================================
   SECCIONES Y RUTAS DE TIENDA
   ------------------------------------------------------------
   · Cada producto tiene una sección: la suya propia si la
     eligió el usuario (campo `s`, en la capa editable del
     catálogo) o la que corresponde a su categoría.
   · Cada tienda tiene una ruta: el orden en que se recorren
     las secciones y cuáles no existen allí (ocultas).
   · La lista de la compra se agrupa y ordena con esa ruta. Lo
     tachado baja al final de su sección. Lo que no tiene
     sección va a un grupo «Sin sección».

   La ruta vive en datos.rutas[tienda] = { orden: [...], ocultas: [...] }.
   Una sección nueva del catálogo que la ruta aún no conoce se
   añade al final, así nunca desaparece un producto.
   ============================================================ */

import { datos, guardar } from './almacen.js?v=25';
import { SECCIONES, SECCION_DE_CATEGORIA, SECCION_POR_ID, SIN_SECCION }
  from '../datos/secciones.js?v=25';

export { SECCIONES, SECCION_POR_ID, SIN_SECCION };

const oyentes = new Set();
export function suscribirRutas(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
function avisar() { guardar(); oyentes.forEach(fn => fn()); }

/* ---------- sección de un producto ---------- */

/* `producto` es el objeto del catálogo ya mezclado con sus
   ediciones. Devuelve el id de sección o SIN_SECCION. */
export function seccionDe(producto) {
  if (!producto) return SIN_SECCION;
  if (producto.s && SECCION_POR_ID[producto.s]) return producto.s;
  return SECCION_DE_CATEGORIA[producto.c] || SIN_SECCION;
}

/* ---------- ruta de una tienda (funciones puras primero) ---------- */

/* Orden completo y limpio: lo guardado, sin ids desconocidos ni
   repetidos, más las secciones nuevas al final. */
export function ordenCompleto(ruta) {
  const guardado = Array.isArray(ruta?.orden) ? ruta.orden : [];
  const vistos = new Set();
  const orden = [];
  for (const id of guardado) {
    if (SECCION_POR_ID[id] && !vistos.has(id)) { vistos.add(id); orden.push(id); }
  }
  for (const s of [...SECCIONES].sort((a, b) => a.orden - b.orden)) {
    if (!vistos.has(s.id)) orden.push(s.id);
  }
  return orden;
}

/* Agrupa elementos de la lista según la ruta.
   items: [{ ...cualquier cosa, seccion, hecho }]
   Devuelve [{ seccion, nombre, items }] solo con las secciones
   que tienen algo, en el orden de la ruta. Las secciones ocultas
   en esa tienda NO desaparecen sus productos: pasan a «Sin
   sección» para que no se olviden. */
export function agruparPorRuta(items, ruta) {
  const orden = ordenCompleto(ruta);
  const ocultas = new Set(ruta?.ocultas || []);
  const cubos = new Map(orden.filter(id => !ocultas.has(id)).map(id => [id, []]));
  const sin = [];

  for (const it of items) {
    const cubo = cubos.get(it.seccion);
    cubo ? cubo.push(it) : sin.push(it);
  }

  const grupos = [];
  for (const [id, lista] of cubos) {
    if (!lista.length) continue;
    grupos.push({ seccion: id, nombre: SECCION_POR_ID[id].nombre, items: tachadosAlFinal(lista) });
  }
  if (sin.length) {
    grupos.push({ seccion: SIN_SECCION, nombre: 'Sin sección', items: tachadosAlFinal(sin) });
  }
  return grupos;
}

/* Lo tachado baja al final conservando el orden relativo */
function tachadosAlFinal(lista) {
  return [...lista.filter(i => !i.hecho), ...lista.filter(i => i.hecho)];
}

/* ---------- ruta guardada ---------- */

export function rutaDe(tiendaId) {
  const r = datos.rutas?.[tiendaId];
  return { orden: ordenCompleto(r), ocultas: [...(r?.ocultas || [])] };
}

export function tieneRutaPropia(tiendaId) {
  return !!datos.rutas?.[tiendaId];
}

function escribirRuta(tiendaId, ruta) {
  datos.rutas ??= {};
  datos.rutas[tiendaId] = { orden: ruta.orden, ocultas: ruta.ocultas };
  avisar();
}

/* Mueve una sección una posición (-1 arriba, +1 abajo) */
export function moverSeccion(tiendaId, seccionId, direccion) {
  const r = rutaDe(tiendaId);
  const i = r.orden.indexOf(seccionId);
  const j = i + (direccion < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= r.orden.length) return false;
  [r.orden[i], r.orden[j]] = [r.orden[j], r.orden[i]];
  escribirRuta(tiendaId, r);
  return true;
}

/* Para arrastrar y soltar: pone la sección en una posición exacta */
export function colocarSeccion(tiendaId, seccionId, posicion) {
  const r = rutaDe(tiendaId);
  const i = r.orden.indexOf(seccionId);
  if (i < 0) return false;
  r.orden.splice(i, 1);
  r.orden.splice(Math.max(0, Math.min(posicion, r.orden.length)), 0, seccionId);
  escribirRuta(tiendaId, r);
  return true;
}

export function ocultarSeccion(tiendaId, seccionId, ocultar = true) {
  if (!SECCION_POR_ID[seccionId]) return false;
  const r = rutaDe(tiendaId);
  const ya = r.ocultas.includes(seccionId);
  if (ocultar && !ya) r.ocultas.push(seccionId);
  if (!ocultar && ya) r.ocultas = r.ocultas.filter(x => x !== seccionId);
  escribirRuta(tiendaId, r);
  return true;
}

/* Copia el recorrido de otra tienda (misma cadena, otra ubicación) */
export function copiarRuta(deTiendaId, aTiendaId) {
  const r = rutaDe(deTiendaId);
  escribirRuta(aTiendaId, { orden: [...r.orden], ocultas: [...r.ocultas] });
}

export function restablecerRuta(tiendaId) {
  if (datos.rutas) delete datos.rutas[tiendaId];
  avisar();
}
