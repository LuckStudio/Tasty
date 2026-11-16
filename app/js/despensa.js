/* ============================================================
   DESPENSA — qué hay en casa
   ------------------------------------------------------------
   La app base no controlaba existencias; esto las añade, de forma
   que no obligue a nadie a llevar un inventario perfecto:

     datos.despensa[idProducto] = {
       cant,     cuánto hay (número) o null si solo se sabe el estado
       unidad,   'g' | 'ml' | 'ud'  (o null)
       estado,   'hay' | 'acaba' | 'agotado'
       d         fecha del último cambio
     }

   Cómo se va llenando, sin esfuerzo:
     · al guardar una compra, lo comprado suma
     · al terminar de cocinar, lo usado resta
     · «se está acabando» / «se ha acabado» con un toque
     · a mano, desde la ficha del producto

   Si de un producto no se sabe nada, la app lo dice («no lo sé»)
   y nunca finge que lo tiene ni que no.
   ============================================================ */

import { datos, guardar } from './almacen.js?v=36';
import { POR_ID } from './estado.js?v=36';
import { cantidad as enLista, sumar as sumarALista } from './estado.js?v=36';
import { convertir, unidadNormal } from './unidades.js?v=36';
import { preciosDe } from './precios.js?v=36';

const oyentes = new Set();
export function suscribirDespensa(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
function avisar() { guardar(); oyentes.forEach(fn => fn()); }

const ahora = () => new Date().toISOString();
const tabla = () => (datos.despensa ??= {});
const propio = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export function stockDe(id) {
  const t = tabla();
  return propio(t, String(id)) ? t[String(id)] : null;
}

/* ---------- escribir ---------- */

function escribir(id, e) {
  tabla()[String(id)] = { ...e, d: ahora() };
  avisar();
}

/* Pone la cantidad que hay (a mano) */
export function fijarStock(id, cant, unidad) {
  const u = unidadNormal(unidad);
  if (!POR_ID[id] || !(cant >= 0) || cant > 1e6 || !u || !['g', 'ml', 'ud'].includes(u)) return false;
  escribir(id, { cant: Math.round(cant * 100) / 100, unidad: u, estado: cant > 0 ? 'hay' : 'agotado' });
  return true;
}

/* Convierte a la unidad en que se guarda el stock de ese producto.
   null si no se puede (por ejemplo, unidades de algo que se pesa y no
   se sabe cuánto pesa una). */
function enUnidadDeStock(id, cant, unidad, actual) {
  const p = POR_ID[id];
  /* El stock se guarda siempre en la unidad mínima de cómo se vende el
     producto (g, ml o ud), venga como venga el dato: 0,5 kg -> 500 g */
  const destino = actual?.unidad || ({ kg: 'g', l: 'ml', ud: 'ud' }[p.u] || 'ud');
  const v = convertir(cant, unidad, destino, p);
  return v == null ? null : { v, u: destino };
}

export function sumarStock(id, cant, unidad) {
  if (!POR_ID[id] || !(cant > 0)) return false;
  const actual = stockDe(id);
  const conv = enUnidadDeStock(id, cant, unidad, actual?.cant != null ? actual : null);
  if (!conv) {
    /* No se puede cuantificar: al menos se sabe que hay */
    confirmarHay(id);
    return false;
  }
  const base = actual?.cant != null ? actual.cant : 0;
  escribir(id, { cant: Math.round((base + conv.v) * 100) / 100, unidad: conv.u, estado: 'hay' });
  return true;
}

/* Descuenta; nunca baja de 0. Devuelve false si no se pudo cuantificar. */
export function restarStock(id, cant, unidad) {
  const actual = stockDe(id);
  if (!POR_ID[id] || !(cant > 0) || actual?.cant == null) return false;
  const conv = enUnidadDeStock(id, cant, unidad, actual);
  if (!conv) return false;
  const nueva = Math.max(0, Math.round((actual.cant - conv.v) * 100) / 100);
  escribir(id, { cant: nueva, unidad: actual.unidad, estado: nueva > 0 ? actual.estado === 'acaba' ? 'acaba' : 'hay' : 'agotado' });
  return true;
}

/* «Se está acabando» / «se ha acabado» */
export function marcar(id, nivel) {
  if (!POR_ID[id] || !['acaba', 'agotado', 'hay'].includes(nivel)) return false;
  const a = stockDe(id);
  escribir(id, {
    cant: nivel === 'agotado' ? (a?.cant != null ? 0 : null) : (a?.cant ?? null),
    unidad: a?.unidad ?? null,
    estado: nivel
  });
  return true;
}

/* Solo se sabe que hay (no cuánto): no toca una cantidad ya conocida */
export function confirmarHay(id) {
  if (!POR_ID[id]) return false;
  const a = stockDe(id);
  escribir(id, { cant: a?.cant ?? null, unidad: a?.unidad ?? null, estado: 'hay' });
  return true;
}

export function olvidarStock(id) {
  delete tabla()[String(id)];
  avisar();
}

/* ---------- leer: ¿hay suficiente? ---------- */

/* necesario: { cant, unidad }  →  { estado, tengo }
   estado: 'hay' · 'falta' · 'acaba' · 'agotado' · 'desconocido' */
export function disponibilidad(id, necesario = null) {
  const e = stockDe(id);
  if (!e) return { estado: 'desconocido', tengo: null };
  const tengo = e.cant != null ? { cant: e.cant, unidad: e.unidad } : null;

  if (e.estado === 'agotado' || e.cant === 0) return { estado: 'agotado', tengo };

  if (e.cant != null && necesario?.cant > 0) {
    const falta = convertir(necesario.cant, necesario.unidad, e.unidad, POR_ID[id]);
    if (falta != null) return { estado: e.cant + 1e-9 >= falta ? (e.estado === 'acaba' ? 'acaba' : 'hay') : 'falta', tengo };
  }
  return { estado: e.estado === 'acaba' ? 'acaba' : 'hay', tengo };
}

/* Lo que cuenta como «me falta»: agotado o cantidad insuficiente */
export const esFalta = estado => estado === 'falta' || estado === 'agotado';

/* ---------- lo que la compra y la cocina cambian ---------- */

/* Al guardar una compra NUEVA (no al editarla: se contaría dos veces).
   De cada línea se suma lo que se llevó, en este orden de fiabilidad:
     1. la cantidad anotada (0,5 kg)
     2. producto que se vende por unidades: las unidades
     3. el formato que se sabe de esa tienda × lo comprado
     4. si nada de eso, solo se sabe que hay */
export function desdeTicket(ticket) {
  let cambios = 0;
  for (const l of ticket.lineas || []) {
    if (!l.id || !POR_ID[l.id]) continue;
    const p = POR_ID[l.id];
    const cant = l.cant || 1;

    if (l.q?.v > 0) { sumarStock(l.id, l.q.v, l.q.u); cambios++; continue; }
    if (p.u === 'ud') { sumarStock(l.id, cant, 'ud'); cambios++; continue; }

    const fila = preciosDe(l.id).find(f => f.tienda === ticket.tienda && f.cantidad && f.unidad);
    if (fila) { sumarStock(l.id, fila.cantidad * cant, fila.unidad); cambios++; continue; }

    confirmarHay(l.id);                      // se sabe que hay, sin cantidad
    cambios++;
  }
  return cambios;
}

/* Al terminar de cocinar: resta lo usado. raciones = las cocinadas. */
export function descontarReceta(receta, raciones = null) {
  const factor = (raciones || receta.raciones || 1) / (receta.raciones || 1);
  let descontados = 0, sinCuantificar = 0;
  for (const ing of receta.ingredientes || []) {
    if (!ing.id || ing.sinCantidad || !(ing.cant > 0)) continue;
    restarStock(ing.id, ing.cant * factor, ing.unidad) ? descontados++ : sinCuantificar++;
  }
  return { descontados, sinCuantificar };
}

/* ---------- «se acaba»: va a la lista sin duplicar ---------- */

export function aLaLista(ids, nivel = 'acaba') {
  let anadidos = 0, yaEstaban = 0;
  for (const id of ids) {
    if (!POR_ID[id]) continue;
    marcar(id, nivel);
    if (enLista(id) > 0) yaEstaban++;
    else { sumarALista(id, 1); anadidos++; }
  }
  return { anadidos, yaEstaban };
}
