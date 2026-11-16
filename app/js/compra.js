/* ============================================================
   COMPRA — el modo comprador y el ticket resultante
   ------------------------------------------------------------
   Una compra es una lista congelada en el momento de recibirla,
   más lo que va pasando en el supermercado: qué se ha cogido ya,
   a qué precio y qué ha caído en el carro sin estar previsto.

   Se guarda con una FIRMA: el texto codificado del enlace. Si
   llega un enlace distinto al que hay a medias, la app pregunta
   antes de tirar el progreso. Si es el mismo enlace, se retoma
   donde se dejó (cerrar la app en mitad del súper no borra nada).
   ============================================================ */

import { nuevoId } from './util.js?v=29';
import { POR_ID } from './estado.js?v=29';
import { aprenderDeTicket, preciosDe } from './precios.js?v=29';
import { recordarTienda } from './ruta.js?v=29';
import { registrarPendientes } from './gastos.js?v=29';
import { datos, guardar } from './almacen.js?v=29';
const oyentes = new Set();

export function suscribirCompra(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

function avisar() {
  guardar();
  oyentes.forEach(fn => fn(datos.compra));
}

export function compraActual() { return datos.compra; }
export function tickets() { return datos.tickets; }

/* ---------- crear ---------- */

export function crearCompra(lista, libres, firma, urgencias = {}, nombre = '') {
  const lineas = [];

  for (const [id, cant] of Object.entries(lista)) {
    const p = POR_ID[id];
    if (!p || p.a) continue;
    lineas.push({
      k: 'p', id: p.id, n: p.n, c: p.c, e: p.e || '',
      urg: urgencias[id] || null,
      cant, hecho: false, precio: null
    });
  }

  for (const texto of libres) {
    lineas.push({
      k: 'l', n: texto, c: null, e: '✏️',
      cant: 1, hecho: false, precio: null
    });
  }

  datos.compra = {
    firma,
    nombre: nombre || '',
    fecha: new Date().toISOString(),
    tienda: null,
    pago: 'tarjeta',
    lineas
  };
  avisar();
  return datos.compra;
}

export function descartarCompra() {
  datos.compra = null;
  avisar();
}

/* ---------- durante la compra ---------- */

export function alternarHecho(i) {
  const l = datos.compra?.lineas[i];
  if (!l) return;
  l.hecho = !l.hecho;
  /* Si se desmarca, el precio deja de tener sentido */
  if (!l.hecho) l.precio = null;
  avisar();
}

/* Descuento aplicado a una línea. Se guarda aparte del precio
   para poder decir cuánto se ha ahorrado: si se restara del
   precio, esa información se perdería. */
export function fijarDescuento(i, valor) {
  const l = datos.compra?.lineas[i];
  if (!l) return;
  const n = parseFloat(String(valor).replace(',', '.'));
  l.desc = Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
  if (!l.desc) delete l.desc;
  avisar();
}

export function totalDescuento() {
  return (datos.compra?.lineas || [])
    .filter(l => l.hecho && l.desc)
    .reduce((a, l) => a + l.desc, 0);
}

export function fijarPrecio(i, valor) {
  const l = datos.compra?.lineas[i];
  if (!l) return;
  const n = parseFloat(String(valor).replace(',', '.'));
  l.precio = Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  /* Escribirlo a mano lo convierte en dato confirmado */
  delete l.estimado;
  avisar();
}

export function cambiarCantidad(i, delta) {
  const l = datos.compra?.lineas[i];
  if (!l) return;
  const antes = l.cant;
  l.cant = Math.max(1, Math.min(99, l.cant + delta));
  /* Si el precio era una estimación, se recalcula con la
     cantidad nueva. Si era escrito a mano, no se toca. */
  if (l.estimado && l.precio != null && antes) {
    l.precio = Math.round(l.precio / antes * l.cant * 100) / 100;
  }
  avisar();
}

export function anadirExtra(texto) {
  const limpio = texto.trim();
  if (!limpio || !datos.compra) return false;
  datos.compra.lineas.push({
    k: 'x', n: limpio, c: null, e: '🛒',
    cant: 1, hecho: true, precio: null
  });
  avisar();
  return true;
}

export function quitarLinea(i) {
  datos.compra?.lineas.splice(i, 1);
  avisar();
}

export function fijarTienda(id) {
  if (!datos.compra) return;
  datos.compra.tienda = id;
  if (id) recordarTienda(id);                 // la última tienda se recuerda
  delete datos.compra.tiendaTexto;
  rellenarPreciosDe(id);
  avisar();
}

/* ------------------------------------------------------------
   UN SITIO SUELTO

   A veces compras en un sitio al que no vas nunca más. Crear una
   tienda para eso ensucia la lista de supermercados para
   siempre, así que se guarda solo el nombre dentro de la compra.

   No genera precios comparables (no hay tienda a la que
   asociarlos), pero sí queda en el ticket y en el historial. Si
   luego resulta que vuelves, se puede convertir en tienda de
   verdad desde el propio ticket.
   ------------------------------------------------------------ */
export function fijarTiendaSuelta(nombre) {
  if (!datos.compra) return;
  const limpio = String(nombre || '').trim().slice(0, 40);
  if (!limpio) return;
  datos.compra.tienda = null;
  datos.compra.tiendaTexto = limpio;
  /* Sin tienda conocida no hay precios que autorrellenar, así
     que se limpian los estimados que hubiera */
  for (const l of datos.compra.lineas) {
    if (l.estimado) { l.precio = null; delete l.estimado; }
  }
  avisar();
}

export function fijarPago(modo) {
  if (datos.compra) { datos.compra.pago = modo; avisar(); }
}

/* ------------------------------------------------------------
   AUTORRELLENO AL ELEGIR SUPERMERCADO

   Al decir dónde estás comprando, cada línea coge el precio que
   ya conoces de esa tienda. No es adivinar: es lo que pagaste la
   última vez ahí.

   Solo se rellenan las que están vacías. Un precio escrito a
   mano no se pisa nunca, porque es el de hoy y manda sobre
   cualquier dato anterior.

   Los rellenados quedan marcados como estimados para que se vean
   distintos: son una previsión, no un dato confirmado.
   ------------------------------------------------------------ */
function rellenarPreciosDe(idTienda) {
  const c = datos.compra;
  if (!c || !idTienda) return 0;
  let puestos = 0;

  for (const l of c.lineas) {
    if (l.k !== 'p') continue;
    if (l.precio != null && !l.estimado) continue;

    const fila = preciosDe(l.id).find(f => f.tienda === idTienda && f.formato != null);
    if (!fila) {
      if (l.estimado) { l.precio = null; delete l.estimado; }
      continue;
    }
    l.precio = Math.round(fila.formato * l.cant * 100) / 100;
    l.estimado = true;
    puestos++;
  }
  return puestos;
}

export function cuantosEstimados() {
  return (datos.compra?.lineas || []).filter(l => l.estimado).length;
}

/* ---------- cuentas ---------- */

export function progreso() {
  const l = datos.compra?.lineas || [];
  const hechos = l.filter(x => x.hecho).length;
  return {
    hechos, total: l.length,
    pct: l.length ? Math.round(hechos / l.length * 100) : 0
  };
}

/* Lo que llevas de verdad en el carro */
export function total() {
  return (datos.compra?.lineas || [])
    .filter(l => l.hecho && l.precio != null)
    .reduce((a, l) => a + l.precio, 0);
}

/* Lo que va a costar la compra entera, contando también lo que
   todavía no has cogido pero cuyo precio se conoce de esta
   tienda. Es la cifra útil mientras recorres los pasillos. */
export function previsto() {
  return (datos.compra?.lineas || [])
    .filter(l => l.precio != null)
    .reduce((a, l) => a + l.precio, 0);
}

/* Cuántas cosas cogidas se han quedado sin precio. Se avisa al
   finalizar porque el total saldría corto sin explicación. */
export function sinPrecio() {
  return (datos.compra?.lineas || [])
    .filter(l => l.hecho && l.precio == null).length;
}

/* ---------- finalizar ---------- */

export function finalizar() {
  const c = datos.compra;
  if (!c) return null;

  const cogidas = c.lineas.filter(l => l.hecho);

  const ticket = {
    v: 1,
    id: nuevoId('t'),
    fecha: new Date().toISOString(),
    inicio: c.fecha,
    tienda: c.tienda,
    tiendaTexto: c.tiendaTexto || undefined,
    pago: c.pago || 'tarjeta',
    total: Math.round(total() * 100) / 100,
    descuento: Math.round(totalDescuento() * 100) / 100,
    lineas: cogidas.map(l => ({
      id: l.k === 'p' ? l.id : null,
      n: l.n,
      c: l.c,
      cant: l.cant,
      precio: l.precio,
      desc: l.desc || undefined,
      estimado: !!l.estimado,   // precio previsto, no confirmado
      nuevo: l.k === 'x'        // no estaba en el catálogo ni en la lista
    })),
    noCogidas: c.lineas.filter(l => !l.hecho).map(l => l.n)
  };

  datos.tickets.unshift(ticket);
  datos.compra = null;

  /* Lo pagado de verdad actualiza la base de precios sin que
     haya que escribir nada a mano. Es la forma más fiable de
     mantener los precios al día: el ticket no se equivoca. */
  ticket.aprendidos = aprenderDeTicket(ticket);

  /* Lo comprado sin estar en el catálogo va a la bandeja de
     pendientes, para no perderlo de vista */
  ticket.nuevos = registrarPendientes(ticket);

  avisar();
  return ticket;
}

export function ticketPorId(id) {
  return datos.tickets.find(t => t.id === id) || null;
}

/* ---------- formatos de salida ---------- */

export function ticketJSON(t) {
  return JSON.stringify(t);
}

export function ticketTexto(t, nombreTienda) {
  const fecha = new Date(t.fecha).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const linea = l => {
    const cant = l.cant > 1 ? ` x${l.cant}` : '';
    const precio = l.precio != null
      ? l.precio.toFixed(2).replace('.', ',') + ' €'
      : 's/p';
    return `${l.n}${cant} — ${precio}`;
  };
  const partes = [
    'COMPRA',
    nombreTienda ? `${nombreTienda} · ${fecha}` : fecha,
    '',
    ...t.lineas.map(linea),
    '',
    `TOTAL  ${t.total.toFixed(2).replace('.', ',')} €`
  ];
  if (t.descuento > 0) {
    partes.push(`Ahorrado  ${t.descuento.toFixed(2).replace('.', ',')} €`);
  }
  if (t.noCogidas.length) {
    partes.push('', 'Sin coger: ' + t.noCogidas.join(', '));
  }
  return partes.join('\n');
}
