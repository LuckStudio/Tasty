/* ============================================================
   HISTORIAL DE PRECIOS (M8)
   ------------------------------------------------------------
   Cada compra registra precio, cantidad, unidad, tienda y fecha.
   Para comparar compras de distinto tamaño se usa el PRECIO
   NORMALIZADO: €/kg, €/L o €/ud (la unidad base del producto).

   De dónde sale el precio normalizado de una línea de ticket,
   por orden de fiabilidad:
     1. el €/kg que dice el propio ticket (productos a granel)
     2. importe ÷ cantidad comprada (si se anotó 0,612 kg)
     3. producto que se vende por unidad: importe ÷ unidades
     4. unidades de un producto por peso, con peso medio conocido
     5. el formato que se sabe de ese producto en esa tienda
   Si nada sirve, la línea no entra en la gráfica: nunca se
   inventa un precio para poder dibujar algo.

   Funciones puras: se prueban sin navegador.
   ============================================================ */

import { precioBaseDeCompra } from './unidades.js?v=29';

const redondear = n => Math.round(n * 100) / 100;
const DIA = 86400000;

/* formatoDe(tienda) -> { q, u } | null  (formato conocido del producto) */
export function baseDeLinea(linea, producto, formatoDe = null, tienda = null) {
  if (linea.precio == null || !(linea.precio >= 0)) return null;
  const cant = linea.cant || 1;

  if (Number.isFinite(linea.pb) && linea.pb > 0) return redondear(linea.pb);

  if (linea.q?.v > 0) {
    const b = precioBaseDeCompra(linea.precio, linea.q.v, linea.q.u, producto);
    if (b != null) return b;
  }
  if (producto?.u === 'ud') return redondear(linea.precio / cant);

  const porPeso = precioBaseDeCompra(linea.precio, cant, 'ud', producto);   // usa el peso medio
  if (porPeso != null) return porPeso;

  const f = formatoDe?.(tienda);
  if (f?.q > 0 && f?.u) {
    const b = precioBaseDeCompra(linea.precio / cant, f.q, f.u, producto);
    if (b != null) return b;
  }
  return null;
}

/* Puntos para dibujar, de antiguo a reciente.
   [{ fecha, tienda, cant, importe, base }] */
export function serie(id, tickets, producto, formatoDe = null) {
  const puntos = [];
  for (const t of tickets) {
    for (const l of t.lineas || []) {
      if (l.id !== id) continue;
      const base = baseDeLinea(l, producto, formatoDe, t.tienda);
      if (base == null) continue;
      puntos.push({
        fecha: t.fecha, tienda: t.tienda || null,
        cant: l.cant || 1, q: l.q || null,
        importe: l.precio, base
      });
    }
  }
  return puntos.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/* Recorta a los últimos N meses respecto a una fecha */
export function recortar(puntos, meses, ahora = Date.now()) {
  if (!meses) return puntos;
  const desde = ahora - meses * 30.44 * DIA;
  return puntos.filter(p => new Date(p.fecha).getTime() >= desde);
}

/* Ha bajado, estable o ha subido: última compra frente a la media de
   las de los 3 meses anteriores. ±3 % se considera estable. */
export function tendencia(puntos, umbral = 3) {
  if (puntos.length < 2) return null;
  const ultimo = puntos[puntos.length - 1];
  const tUlt = new Date(ultimo.fecha).getTime();
  const previos = puntos.slice(0, -1).filter(p => {
    const t = new Date(p.fecha).getTime();
    return t <= tUlt && tUlt - t <= 91 * DIA;
  });
  if (!previos.length) return null;

  const media = previos.reduce((a, p) => a + p.base, 0) / previos.length;
  if (!(media > 0)) return null;
  const pct = (ultimo.base / media - 1) * 100;
  return {
    estado: pct <= -umbral ? 'baja' : pct >= umbral ? 'sube' : 'estable',
    pct: Math.round(Math.abs(pct)),
    media: redondear(media), ultimo: ultimo.base, compras: previos.length + 1
  };
}

export function porTienda(puntos) {
  const mapa = new Map();
  for (const p of puntos) {
    const k = p.tienda || 'otro';
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(p);
  }
  return mapa;
}

/* De €/kg a €/ud con el peso medio (g). null si no se conoce. */
export function baseAUnidad(base, producto) {
  if (producto?.u === 'kg' && producto.pu > 0) return redondear(base * producto.pu / 1000);
  if (producto?.u === 'ud') return base;
  return null;
}
