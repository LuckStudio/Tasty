/* ============================================================
   ESTADÍSTICAS
   ------------------------------------------------------------
   Todo se calcula sobre los tickets. No se guarda ningún dato
   agregado: si borras una compra, las cifras se recalculan al
   momento y no queda ningún residuo cuadrando mal.

   Una nota importante sobre la evolución de precios: NO hace
   falta guardar un histórico aparte. Cada ticket ya lleva fecha,
   supermercado y lo pagado por cada producto. El histórico está
   ahí desde el primer día, solo hay que leerlo.
   ============================================================ */

import { datos } from './almacen.js?v=24';
import { POR_ID } from './estado.js?v=24';
import { CAT_POR_ID, CATEGORIAS } from '../datos/categorias.js?v=24';
import { TIENDA_POR_ID } from './tiendas.js?v=24';

export const PERIODOS = [
  { id: 'mes',  nombre: 'Este mes',  meses: 0 },
  { id: 'tres', nombre: '3 meses',   meses: 3 },
  { id: 'anio', nombre: '12 meses',  meses: 12 },
  { id: 'todo', nombre: 'Todo',      meses: null }
];

const MESES_CORTOS = ['ene','feb','mar','abr','may','jun',
                      'jul','ago','sep','oct','nov','dic'];

export function claveMes(iso) { return iso.slice(0, 7); }

export function nombreMes(clave) {
  const [a, m] = clave.split('-');
  return `${MESES_CORTOS[+m - 1]} ${a.slice(2)}`;
}

/* ---------- filtro por periodo ---------- */

export function ticketsDe(periodo) {
  const todos = datos.tickets;
  if (periodo === 'todo') return todos;

  const ahora = new Date();

  if (periodo === 'mes') {
    const mes = ahora.toISOString().slice(0, 7);
    return todos.filter(t => t.fecha.slice(0, 7) === mes);
  }

  const def = PERIODOS.find(p => p.id === periodo);
  const desde = new Date(ahora);
  desde.setMonth(desde.getMonth() - (def?.meses ?? 12));
  const corte = desde.toISOString();
  return todos.filter(t => t.fecha >= corte);
}

/* ---------- cifras generales ---------- */

export function resumen(periodo) {
  const lista = ticketsDe(periodo);
  const total = lista.reduce((a, t) => a + (t.total || 0), 0);
  const articulos = lista.reduce((a, t) => a + t.lineas.length, 0);

  return {
    total: redondear(total),
    compras: lista.length,
    articulos,
    media: lista.length ? redondear(total / lista.length) : 0
  };
}

function redondear(n) { return Math.round(n * 100) / 100; }

/* ---------- gasto mes a mes ---------- */

/* Devuelve los últimos `cuantos` meses, incluidos los que no
   tienen ninguna compra: un hueco en la serie es información,
   no un mes que desaparece del gráfico. */
export function porMes(cuantos = 6) {
  const acumulado = new Map();
  for (const t of datos.tickets) {
    const k = claveMes(t.fecha);
    acumulado.set(k, (acumulado.get(k) || 0) + (t.total || 0));
  }

  const filas = [];
  const cursor = new Date();
  cursor.setDate(1);

  for (let i = 0; i < cuantos; i++) {
    const k = cursor.toISOString().slice(0, 7);
    filas.unshift({
      clave: k,
      nombre: nombreMes(k),
      total: redondear(acumulado.get(k) || 0)
    });
    cursor.setMonth(cursor.getMonth() - 1);
  }

  const techo = Math.max(...filas.map(f => f.total), 0);
  for (const f of filas) f.pct = techo ? Math.round(f.total / techo * 100) : 0;
  return filas;
}

/* ---------- repartos ---------- */

function reparto(lista, clavePara, nombrePara) {
  const acumulado = new Map();
  let total = 0;

  for (const t of lista) {
    for (const l of t.lineas) {
      if (l.precio == null) continue;
      const k = clavePara(l, t);
      acumulado.set(k, (acumulado.get(k) || 0) + l.precio);
      total += l.precio;
    }
  }

  const filas = [...acumulado.entries()]
    .map(([k, v]) => ({
      clave: k,
      nombre: nombrePara(k),
      total: redondear(v),
      pct: total ? Math.round(v / total * 100) : 0
    }))
    .sort((a, b) => b.total - a.total);

  return { filas, total: redondear(total) };
}

export function porCategoria(periodo) {
  return reparto(
    ticketsDe(periodo),
    l => (l.id ? POR_ID[l.id]?.c : l.c) || 'otros',
    k => CAT_POR_ID[k]?.nombre || 'Sin categoría'
  );
}

export function porTienda(periodo) {
  /* Los sitios puntuales cuentan con su propio nombre en vez de
     caer todos en el mismo saco de "sin supermercado" */
  const sueltos = new Map();
  for (const t of ticketsDe(periodo)) {
    if (!t.tienda && t.tiendaTexto) sueltos.set('~' + t.tiendaTexto, t.tiendaTexto);
  }

  return reparto(
    ticketsDe(periodo),
    (l, t) => t.tienda || (t.tiendaTexto ? '~' + t.tiendaTexto : 'libre'),
    k => sueltos.get(k) || TIENDA_POR_ID[k]?.nombre || 'Sin supermercado'
  );
}

/* ---------- productos que más pesan ---------- */

export function topProductos(periodo, cuantos = 10) {
  const acumulado = new Map();

  for (const t of ticketsDe(periodo)) {
    for (const l of t.lineas) {
      if (l.precio == null) continue;
      const k = l.id ? `p${l.id}` : `x${l.n.toLowerCase()}`;
      const ficha = acumulado.get(k) || {
        id: l.id, nombre: l.id ? POR_ID[l.id]?.n || l.n : l.n,
        total: 0, veces: 0, unidades: 0
      };
      ficha.total += l.precio;
      ficha.veces++;
      ficha.unidades += l.cant || 1;
      acumulado.set(k, ficha);
    }
  }

  const filas = [...acumulado.values()].sort((a, b) => b.total - a.total);
  const techo = filas[0]?.total || 0;

  return filas.slice(0, cuantos).map(f => ({
    ...f,
    total: redondear(f.total),
    pct: techo ? Math.round(f.total / techo * 100) : 0
  }));
}

/* ---------- evolución del precio de un producto ---------- */

/* El histórico sale de los tickets: fecha, tienda y precio
   unitario de cada vez que se compró. Ordenado de antiguo a
   reciente para poder dibujar la línea. */
export function historialPrecio(id) {
  const puntos = [];

  for (const t of datos.tickets) {
    for (const l of t.lineas) {
      if (l.id !== id || l.precio == null) continue;
      const cant = l.cant || 1;
      puntos.push({
        fecha: t.fecha,
        tienda: t.tienda,
        unitario: redondear(l.precio / cant)
      });
    }
  }

  puntos.sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (puntos.length > 1) {
    const primero = puntos[0].unitario;
    const ultimo = puntos[puntos.length - 1].unitario;
    puntos.variacion = primero > 0
      ? Math.round((ultimo / primero - 1) * 100) : null;
  }
  return puntos;
}

/* ---------- categorías sin usar ---------- */

/* Para saber si el reparto por categoría cubre el catálogo o hay
   zonas del súper de las que no se ha registrado nada */
export function categoriasSinDatos(periodo) {
  const usadas = new Set(porCategoria(periodo).filas.map(f => f.clave));
  return CATEGORIAS.filter(c => !usadas.has(c.id)).map(c => c.nombre);
}
