/* ============================================================
   COPIA DE DATOS
   ------------------------------------------------------------
   Tres operaciones, con filosofías distintas a propósito:

   EXPORTAR   se lleva todo: tickets, precios, catálogo propio,
              tiendas, pendientes y preferencias.

   IMPORTAR   FUSIONA en vez de sustituir. Lo que ya existe se
              sobrescribe con lo que llega; lo que no, se añade;
              y lo que había y no viene en el archivo se queda.
              Así se puede ir volcando el móvil al ordenador cada
              cierto tiempo sin perder nada de lo anterior.

   LIMPIAR    borra todo lo del dispositivo. Nunca se ofrece sin
              haber puesto delante el botón de exportar.
   ============================================================ */

import { datos, guardar, borrarTodo } from './almacen.js?v=25';
import { reconstruirCatalogo, POR_ID } from './estado.js?v=25';
import { reconstruirTiendas, TIENDA_POR_ID } from './tiendas.js?v=25';
import { CATALOGO_VERSION } from '../datos/catalogo.js?v=25';

export const FORMATO = 'lista-compra-luckstudio-copia';

const oyentes = new Set();
export function suscribirDatos(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
function avisar() {
  reconstruirTiendas();
  reconstruirCatalogo();
  guardar();
  oyentes.forEach(fn => fn());
}

/* ---------- exportar ---------- */

export function copiaCompleta() {
  return {
    formato: FORMATO,
    version: 1,
    exportado: new Date().toISOString(),
    schema: datos.schema,
    catalogoVersion: CATALOGO_VERSION,

    resumen: {
      tickets: datos.tickets.length,
      gastoTotal: Math.round(
        datos.tickets.reduce((a, t) => a + (t.total || 0), 0) * 100) / 100,
      primerTicket: fechaExtrema(datos.tickets, 'min'),
      ultimoTicket: fechaExtrema(datos.tickets, 'max'),
      productosConPrecio: Object.keys(datos.preciosLocal).length,
      productosPropios: datos.catalogoLocal?.nuevos?.length || 0,
      tiendasPropias: datos.tiendasLocal?.propias?.length || 0,
      pendientes: datos.pendientes.length,
      rutas: Object.keys(datos.rutas || {}).length,
      textosDeTicket: Object.values(datos.alias || {}).reduce((a, t) => a + Object.keys(t).length, 0)
    },

    tickets: datos.tickets,
    preciosLocal: datos.preciosLocal,
    prefTienda: datos.prefTienda,
    catalogoLocal: datos.catalogoLocal,
    tiendasLocal: datos.tiendasLocal,
    pendientes: datos.pendientes,
    rutas: datos.rutas,
    alias: datos.alias,
    ajustes: datos.ajustes
  };
}

function fechaExtrema(tickets, modo) {
  if (!tickets.length) return null;
  const fechas = tickets.map(t => t.fecha).sort();
  return modo === 'min' ? fechas[0] : fechas[fechas.length - 1];
}

export function copiaTexto() {
  return JSON.stringify(copiaCompleta(), null, 2);
}

/* ---------- exportar a hoja de cálculo ---------- */

/* CSV con una fila por línea de ticket: es el formato que
   entiende cualquier hoja de cálculo sin preguntar nada.
   Separador de punto y coma y decimales con coma, que es lo
   que espera Excel en español. */
export function csvTickets() {
  const cab = ['Fecha', 'Hora', 'Supermercado', 'Pago', 'Categoria',
               'Producto', 'Cantidad', 'Precio', 'Estimado', 'TicketId'];

  const filas = [cab.join(';')];

  for (const t of [...datos.tickets].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const d = new Date(t.fecha);
    const fecha = d.toLocaleDateString('es-ES');
    const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const tienda = t.tienda ? (TIENDA_POR_ID[t.tienda]?.nombre || t.tienda) : '';
    const pago = t.pago === 'efectivo' ? 'Metálico' : 'Tarjeta';

    for (const l of t.lineas) {
      const cat = l.id ? (POR_ID[l.id]?.c || '') : (l.c || '');
      filas.push([
        fecha, hora, tienda, pago, cat,
        escapar(l.n),
        l.cant || 1,
        l.precio != null ? String(l.precio).replace('.', ',') : '',
        l.estimado ? 'Sí' : 'No',
        t.id
      ].join(';'));
    }
  }

  /* El BOM hace que Excel abra los acentos bien al primer intento */
  return '\uFEFF' + filas.join('\r\n');
}

export function csvPrecios() {
  const cab = ['Producto', 'Categoria', 'Supermercado', 'Precio',
               'Formato', 'Unidad', 'PrecioBase', 'Fecha'];
  const filas = [cab.join(';')];

  for (const [id, porTienda] of Object.entries(datos.preciosLocal)) {
    const p = POR_ID[id];
    if (!p) continue;
    for (const [tienda, dato] of Object.entries(porTienda || {})) {
      filas.push([
        escapar(p.n), p.c,
        TIENDA_POR_ID[tienda]?.nombre || tienda,
        dato.f != null ? String(dato.f).replace('.', ',') : '',
        dato.q ?? '', dato.u ?? '',
        dato.b != null ? String(dato.b).replace('.', ',') : '',
        dato.d ?? ''
      ].join(';'));
    }
  }
  return '\uFEFF' + filas.join('\r\n');
}

function escapar(txt) {
  return String(txt).replace(/;/g, ',').replace(/[\r\n]+/g, ' ');
}

/* ---------- descarga como archivo ---------- */

export function descargar(nombre, contenido, tipo = 'application/json') {
  const blob = new Blob([contenido], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function nombreArchivo(extension) {
  const d = new Date();
  const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `compra-${f}.${extension}`;
}

/* ---------- importar fusionando ---------- */

export function validarCopia(texto) {
  let c;
  try { c = JSON.parse(String(texto).trim()); }
  catch { return { ok: false, error: 'Eso no es una copia válida.' }; }

  if (!c || typeof c !== 'object') {
    return { ok: false, error: 'El contenido no tiene forma de copia.' };
  }
  /* Se aceptan también las instantáneas del editor de catálogo */
  const esCopia = c.formato === FORMATO;
  const esSnapshot = c.app === 'lista-compra-luckstudio';
  if (!esCopia && !esSnapshot) {
    return { ok: false, error: 'Esa copia no es de esta aplicación.' };
  }
  return { ok: true, copia: c, tipo: esCopia ? 'copia' : 'snapshot' };
}

/* Las copias vienen de fuera: una clave como «__proto__» usada para
   indexar un objeto alteraría los objetos internos de la app. */
const PELIGROSAS = new Set(['__proto__', 'constructor', 'prototype']);
const segura = k => typeof k === 'string' && k && !PELIGROSAS.has(k);
const propio = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export function fusionar(copia) {
  const informe = {
    ticketsNuevos: 0, ticketsActualizados: 0,
    precios: 0, productos: 0, tiendas: 0, pendientes: 0
  };

  /* --- tiendas propias, primero: todo lo demás apunta a sus ids --- */
  if (copia.tiendasLocal?.propias) {
    if (!datos.tiendasLocal) datos.tiendasLocal = { propias: [], ediciones: {} };
    for (const t of copia.tiendasLocal.propias) {
      if (!t?.id || !t?.nombre) continue;
      const i = datos.tiendasLocal.propias.findIndex(x => x.id === t.id);
      if (i >= 0) datos.tiendasLocal.propias[i] = t;
      else { datos.tiendasLocal.propias.push(t); informe.tiendas++; }
    }
    Object.assign(datos.tiendasLocal.ediciones, copia.tiendasLocal.ediciones || {});
  }

  /* --- productos propios --- */
  if (copia.catalogoLocal?.nuevos) {
    if (!datos.catalogoLocal) datos.catalogoLocal = { ediciones: {}, nuevos: [] };
    for (const p of copia.catalogoLocal.nuevos) {
      if (!Number.isFinite(p?.id)) continue;
      const i = datos.catalogoLocal.nuevos.findIndex(x => x.id === p.id);
      if (i >= 0) datos.catalogoLocal.nuevos[i] = p;
      else { datos.catalogoLocal.nuevos.push(p); informe.productos++; }
    }
    Object.assign(datos.catalogoLocal.ediciones, copia.catalogoLocal.ediciones || {});
  }

  /* --- tickets: el id manda --- */
  if (Array.isArray(copia.tickets)) {
    for (const t of copia.tickets) {
      if (!t?.id || !Array.isArray(t.lineas)) continue;
      const i = datos.tickets.findIndex(x => x.id === t.id);
      if (i >= 0) { datos.tickets[i] = t; informe.ticketsActualizados++; }
      else { datos.tickets.push(t); informe.ticketsNuevos++; }
    }
    datos.tickets.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  /* --- precios: gana el dato más reciente, no el que llega --- */
  for (const [id, porTienda] of Object.entries(copia.preciosLocal || {})) {
    if (!segura(id)) continue;
    if (!propio(datos.preciosLocal, id)) datos.preciosLocal[id] = {};
    for (const [tienda, dato] of Object.entries(porTienda || {})) {
      if (!segura(tienda)) continue;
      const actual = datos.preciosLocal[id][tienda];
      const masNuevo = !actual || !actual.d || (dato.d && dato.d >= actual.d);
      if (masNuevo) { datos.preciosLocal[id][tienda] = dato; informe.precios++; }
    }
  }

  /* --- preferencias: se sobrescriben --- */
  for (const [id, pref] of Object.entries(copia.prefTienda || {})) {
    if (!segura(id)) continue;
    datos.prefTienda[id] = Array.isArray(pref) ? pref : [pref].filter(Boolean);
  }

  /* --- rutas de tienda: la de la copia sustituye a la propia --- */
  for (const [tienda, ruta] of Object.entries(copia.rutas || {})) {
    if (!segura(tienda) || !Array.isArray(ruta?.orden)) continue;
    datos.rutas ??= {};
    datos.rutas[tienda] = {
      orden: ruta.orden.filter(x => typeof x === 'string'),
      ocultas: (ruta.ocultas || []).filter(x => typeof x === 'string')
    };
    informe.rutas = (informe.rutas || 0) + 1;
  }

  /* --- textos de ticket: se suman; si chocan, gana la copia --- */
  for (const [cadena, tabla] of Object.entries(copia.alias || {})) {
    if (!segura(cadena) || !tabla || typeof tabla !== 'object') continue;
    datos.alias ??= {};
    if (!propio(datos.alias, cadena)) datos.alias[cadena] = {};
    for (const [texto, id] of Object.entries(tabla)) {
      if (!segura(texto) || !Number.isFinite(id)) continue;
      datos.alias[cadena][texto] = id;
      informe.alias = (informe.alias || 0) + 1;
    }
  }

  /* --- pendientes: se suman las apariciones --- */
  for (const p of copia.pendientes || []) {
    if (!p?.clave) continue;
    const ficha = datos.pendientes.find(x => x.clave === p.clave);
    if (ficha) {
      ficha.veces = Math.max(ficha.veces, p.veces || 1);
      if (p.ultima && (!ficha.ultima || p.ultima > ficha.ultima)) ficha.ultima = p.ultima;
      for (const t of p.tiendas || []) {
        if (!ficha.tiendas.includes(t)) ficha.tiendas.push(t);
      }
    } else { datos.pendientes.push(p); informe.pendientes++; }
  }

  avisar();
  return informe;
}

/* ---------- borrado ---------- */

export function limpiarTodo() {
  borrarTodo();
  /* Se recarga para arrancar de cero sin estados a medias */
  location.reload();
}

/* Cuántos datos hay ahora mismo, para el aviso de borrado */
export function cuantoHay() {
  return {
    tickets: datos.tickets.length,
    precios: Object.values(datos.preciosLocal)
      .reduce((a, p) => a + Object.keys(p || {}).length, 0),
    productos: datos.catalogoLocal?.nuevos?.length || 0,
    tiendas: datos.tiendasLocal?.propias?.length || 0,
    gasto: Math.round(
      datos.tickets.reduce((a, t) => a + (t.total || 0), 0) * 100) / 100
  };
}
