/* ============================================================
   PRECIOS — motor de comparación entre supermercados
   ------------------------------------------------------------
   Cada precio guarda DOS cifras, y las dos importan:

     PRECIO DE FORMATO   lo que pagas de verdad en caja
                         1,29 € por una bolsa de 200 g
                         → sirve para calcular el PRESUPUESTO

     PRECIO BASE         lo mismo llevado a la unidad del
                         producto: 6,45 €/kg
                         → sirve para COMPARAR entre tiendas

   El precio base no se escribe nunca a mano: se calcula solo a
   partir del precio y del formato. Escribes 1,29 € y "200 g" y
   el €/kg sale solo.

   DÓNDE VIVEN
     Capa horneada  campo `p` de cada producto en catalogo.js
     Capa local     lo que editas en el móvil, en localStorage

   La capa local manda sobre la horneada. Al exportar para
   regenerar el catálogo se consolidan las dos.
   ============================================================ */

import { datos, guardar } from './almacen.js?v=37';
import { POR_ID, PRODUCTOS } from './estado.js?v=37';
import { TIENDAS, TIENDA_POR_ID, favoritas, hayFavoritas }
  from './tiendas.js?v=37';
import { baseDeLinea } from './historial.js?v=37';
import { aBase } from './unidades.js?v=37';

/* Un precio se considera viejo pasados estos días. No se borra,
   se muestra atenuado: un dato viejo sigue siendo mejor que
   ninguno, pero no debe engañar. */
export const DIAS_VIEJO = 60;

/* Formatos de venta por unidad base del producto.
   `factor` convierte la cantidad a la unidad base. */
export const FORMATOS = {
  kg: [{ id: 'g',  nombre: 'g',  factor: 0.001 },
       { id: 'kg', nombre: 'kg', factor: 1 }],
  l:  [{ id: 'ml', nombre: 'ml', factor: 0.001 },
       { id: 'l',  nombre: 'L',  factor: 1 }],
  ud: [{ id: 'ud', nombre: 'ud', factor: 1 }]
};

export const NOMBRE_BASE = { kg: '€/kg', l: '€/L', ud: '€/ud' };
export const SUFIJO_BASE = { kg: '/kg', l: '/L', ud: '/ud' };

/* "1,78 €/kg" — sin espacio antes de la barra */
export function formatoBase(valor, unidadBase) {
  if (valor == null) return null;
  return valor.toFixed(2).replace('.', ',') + ' €' + (SUFIJO_BASE[unidadBase] || '');
}

