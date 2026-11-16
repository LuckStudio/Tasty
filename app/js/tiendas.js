/* ============================================================
   TIENDAS — lista viva
   ------------------------------------------------------------
   Mezcla las tiendas horneadas con las que añades tú desde la
   app: fruterías, carnicerías, la panadería de la esquina.

   Igual que con los productos, un id de tienda no cambia nunca
   y no se reutiliza: los tickets antiguos lo guardan.

   Se exporta con `let` para que los módulos que la importan
   vean los cambios sin recargar la página.
   ============================================================ */

import { datos, guardar } from './almacen.js?v=18';
import { TIENDAS_BASE, TIENDA_LIBRE, COLORES_TIENDA } from '../datos/tiendas.js?v=18';
import { slug } from './util.js?v=18';

export { TIENDA_LIBRE, COLORES_TIENDA };

export let TIENDAS = [];
export let TIENDA_POR_ID = {};

const oyentes = new Set();
export function suscribirTiendas(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export function reconstruirTiendas() {
  const local = datos.tiendasLocal || { propias: [], ediciones: {} };

  const base = TIENDAS_BASE.map(t => {
    const cambios = local.ediciones[t.id];
    return cambios ? { ...t, ...cambios, editada: true } : t;
  });

  const propias = (local.propias || []).map(t => ({ ...t, propia: true }));

  TIENDAS = [...base, ...propias].sort((a, b) => a.orden - b.orden);
  TIENDA_POR_ID = Object.fromEntries(
    [...TIENDAS, TIENDA_LIBRE].map(t => [t.id, t])
  );
  return TIENDAS;
}

function avisar() {
  reconstruirTiendas();
  guardar();
  oyentes.forEach(fn => fn());
}

reconstruirTiendas();

/* ---------- consultas ---------- */

export function tiendasActivas() {
  return TIENDAS.filter(t => t.activa);
}

/* ------------------------------------------------------------
   FAVORITAS

   Sitios a los que estás dispuesto a ir de verdad. Comparar
   precios contra una tienda que te pilla a 40 minutos no sirve
   de nada: sale barata en la pantalla y cara en la vida.

   Si no hay ninguna marcada, cuentan todas: no tiene sentido
   obligar a configurar algo antes de poder usar la app.
   ------------------------------------------------------------ */
export function favoritas() {
  const marcadas = tiendasActivas().filter(t => t.favorita);
  return marcadas.length ? marcadas : tiendasActivas();
}

export function hayFavoritas() {
  return tiendasActivas().some(t => t.favorita);
}

export function esFavorita(id) {
  return !!TIENDA_POR_ID[id]?.favorita;
}

export function alternarFavorita(id) {
  const t = TIENDA_POR_ID[id];
  if (!t) return;
  editarTienda(id, { favorita: !t.favorita });
}

export function nombreTienda(id) {
  return TIENDA_POR_ID[id]?.nombre || 'Sin supermercado';
}

export function colorTienda(id) {
  return TIENDA_POR_ID[id]?.color || TIENDA_LIBRE.color;
}

/* Iniciales para el sello del ticket. Con dos palabras coge la
   primera letra de cada una: "Frutería Paco" → FP */
export function inicialesTienda(id) {
  const t = TIENDA_POR_ID[id];
  if (!t) return '—';
  const palabras = t.nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length >= 2) {
    return (palabras[0][0] + palabras[1][0]).toUpperCase();
  }
  return t.nombre.slice(0, 2).toUpperCase();
}

/* ---------- alta y edición ---------- */

export function crearTienda({ nombre, color, corto }) {
  const limpio = String(nombre || '').trim();
  if (!limpio) return { ok: false, error: 'Ponle un nombre.' };

  const base = slug(limpio).slice(0, 20) || 't';
  let id = base, n = 2;
  while (TIENDA_POR_ID[id]) id = `${base}_${n++}`;

  const repetida = TIENDAS.find(
    t => t.nombre.toLowerCase() === limpio.toLowerCase()
  );
  if (repetida) return { ok: false, error: `Ya tienes «${repetida.nombre}».` };

  const tienda = {
    id,
    nombre: limpio,
    corto: (corto || limpio).slice(0, 3).toUpperCase(),
    color: color || COLORES_TIENDA[0],
    orden: Math.max(...TIENDAS.map(t => t.orden), 0) + 1,
    activa: true
  };

  if (!datos.tiendasLocal) datos.tiendasLocal = { propias: [], ediciones: {} };
  datos.tiendasLocal.propias.push(tienda);
  avisar();
  return { ok: true, tienda };
}

export function editarTienda(id, cambios) {
  const t = TIENDA_POR_ID[id];
  if (!t) return { ok: false, error: 'Esa tienda no existe.' };

  if (cambios.nombre !== undefined) {
    const limpio = String(cambios.nombre).trim();
    if (!limpio) return { ok: false, error: 'El nombre no puede quedar vacío.' };
    cambios.nombre = limpio;
  }

  const propia = datos.tiendasLocal.propias.find(x => x.id === id);
  if (propia) {
    Object.assign(propia, cambios);
  } else {
    datos.tiendasLocal.ediciones[id] = {
      ...(datos.tiendasLocal.ediciones[id] || {}), ...cambios
    };
  }
  avisar();
  return { ok: true };
}

/* Desactivar en vez de borrar: los tickets antiguos siguen
   necesitando resolver el nombre de la tienda */
export function activarTienda(id, activa) {
  return editarTienda(id, { activa: !!activa });
}

export function seUsaTienda(id) {
  const enTickets = datos.tickets.some(t => t.tienda === id);
  const enPrecios = Object.values(datos.preciosLocal)
    .some(p => p && id in p);
  const enPrefs = Object.values(datos.prefTienda)
    .some(v => Array.isArray(v) ? v.includes(id) : v === id);
  return enTickets || enPrecios || enPrefs;
}

export function borrarTienda(id) {
  const propia = datos.tiendasLocal.propias.some(x => x.id === id);
  if (!propia) return { ok: false, error: 'Las de serie solo se desactivan.' };
  if (seUsaTienda(id)) {
    return { ok: false, error: 'Ya se ha usado. Desactívala en vez de borrarla.' };
  }
  datos.tiendasLocal.propias = datos.tiendasLocal.propias.filter(x => x.id !== id);
  avisar();
  return { ok: true };
}

export function moverTienda(id, direccion) {
  const activas = [...TIENDAS].sort((a, b) => a.orden - b.orden);
  const i = activas.findIndex(t => t.id === id);
  const j = i + direccion;
  if (i < 0 || j < 0 || j >= activas.length) return;

  /* Se reescriben todos los órdenes para que queden 1..n sin
     huecos y sin empates */
  [activas[i], activas[j]] = [activas[j], activas[i]];
  activas.forEach((t, k) => {
    const propia = datos.tiendasLocal.propias.find(x => x.id === t.id);
    if (propia) propia.orden = k + 1;
    else {
      datos.tiendasLocal.ediciones[t.id] = {
        ...(datos.tiendasLocal.ediciones[t.id] || {}), orden: k + 1
      };
    }
  });
  avisar();
}
