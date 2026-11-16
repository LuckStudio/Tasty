/* ============================================================
   GASTOS — tickets, importación y productos pendientes
   ------------------------------------------------------------
   Un ticket puede entrar de tres formas:

   1. Al finalizar una compra en el móvil (Fase 2)
   2. Pegando el JSON que manda quien fue a comprar
   3. Creándolo a mano, para las compras que no salieron de
      ninguna lista

   Todo lo que entra por aquí actualiza la base de precios y
   alimenta la bandeja de PENDIENTES: los productos que se han
   comprado sin estar en el catálogo. Cuando algo aparece varias
   veces, la app lo señala para que lo añadas.
   ============================================================ */

import { datos, guardar } from './almacen.js?v=21';
import { POR_ID, PRODUCTOS } from './estado.js?v=21';
import { aprenderDeTicket } from './precios.js?v=21';
import { nuevoId, normalizar } from './util.js?v=21';

/* A partir de cuántas apariciones se sugiere catalogar */
export const UMBRAL_SUGERENCIA = 3;

const oyentes = new Set();
export function suscribirGastos(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
function avisar() {
  guardar();
  oyentes.forEach(fn => fn());
}

/* ---------- pendientes de catalogar ---------- */

/* Se registra por nombre normalizado para que "Queso Azul" y
   "queso azul" cuenten como el mismo producto. */
export function registrarPendientes(ticket) {
  let nuevos = 0;

  for (const l of ticket.lineas) {
    if (l.id) continue;                       // ya está en el catálogo
    const clave = normalizar(l.n).trim();
    if (!clave) continue;

    /* Si el nombre coincide con un producto del catálogo, no es
       un pendiente: es que se escribió a mano por comodidad */
    const yaExiste = PRODUCTOS.some(p => normalizar(p.n) === clave);
    if (yaExiste) continue;

    const ficha = datos.pendientes.find(x => x.clave === clave);
    if (ficha) {
      ficha.veces++;
      ficha.ultima = ticket.fecha;
      if (ticket.tienda && !ficha.tiendas.includes(ticket.tienda)) {
        ficha.tiendas.push(ticket.tienda);
      }
      if (l.precio != null) ficha.precio = l.precio;
    } else {
      datos.pendientes.push({
        clave,
        nombre: l.n.trim(),
        veces: 1,
        ultima: ticket.fecha,
        precio: l.precio ?? null,
        tiendas: ticket.tienda ? [ticket.tienda] : []
      });
      nuevos++;
    }
  }

  if (nuevos || ticket.lineas.some(l => !l.id)) avisar();
  return nuevos;
}

export function pendientes() {
  return [...datos.pendientes].sort(
    (a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre, 'es')
  );
}

export function pendientesSugeridos() {
  return pendientes().filter(p => p.veces >= UMBRAL_SUGERENCIA);
}

export function descartarPendiente(clave) {
  const i = datos.pendientes.findIndex(x => x.clave === clave);
  if (i >= 0) { datos.pendientes.splice(i, 1); avisar(); }
}

/* ---------- tickets ---------- */

export function listaTickets() {
  return [...datos.tickets].sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function ticketPorId(id) {
  return datos.tickets.find(t => t.id === id) || null;
}

export function borrarTicket(id) {
  const i = datos.tickets.findIndex(t => t.id === id);
  if (i >= 0) { datos.tickets.splice(i, 1); avisar(); }
}

/* ---------- importación ---------- */

/* Comprueba que lo pegado es un ticket de esta app y no
   cualquier otra cosa. Devuelve { ok, ticket, error }. */
export function validarTicket(texto) {
  let datosTicket;
  try {
    datosTicket = JSON.parse(String(texto).trim());
  } catch {
    return { ok: false, error: 'Eso no es un ticket. Copia el texto entero, sin cortarlo.' };
  }

  if (!datosTicket || typeof datosTicket !== 'object') {
    return { ok: false, error: 'El contenido no tiene el formato de un ticket.' };
  }
  if (!Array.isArray(datosTicket.lineas)) {
    return { ok: false, error: 'Al ticket le faltan los productos.' };
  }
  if (datosTicket.v && datosTicket.v > 1) {
    return { ok: false, error: 'Este ticket viene de una versión más nueva de la app.' };
  }

  /* Se reconstruye limpio: nunca se guarda tal cual lo pegado */
  const ticket = {
    v: 1,
    id: typeof datosTicket.id === 'string' ? datosTicket.id : nuevoId('t'),
    fecha: fechaValida(datosTicket.fecha) || new Date().toISOString(),
    tienda: typeof datosTicket.tienda === 'string' ? datosTicket.tienda : null,
    lineas: [],
    noCogidas: Array.isArray(datosTicket.noCogidas)
      ? datosTicket.noCogidas.filter(x => typeof x === 'string') : []
  };

  for (const l of datosTicket.lineas) {
    if (!l || typeof l.n !== 'string') continue;
    const id = Number.isFinite(l.id) && POR_ID[l.id] ? l.id : null;
    ticket.lineas.push({
      id,
      n: l.n.trim(),
      c: id ? POR_ID[id].c : (typeof l.c === 'string' ? l.c : null),
      cant: Math.max(1, Math.min(999, parseInt(l.cant, 10) || 1)),
      precio: Number.isFinite(l.precio) ? Math.round(l.precio * 100) / 100 : null,
      nuevo: !!l.nuevo || !id
    });
  }

  if (!ticket.lineas.length) {
    return { ok: false, error: 'El ticket no tiene ningún producto.' };
  }

  /* El total se recalcula siempre a partir de las líneas: nunca
     se cree el que venga en el JSON. El precio de una línea es
     lo pagado por esa línea entera, no el unitario. */
  ticket.total = Math.round(
    ticket.lineas.reduce((a, l) => a + (l.precio ?? 0), 0) * 100
  ) / 100;

  return { ok: true, ticket };
}

function fechaValida(v) {
  if (typeof v !== 'string') return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/* Añade un ticket ya validado. Devuelve qué ha pasado. */
export function importarTicket(ticket) {
  const repetido = datos.tickets.some(t => t.id === ticket.id);
  if (repetido) {
    return { ok: false, error: 'Este ticket ya estaba importado.' };
  }

  datos.tickets.unshift(ticket);
  const aprendidos = aprenderDeTicket(ticket);
  const nuevos = registrarPendientes(ticket);
  avisar();

  return { ok: true, aprendidos, nuevos, ticket };
}

/* ---------- editar un ticket existente ---------- */

/* Se reescribe entero en su sitio, conservando el id y la fecha
   original salvo que se cambien. Un ticket editado vuelve a
   alimentar la base de precios y la bandeja de pendientes. */
export function actualizarTicket(id, { tienda, fecha, pago, lineas }) {
  const i = datos.tickets.findIndex(t => t.id === id);
  if (i < 0) return { ok: false, error: 'Ese ticket ya no está.' };

  const limpias = (lineas || [])
    .filter(l => l.n && String(l.n).trim())
    .map(l => ({
      id: l.id ?? null,
      n: String(l.n).trim(),
      c: l.id ? POR_ID[l.id]?.c ?? null : (l.c ?? null),
      cant: Math.max(1, parseInt(l.cant, 10) || 1),
      precio: Number.isFinite(l.precio) ? Math.round(l.precio * 100) / 100 : null,
      estimado: false,        // al editarlo a mano deja de ser estimación
      nuevo: !l.id
    }));

  if (!limpias.length) return { ok: false, error: 'Deja al menos un producto.' };

  const anterior = datos.tickets[i];
  const ticket = {
    ...anterior,
    tienda: tienda || null,
    pago: pago || anterior.pago || 'tarjeta',
    fecha: fecha
      ? new Date(fecha + 'T' + (anterior.fecha.slice(11, 16) || '12:00')).toISOString()
      : anterior.fecha,
    total: Math.round(limpias.reduce((a, l) => a + (l.precio ?? 0), 0) * 100) / 100,
    lineas: limpias,
    editado: new Date().toISOString()
  };

  datos.tickets[i] = ticket;
  const aprendidos = aprenderDeTicket(ticket);
  const nuevos = registrarPendientes(ticket);
  avisar();

  return { ok: true, ticket, aprendidos, nuevos };
}

/* ---------- crear un ticket a mano ---------- */

export function crearTicketManual({ tienda, fecha, lineas }) {
  const limpias = lineas
    .filter(l => l.n && l.n.trim())
    .map(l => ({
      id: l.id ?? null,
      n: l.n.trim(),
      c: l.id ? POR_ID[l.id]?.c ?? null : null,
      cant: Math.max(1, parseInt(l.cant, 10) || 1),
      precio: Number.isFinite(l.precio) ? Math.round(l.precio * 100) / 100 : null,
      nuevo: !l.id
    }));

  if (!limpias.length) return { ok: false, error: 'Añade al menos un producto.' };

  const ticket = {
    v: 1,
    id: nuevoId('t'),
    fecha: fecha ? new Date(fecha + 'T12:00:00').toISOString() : new Date().toISOString(),
    tienda: tienda || null,
    total: Math.round(limpias.reduce((a, l) => a + (l.precio ?? 0), 0) * 100) / 100,
    lineas: limpias,
    noCogidas: []
  };

  datos.tickets.unshift(ticket);
  const aprendidos = aprenderDeTicket(ticket);
  const nuevos = registrarPendientes(ticket);
  avisar();

  return { ok: true, ticket, aprendidos, nuevos };
}

/* Busca productos del catálogo para el buscador del editor */
export function buscarProductos(texto, limite = 8) {
  const q = normalizar(texto.trim());
  if (!q) return [];
  return PRODUCTOS
    .filter(p => normalizar(p.n).includes(q))
    .slice(0, limite);
}

/* ---------- resumen para la cabecera ---------- */

export function resumenGasto() {
  const ahora = new Date();
  const mes = ahora.toISOString().slice(0, 7);

  const delMes = datos.tickets.filter(t => t.fecha.slice(0, 7) === mes);
  const total = delMes.reduce((a, t) => a + (t.total || 0), 0);

  return {
    mes,
    total: Math.round(total * 100) / 100,
    compras: delMes.length,
    historico: datos.tickets.length
  };
}