const oyentes = new Set();
export function suscribirPrecios(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
function avisar() {
  guardar();
  oyentes.forEach(fn => fn());
}

/* ---------- cálculo ---------- */

/* De precio + formato al precio por unidad base.
   1,29 € en bolsa de 200 g, unidad base kg → 6,45 €/kg */
export function calcularBase(precio, cantidad, unidadFormato, unidadBase) {
  const lista = FORMATOS[unidadBase] || FORMATOS.ud;
  const f = lista.find(x => x.id === unidadFormato);
  if (!f || !(cantidad > 0) || !(precio >= 0)) return null;
  const enBase = cantidad * f.factor;
  if (!enBase) return null;
  return Math.round(precio / enBase * 100) / 100;
}

export function aNumero(valor) {
  const n = parseFloat(String(valor).replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
}

/* ---------- lectura ---------- */

/* Todos los precios conocidos de un producto, de más barato a
   más caro por precio base, con el porcentaje de diferencia
   respecto al más barato. */
export function preciosDe(id) {
  const p = POR_ID[id];
  if (!p) return [];

  const horneados = p.p || {};
  const locales = datos.preciosLocal[id] || {};
  const tiendas = new Set([...Object.keys(horneados), ...Object.keys(locales)]);

  const filas = [];
  for (const t of tiendas) {
    const dato = { ...horneados[t], ...locales[t] };   // lo local manda
    if (dato.b == null && dato.f == null) continue;
    filas.push({
      tienda: t,
      formato: dato.f ?? null,        // lo que pagas
      base: dato.b ?? null,           // lo comparable
      cantidad: dato.q ?? null,
      unidad: dato.u ?? null,
      fecha: dato.d ?? null,
      local: t in locales,
      viejo: esViejo(dato.d)
    });
  }

  filas.sort((a, b) => (a.base ?? Infinity) - (b.base ?? Infinity));

  const barato = filas.find(f => f.base != null)?.base;
  for (const f of filas) {
    f.masBarato = barato != null && f.base === barato;
    f.diferencia = (barato && f.base != null && barato > 0)
      ? Math.round((f.base / barato - 1) * 100)
      : null;
  }
  return filas;
}

function esViejo(fecha) {
  if (!fecha) return false;
  const dias = (Date.now() - new Date(fecha).getTime()) / 86400000;
  return dias > DIAS_VIEJO;
}

export function tienePrecio(id) {
  return preciosDe(id).length > 0;
}

/* ---------- tienda preferida ---------- */

/* ------------------------------------------------------------
   DÓNDE COMPRAR CADA PRODUCTO

   La preferencia es una LISTA ORDENADA, no un solo sitio:
   el primero es a donde quieres ir, y los siguientes son el
   plan B por si está cerrado o no queda.
   ------------------------------------------------------------ */

export function preferencias(id) {
  const guardadas = datos.prefTienda[id];
  if (Array.isArray(guardadas)) return guardadas.filter(t => TIENDA_POR_ID[t]);
  if (id in datos.prefTienda && guardadas) return [guardadas];
  const horneada = POR_ID[id]?.t;
  return horneada ? [horneada] : [];
}

/* La principal, que es la que manda para agrupar y presupuestar */
export function tiendaPreferida(id) {
  return preferencias(id)[0] || null;
}

export function planB(id) {
  return preferencias(id).slice(1);
}

export function fijarPreferencias(id, lista) {
  const limpia = [...new Set((lista || []).filter(t => t && TIENDA_POR_ID[t]))];
  if (limpia.length) datos.prefTienda[id] = limpia;
  else delete datos.prefTienda[id];
  avisar();
}

/* Añade o quita una tienda de la lista. Si ya estaba y era la
   principal, se quita; si estaba pero no era la primera, sube a
   principal. Un solo gesto para todo. */
export function alternarPreferencia(id, tienda) {
  const actual = preferencias(id);
  const i = actual.indexOf(tienda);

  if (i === 0) fijarPreferencias(id, actual.slice(1));
  else if (i > 0) fijarPreferencias(id, [tienda, ...actual.filter(t => t !== tienda)]);
  else fijarPreferencias(id, [...actual, tienda]);
}

export function moverPreferencia(id, tienda, direccion) {
  const lista = [...preferencias(id)];
  const i = lista.indexOf(tienda);
  const j = i + direccion;
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  fijarPreferencias(id, lista);
}

/* Compatibilidad: fijar una sola tienda como principal */
export function fijarTiendaPreferida(id, tienda) {
  if (!tienda) { fijarPreferencias(id, preferencias(id).slice(1)); return; }
  alternarPreferencia(id, tienda);
}

/* ---------- escritura ---------- */

export function guardarPrecio(id, tienda, { precio, cantidad, unidad }) {
  const p = POR_ID[id];
  if (!p || !tienda) return false;

  const base = calcularBase(precio, cantidad, unidad, p.u);
  if (base == null) return false;

  if (!datos.preciosLocal[id]) datos.preciosLocal[id] = {};
  datos.preciosLocal[id][tienda] = {
    f: Math.round(precio * 100) / 100,
    b: base,
    q: cantidad,
    u: unidad,
    d: new Date().toISOString().slice(0, 10)
  };
  avisar();
  return true;
}

export function borrarPrecio(id, tienda) {
  if (datos.preciosLocal[id]) {
    delete datos.preciosLocal[id][tienda];
    if (!Object.keys(datos.preciosLocal[id]).length) delete datos.preciosLocal[id];
  }
  avisar();
}

/* Los tickets alimentan la base de precios sin que tengas que
   escribir nada. Se llama al cerrar una compra (Fase 4). */
export function aprenderDeTicket(ticket) {
  if (!ticket?.tienda) return 0;
  let aprendidos = 0;
  for (const l of ticket.lineas) {
    if (!l.id || l.precio == null || !l.cant) continue;
    /* Un precio estimado salió de aquí mismo: volver a guardarlo
       sería morderse la cola y falsear la fecha del dato */
    if (l.estimado) continue;
    const p = POR_ID[l.id];
    if (!p) continue;

    /* Producto a peso: el ticket sí dice el €/kg (o el peso y el
       importe). Se guarda ese precio normalizado, no «lo que costó
       esta bolsa», que no dice nada del precio del kilo. */
    if (l.pb > 0 || l.q?.v > 0) {
      const base = baseDeLinea(l, p);
      if (base != null) {
        if (!datos.preciosLocal[l.id]) datos.preciosLocal[l.id] = {};
        const ant = datos.preciosLocal[l.id][ticket.tienda] || {};
        const nuevo = { ...ant, b: base, d: ticket.fecha.slice(0, 10) };
        /* Si se conoce el formato de venta, el precio de formato se
           recalcula con el €/kg nuevo */
        const enBase = ant.q ? aBase(ant.q, ant.u, p) : null;
        if (enBase != null) nuevo.f = Math.round(base * enBase * 100) / 100;
        datos.preciosLocal[l.id][ticket.tienda] = nuevo;
        aprendidos++;
        continue;
      }
    }

    /* Del ticket solo se conoce lo pagado por lo que se llevó.
       Se registra como formato de una unidad de compra. */
    const unitario = l.precio / l.cant;
    if (!datos.preciosLocal[l.id]) datos.preciosLocal[l.id] = {};
    const anterior = datos.preciosLocal[l.id][ticket.tienda] || {};
    datos.preciosLocal[l.id][ticket.tienda] = {
      ...anterior,
      f: Math.round(unitario * 100) / 100,
      d: ticket.fecha.slice(0, 10),
      /* Si ya se sabía el formato, se recalcula el €/kg con el
         precio nuevo. Si no, queda solo el precio de formato. */
      b: anterior.q
        ? calcularBase(unitario, anterior.q, anterior.u, p.u)
        : anterior.b ?? null
    };
    aprendidos++;
  }
  if (aprendidos) avisar();
  return aprendidos;
}

/* ---------- presupuesto de una lista ---------- */

/* Coste estimado de la lista. Para cada producto se usa el
   precio de su tienda preferida; si no lo hay, el más barato
   conocido. Lo que no tiene ningún precio se cuenta aparte:
   nunca se inventa una cifra. */
export function estimarLista(lista) {
  let total = 0, conocidos = 0, desconocidos = 0;

  for (const [id, cant] of Object.entries(lista)) {
    const filas = preciosDe(id);
    if (!filas.length) { desconocidos++; continue; }

    const pref = tiendaPreferida(id);
    const elegida = filas.find(f => f.tienda === pref && f.formato != null)
                 || filas.find(f => f.formato != null);

    if (!elegida) { desconocidos++; continue; }
    total += elegida.formato * cant;
    conocidos++;
  }

  return {
    total: Math.round(total * 100) / 100,
    conocidos, desconocidos
  };
}

/* ¿Dónde sale mejor esta compra?
   ------------------------------------------------------------
   Sumar lo que cuesta la lista en cada tienda y comparar sin más
   engaña: una tienda de la que solo se sabe el precio de dos
   productos siempre parecería la más barata.

   Por eso se compara sobre una CESTA COMÚN: solo los productos
   de los que se tiene precio en TODAS las tiendas comparadas.
   Es la única comparación que significa algo, y la UI dice
   siempre sobre cuántos productos se ha hecho.

   Solo entran las tiendas FAVORITAS. Comparar contra un sitio
   al que no piensas ir no informa, distrae. */
export function compararTiendas(lista) {
  const ids = Object.keys(lista);
  if (!ids.length) return { filas: [], cesta: 0, total: ids.length };

  const candidatasBase = favoritas();

  /* Cobertura de cada tienda sobre la lista */
  const cobertura = new Map();
  for (const t of candidatasBase) {
    const cubiertos = ids.filter(id =>
      preciosDe(id).some(f => f.tienda === t.id && f.formato != null));
    if (cubiertos.length) cobertura.set(t.id, cubiertos);
  }
  if (cobertura.size < 2) return { filas: [], cesta: 0, total: ids.length };

  /* Se descartan las tiendas de las que se sabe muy poco:
     por debajo del 60% de la mejor cobertura no aportan nada */
  const mejor = Math.max(...[...cobertura.values()].map(v => v.length));
  const candidatas = [...cobertura.entries()]
    .filter(([, v]) => v.length >= mejor * 0.6)
    .map(([id]) => id);

  if (candidatas.length < 2) return { filas: [], cesta: 0, total: ids.length };

  /* La cesta común: lo que tiene precio en todas las candidatas */
  const cesta = ids.filter(id =>
    candidatas.every(t => cobertura.get(t).includes(id)));

  if (cesta.length < 2) return { filas: [], cesta: 0, total: ids.length };

  const filas = candidatas.map(t => {
    let total = 0;
    for (const id of cesta) {
      const f = preciosDe(id).find(x => x.tienda === t && x.formato != null);
      total += f.formato * lista[id];
    }
    return {
      tienda: t,
      nombre: TIENDA_POR_ID[t]?.nombre || t,
      total: Math.round(total * 100) / 100
    };
  }).sort((a, b) => a.total - b.total);

  return { filas, cesta: cesta.length, total: ids.length, soloFavoritas: hayFavoritas() };
}

/* ============================================================
   CESTA ÓPTIMA · "¿dónde compro hoy?"
   ------------------------------------------------------------
   Responde a tres preguntas distintas, porque son tres
   decisiones distintas:

   1. Si voy a UNA SOLA TIENDA, ¿a cuál?
   2. Si me da igual repartir, ¿cuánto me ahorro y en cuántas
      paradas?
   3. ¿Qué me estoy dejando fuera por no tener precios?

   Para lo primero hay un problema real: una tienda puede no
   tener precio de algo que sí necesitas. Ignorarlo la haría
   parecer más barata de lo que es. Así que a lo que le falta se
   le pone el precio más barato conocido y se marca cuántos van
   estimados. La cifra es una previsión, y se dice.
   ============================================================ */
export function cestaOptima(lista) {
  const ids = Object.keys(lista).filter(id => preciosDe(id).length);
  const sinPrecio = Object.keys(lista).filter(id => !preciosDe(id).length);

  if (!ids.length) {
    return { hay: false, sinPrecio: sinPrecio.map(Number) };
  }

  const tiendas = favoritas();

  /* --- 1. si fueras a una sola tienda ---
     ATENCIÓN AL SESGO: rellenar lo que le falta a una tienda con
     el precio más barato de otra la hace parecer baratísima, y
     es justo lo que no puedes hacer yendo a un solo sitio.

     Por eso se separan:
       COMPLETAS  tienen precio de todo. Son las únicas
                  comparables entre sí y las únicas que pueden
                  recomendarse.
       PARCIALES  les falta algo. Se muestran aparte, con lo que
                  se sabe y lo que no, y nunca ganan. */
  const todas = tiendas.map(t => {
    let propio = 0, faltan = 0, propios = 0;

    for (const id of ids) {
      const aqui = preciosDe(id).find(f => f.tienda === t.id && f.formato != null);
      if (aqui) { propio += aqui.formato * lista[id]; propios++; }
      else faltan++;
    }

    return {
      tienda: t.id, nombre: t.nombre, color: t.color,
      total: Math.round(propio * 100) / 100,
      propios, faltan,
      completa: faltan === 0,
      cobertura: Math.round(propios / ids.length * 100)
    };
  }).filter(f => f.propios > 0);

  const completas = todas.filter(f => f.completa)
    .sort((a, b) => a.total - b.total);
  const parciales = todas.filter(f => !f.completa)
    .sort((a, b) => b.cobertura - a.cobertura || a.total - b.total);

  const unaTienda = [...completas, ...parciales];

  /* --- 2. repartiendo entre tiendas --- */
  const reparto = new Map();
  let optimo = 0;

  for (const id of ids) {
    const filas = preciosDe(id)
      .filter(f => f.formato != null && tiendas.some(t => t.id === f.tienda));
    if (!filas.length) continue;

    /* El más barato por unidad de compra, no por kilo: lo que
       importa aquí es lo que sale de la cartera hoy */
    const mejor = filas.reduce((a, b) => (b.formato < a.formato ? b : a));
    const coste = mejor.formato * lista[id];
    optimo += coste;

    if (!reparto.has(mejor.tienda)) reparto.set(mejor.tienda, { total: 0, items: [] });
    const g = reparto.get(mejor.tienda);
    g.total += coste;
    g.items.push({ id: +id, cant: lista[id], precio: mejor.formato });
  }

  const paradas = [...reparto.entries()]
    .map(([tienda, g]) => ({
      tienda,
      nombre: TIENDA_POR_ID[tienda]?.nombre || tienda,
      color: TIENDA_POR_ID[tienda]?.color,
      total: Math.round(g.total * 100) / 100,
      items: g.items
    }))
    .sort((a, b) => b.total - a.total);

  /* Solo una tienda con precio de TODO puede recomendarse como
     parada única. Si no hay ninguna, se dice, en vez de señalar
     una a medias como si fuera la respuesta. */
  const mejorUnica = completas[0] || null;
  const ahorro = mejorUnica
    ? Math.round((mejorUnica.total - optimo) * 100) / 100 : 0;

  return {
    hay: true,
    productos: ids.length,
    sinPrecio: sinPrecio.map(Number),
    unaTienda, completas, parciales,
    mejorUnica,
    optimo: Math.round(optimo * 100) / 100,
    paradas,
    ahorro,
    /* Cuánto se ahorra por cada parada extra: es lo que decide
       si merece la pena el viaje */
    ahorroPorParada: paradas.length > 1
      ? Math.round(ahorro / (paradas.length - 1) * 100) / 100 : 0,
    soloFavoritas: hayFavoritas()
  };
}

/* Agrupa la lista por la tienda preferida de cada producto */
export function agruparPorTienda(entradas) {
  const grupos = new Map();
  for (const item of entradas) {
    const t = tiendaPreferida(item.producto?.id ?? item.id) || 'libre';
    if (!grupos.has(t)) grupos.set(t, []);
    grupos.get(t).push(item);
  }
  return grupos;
}

/* ============================================================
   EQUIVALENTES Y MARCAS
   ============================================================ */

/* Productos que se pueden sustituir entre sí. La relación es de
   ida y vuelta: si A equivale a B, B equivale a A. */
export function equivalentes(id) {
  return (datos.sustitutos[id] || []).filter(x => POR_ID[x] && !POR_ID[x].a);
}

export function enlazarEquivalente(a, b) {
  if (a === b || !POR_ID[a] || !POR_ID[b]) return false;
  for (const [x, y] of [[a, b], [b, a]]) {
    if (!datos.sustitutos[x]) datos.sustitutos[x] = [];
    if (!datos.sustitutos[x].includes(y)) datos.sustitutos[x].push(y);
  }
  avisar();
  return true;
}

export function desenlazarEquivalente(a, b) {
  for (const [x, y] of [[a, b], [b, a]]) {
    if (!datos.sustitutos[x]) continue;
    datos.sustitutos[x] = datos.sustitutos[x].filter(v => v !== y);
    if (!datos.sustitutos[x].length) delete datos.sustitutos[x];
  }
  avisar();
}

/* El precio de referencia de un producto: el más barato que se
   conoce, mirando solo tiendas favoritas */
function referencia(id) {
  const filas = preciosDe(id).filter(f => f.base != null);
  if (!filas.length) return null;
  return filas[0];      // preciosDe ya viene ordenado por precio base
}

/* ------------------------------------------------------------
   ¿HAY ALGO MÁS BARATO QUE ESTO?

   Solo se sugiere cambiar cuando la diferencia es de verdad:
   por debajo del 15% no compensa cambiar de costumbre y el
   aviso se vuelve ruido.

   Se comparan por precio base (€/kg), que es lo único
   comparable entre formatos distintos, y solo entre productos
   de la misma unidad: un yogur por unidad no se puede comparar
   con queso por kilo.
   ------------------------------------------------------------ */
export const AHORRO_MINIMO = 15;

export function masBaratoQue(id) {
  const p = POR_ID[id];
  const mio = referencia(id);
  if (!p || !mio) return null;

  /* Primero los equivalentes que hayas enlazado a mano; si no
     hay, se buscan candidatos en la misma categoría */
  const enlazados = equivalentes(id);
  const candidatos = enlazados.length
    ? enlazados.map(x => POR_ID[x])
    : PRODUCTOS.filter(x => x.id !== id && x.c === p.c && x.u === p.u);

  let mejor = null;
  for (const c of candidatos) {
    const suyo = referencia(c.id);
    if (!suyo || suyo.base >= mio.base) continue;
    if (!mejor || suyo.base < mejor.precio.base) {
      mejor = { producto: c, precio: suyo };
    }
  }
  if (!mejor) return null;

  const ahorro = Math.round((1 - mejor.precio.base / mio.base) * 100);
  if (ahorro < AHORRO_MINIMO) return null;

  return {
    ...mejor,
    ahorro,
    enlazado: enlazados.includes(mejor.producto.id),
    caro: { producto: p, precio: mio }
  };
}

/* ------------------------------------------------------------
   MARCA EXIGIDA

   Para cuando compra otra persona: hay cosas donde cualquiera
   vale y cosas donde no. Decirlo en la lista evita la llamada
   desde el pasillo.
   ------------------------------------------------------------ */
export function marcaDe(id) {
  return datos.marcas[id] || null;
}

export function fijarMarca(id, { estricta, texto }) {
  const limpio = String(texto || '').trim().slice(0, 60);
  if (!limpio && !estricta) delete datos.marcas[id];
  else datos.marcas[id] = { estricta: !!estricta, texto: limpio };
  avisar();
}

export function cuantosPreciosHay() {
  let n = 0;
  for (const id in datos.preciosLocal) n += Object.keys(datos.preciosLocal[id]).length;
  return n;
}
