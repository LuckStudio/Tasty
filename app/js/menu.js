/* ============================================================
   MENÚ SEMANAL Y BLOQUE DE COCINA  (M1 y M2)
   ------------------------------------------------------------
   El usuario decide qué se cocina cada día: nada se planifica
   solo. Esto guarda y calcula, sin tocar pantalla.

   datos.menu[fecha] = {
     desayuno: [{ r: idReceta, n: raciones }],
     comida:   [...],
     cena:     [...],
     fuera:    { cena: true }        // «cena fuera»: no se cocina
   }

   BLOQUE DE COCINA = lo que se prepara en una misma sesión.
   Por defecto, la tarde del día D incluye: la cena de D, el
   desayuno de D+1 y la comida de D+1. Se puede cambiar para un
   día concreto (datos.bloques[D] = { franjas: [{f, s}] }).
   ============================================================ */

import { datos, guardar } from './almacen.js?v=39';
import { POR_ID } from './estado.js?v=39';
import { sumar as sumarALista, cantidad as enLista } from './estado.js?v=39';
import { recetaPorId } from './recetas.js?v=39';
import { disponibilidad, esFalta } from './despensa.js?v=39';
import { convertir, unidadNormal, cantidadACompra, precioDeCantidad } from './unidades.js?v=39';
import { preciosDe, tiendaPreferida } from './precios.js?v=39';
import { esBasico } from './basicos.js?v=39';
import { personas } from './hogar.js?v=39';

export const FRANJAS = [
  { id: 'desayuno', nombre: 'Desayuno', corto: 'DESAYUNO' },
  { id: 'comida',   nombre: 'Comida',   corto: 'COMIDA' },
  { id: 'merienda', nombre: 'Merienda', corto: 'MERIENDA' },
  { id: 'cena',     nombre: 'Cena',     corto: 'CENA' }
];
export const FRANJA_POR_ID = Object.fromEntries(FRANJAS.map(f => [f.id, f]));

/* ---------- qué receta cabe en qué momento del día ----------
   Cada receta es de un momento: un desayuno solo va en desayunos, una
   comida en comidas, una merienda en meriendas y una cena en cenas. Los
   «almuerzos» (de la dieta antigua) no tienen franja y no se pueden asignar. */
export function franjaDeReceta(comida) { return FRANJA_POR_ID[comida] ? comida : null; }
export function cabeEnFranja(receta, franja) { return !!receta && franjaDeReceta(receta.comida) === franja; }

const ARTICULO = { desayuno: 'un desayuno', comida: 'una comida', cena: 'una cena', merienda: 'una merienda', almuerzo: 'un almuerzo' };
const EN_FRANJA = { desayuno: 'el desayuno', comida: 'la comida', merienda: 'la merienda', cena: 'la cena' };

export function mensajeNoCabe(receta, franja) {
  const es = ARTICULO[receta.comida] || 'otro tipo de plato';
  return franjaDeReceta(receta.comida)
    ? `«${receta.nombre}» es ${es}: no se puede poner en ${EN_FRANJA[franja] || 'esa franja'}.`
    : `«${receta.nombre}» es ${es}, y el menú solo tiene desayuno, comida, merienda y cena.`;
}

const oyentes = new Set();
export function suscribirMenu(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
function avisar() { guardar(); oyentes.forEach(fn => fn()); }

/* ---------- fechas (siempre locales, sin husos) ---------- */

export function fechaISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function aFecha(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
export function sumarDias(iso, n) {
  const d = aFecha(iso); d.setDate(d.getDate() + n); return fechaISO(d);
}
/* El lunes de la semana de una fecha */
export function lunesDe(iso) {
  const d = aFecha(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return fechaISO(d);
}
export function semana(iso) {
  const l = lunesDe(iso);
  return Array.from({ length: 7 }, (_, i) => sumarDias(l, i));
}

/* ---------- el menú ---------- */

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const vacio = () => ({ desayuno: [], comida: [], merienda: [], cena: [], fuera: {} });

export function diaDe(fecha) {
  const d = datos.menu?.[fecha];
  if (!d) return vacio();
  return {
    desayuno: d.desayuno || [], comida: d.comida || [], merienda: d.merienda || [],
    cena: d.cena || [], fuera: d.fuera || {}
  };
}

function dia(fecha) {
  datos.menu ??= {};
  if (!datos.menu[fecha]) datos.menu[fecha] = vacio();
  const d = datos.menu[fecha];
  for (const f of FRANJAS) d[f.id] ??= [];
  d.fuera ??= {};
  return d;
}

function limpiarSiVacio(fecha) {
  const d = datos.menu?.[fecha];
  if (d && FRANJAS.every(f => !d[f.id]?.length) && !Object.keys(d.fuera || {}).length) delete datos.menu[fecha];
}

export function anadirReceta(fecha, franja, idReceta, raciones = null) {
  if (!FECHA.test(fecha) || !FRANJA_POR_ID[franja]) return { ok: false, error: 'Día o franja no válidos.' };
  const r = recetaPorId(idReceta);
  if (!r) return { ok: false, error: 'Esa receta ya no existe.' };
  if (!cabeEnFranja(r, franja)) return { ok: false, error: mensajeNoCabe(r, franja) };
  const d = dia(fecha);
  const n = Math.max(1, Math.min(20, Math.round(raciones ?? personas())));
  const ya = d[franja].find(x => x.r === idReceta);
  if (ya) ya.n = n;                                  // la misma receta no se repite en una franja
  else if (d[franja].length >= 6) return { ok: false, error: 'Demasiadas recetas en una franja.' };
  else d[franja].push({ r: idReceta, n });
  delete d.fuera[franja];                            // si había «fuera», ya se cocina
  avisar();
  return { ok: true };
}

export function quitarReceta(fecha, franja, idReceta) {
  const d = datos.menu?.[fecha];
  if (!d?.[franja]) return;
  d[franja] = d[franja].filter(x => x.r !== idReceta);
  limpiarSiVacio(fecha);
  avisar();
}

export function fijarRaciones(fecha, franja, idReceta, raciones) {
  const x = datos.menu?.[fecha]?.[franja]?.find(y => y.r === idReceta);
  if (!x) return false;
  x.n = Math.max(1, Math.min(20, Math.round(raciones) || 1));
  avisar();
  return true;
}

/* «Cena fuera»: ese día no se cocina esa franja */
export function marcarFuera(fecha, franja, fuera = true) {
  if (!FECHA.test(fecha) || !FRANJA_POR_ID[franja]) return false;
  const d = dia(fecha);
  if (fuera) { d[franja] = []; d.fuera[franja] = true; }
  else delete d.fuera[franja];
  limpiarSiVacio(fecha);
  avisar();
  return true;
}

export function copiarDia(desde, hasta) {
  if (!FECHA.test(desde) || !FECHA.test(hasta) || desde === hasta) return false;
  const o = diaDe(desde);
  if (FRANJAS.every(f => !o[f.id].length) && !Object.keys(o.fuera).length) return false;
  datos.menu[hasta] = JSON.parse(JSON.stringify(o));
  avisar();
  return true;
}

/* Copia los 7 días de una semana a otra (sustituye lo que hubiera) */
export function copiarSemana(lunesOrigen, lunesDestino) {
  if (lunesOrigen === lunesDestino) return 0;
  let copiados = 0;
  for (let i = 0; i < 7; i++) {
    const o = sumarDias(lunesOrigen, i), d = sumarDias(lunesDestino, i);
    const origen = diaDe(o);
    const hay = FRANJAS.some(f => origen[f.id].length) || Object.keys(origen.fuera).length;
    if (hay) { datos.menu[d] = JSON.parse(JSON.stringify(origen)); copiados++; }
    else if (datos.menu?.[d]) delete datos.menu[d];
  }
  avisar();
  return copiados;
}

export function vaciarDia(fecha) {
  if (datos.menu?.[fecha]) { delete datos.menu[fecha]; avisar(); }
}

/* Receta con los datos del menú para pintarla. Si la receta se borró,
   se ignora (no rompe el menú). */
export function recetasDeFranja(fecha, franja) {
  return diaDe(fecha)[franja]
    .map(x => ({ receta: recetaPorId(x.r), raciones: x.n }))
    .filter(x => x.receta);
}

/* ---------- el bloque de cocina ---------- */

export function franjasPorDefecto(fechaD) {
  return [
    { f: fechaD, s: 'cena' },
    { f: sumarDias(fechaD, 1), s: 'desayuno' },
    { f: sumarDias(fechaD, 1), s: 'comida' }
  ];
}

export function franjasDeBloque(fechaD) {
  const b = datos.bloques?.[fechaD];
  return Array.isArray(b?.franjas) ? b.franjas : franjasPorDefecto(fechaD);
}

/* El bloque con sus recetas. Las franjas sin nada que cocinar (vacías
   o «fuera») se conservan, marcadas, para poder explicarlo. */
export function bloqueDe(fechaD) {
  return franjasDeBloque(fechaD).map(({ f, s }) => ({
    fecha: f, franja: s,
    fuera: !!diaDe(f).fuera[s],
    recetas: recetasDeFranja(f, s)
  }));
}

export function recetasDeBloque(fechaD) {
  return bloqueDe(fechaD).flatMap(x => x.recetas.map(r => ({ ...r, fecha: x.fecha, franja: x.franja })));
}

export function configurarBloque(fechaD, franjas) {
  const limpias = (franjas || []).filter(x => FECHA.test(x?.f) && FRANJA_POR_ID[x?.s]).slice(0, 9)
    .map(x => ({ f: x.f, s: x.s }));
  datos.bloques ??= {};
  datos.bloques[fechaD] = { franjas: limpias };
  avisar();
}

export function restablecerBloque(fechaD) {
  if (datos.bloques?.[fechaD]) { delete datos.bloques[fechaD]; avisar(); }
}

/* ---------- color de cada receta ---------- */

/* Paleta pensada para distinguir recetas a un vistazo (puntos, cintas
   y barras; no se usa como color de texto). */
export const PALETA_RECETAS = ['#E0653B', '#5F8A2E', '#B07D1E', '#2F6FB5', '#8A4FB3', '#C23A6A', '#1F8F8A', '#8C6A4A'];

export function colorDeReceta(receta) {
  const clave = String(receta?.id || receta?.nombre || '');
  let h = 0;
  for (let i = 0; i < clave.length; i++) h = (h * 31 + clave.charCodeAt(i)) >>> 0;
  return PALETA_RECETAS[h % PALETA_RECETAS.length];
}

/* ---------- ingredientes consolidados ---------- */

/* Cantidad de un ingrediente para unas raciones concretas */
export function cantidadEscalada(ing, receta, raciones) {
  if (ing.sinCantidad || !(ing.cant > 0)) return null;
  const f = (raciones || receta.raciones || 1) / (receta.raciones || 1);
  return Math.round(ing.cant * f * 100) / 100;
}

/* recetas: [{ receta, raciones }]  →  lista única con el TOTAL de cada
   ingrediente y debajo el desglose por receta, comparado con la despensa.

   Ejemplo: tomate 450 g = 300 g para la cena + 150 g para la comida. */
export function consolidar(recetas) {
  const mapa = new Map();

  for (const { receta, raciones } of recetas) {
    for (const ing of receta.ingredientes || []) {
      const clave = ing.id ? `p${ing.id}` : `t${String(ing.texto || '').toLowerCase()}`;
      const f = mapa.get(clave) || {
        id: ing.id || null, texto: ing.texto || null,
        unidad: null, total: 0, sinCantidad: true, mezcla: false, desglose: []
      };
      const cant = cantidadEscalada(ing, receta, raciones);

      if (cant != null) {
        let aSumar = cant;
        if (f.unidad == null) { f.unidad = ing.unidad; f.sinCantidad = false; }
        else if (f.unidad !== ing.unidad) {
          /* Otra unidad: se convierte solo si hay forma fiable (peso medio) */
          const v = convertir(cant, ing.unidad, f.unidad, ing.id ? POR_ID[ing.id] : null);
          if (v == null) { f.mezcla = true; aSumar = 0; } else aSumar = v;
        }
        f.total = Math.round((f.total + aSumar) * 100) / 100;
      }
      f.desglose.push({ receta, cant, unidad: ing.unidad || null, raciones });
      mapa.set(clave, f);
    }
  }

  const lista = [...mapa.values()];
  for (const f of lista) {
    f.basico = false;
    if (!f.id) { f.estado = 'desconocido'; f.tengo = null; continue; }
    const d = disponibilidad(f.id, f.sinCantidad ? null : { cant: f.total, unidad: f.unidad });
    f.estado = d.estado;
    f.tengo = d.tengo;
    /* Un básico de despensa (aceite, sal…) de cuyas existencias no se sabe
       nada se da por «hay»: no sale como sin comprobar ni se pide */
    f.basico = esBasico(POR_ID[f.id]);
    if (f.basico && f.estado === 'desconocido') f.estado = 'basico';
  }
  return lista;
}

export function resumenConsolidado(lista) {
  const normales = lista.filter(x => !x.basico);
  const basicos = lista.filter(x => x.basico);
  return {
    ingredientes: normales.length,                 // sin contar los básicos de despensa
    basicos: basicos.length,
    nombresBasicos: basicos.map(x => (x.id && POR_ID[x.id]?.n) || x.texto || '').filter(Boolean),
    faltan: lista.filter(x => esFalta(x.estado)).length,
    acaban: lista.filter(x => x.estado === 'acaba').length,
    sinComprobar: lista.filter(x => x.estado === 'desconocido' && x.id).length
  };
}

/* Los ingredientes que hay que pasar a la lista de la compra.
   Por defecto solo lo que SE SABE que falta. Con incluirDesconocidos
   también lo que no se sabe si hay en casa: es lo que se quiere al generar
   la lista de la semana, sobre todo con la despensa vacía. Lo que se sabe
   que hay nunca entra; un básico (aceite, sal…) solo entra si se acaba. */
export function itemsFaltantes(lista, { incluirDesconocidos = false } = {}) {
  return lista.filter(x => x.id && POR_ID[x.id] && (
    esFalta(x.estado)
    || (incluirDesconocidos && x.estado === 'desconocido')
    || (x.basico && x.estado === 'acaba')));
}

export function faltasDe(lista, opciones = {}) {
  return itemsFaltantes(lista, opciones).map(x => x.id);
}

/* ---------- cuánto comprar ---------- */

const tope = n => Math.max(1, Math.min(99, n));

/* Unidades de compra (paquetes, bandejas, unidades…) que hacen falta de
   un ingrediente consolidado, descontando lo que ya hay en casa.

     1. si se conoce el formato de venta (bandeja de 500 g), los paquetes
        necesarios para cubrir lo que falta: 670 g = 2 bandejas
     2. si se vende por unidades (huevos, aguacates), las unidades
     3. si no hay forma de saberlo, 1: nunca se inventa una cifra */
export function cantidadAComprar(f) {
  const p = f.id ? POR_ID[f.id] : null;
  if (!p || f.sinCantidad || !(f.total > 0)) return 1;

  let necesito = f.total;
  if (f.estado === 'falta' && f.tengo?.cant > 0) {
    const tengo = convertir(f.tengo.cant, f.tengo.unidad, f.unidad, p);
    if (tengo != null) necesito = Math.max(0, f.total - tengo);
  }
  if (!(necesito > 0)) return 1;

  const fila = preciosDe(f.id).find(x => x.cantidad > 0 && x.unidad);
  if (fila) {
    const r = cantidadACompra(necesito, f.unidad, { cantidad: fila.cantidad, unidad: fila.unidad }, p);
    if (r) return tope(r.paquetes);
  }
  if (p.u === 'ud') {
    const u = convertir(necesito, f.unidad, 'ud', p);
    if (u != null) return tope(Math.ceil(u - 1e-9));
  }
  return 1;
}

/* ---------- cuánto cuesta ---------- */

/* Coste aproximado de lo consolidado, con los precios que se conocen
   (de la tienda preferida de cada producto o, si no, la más barata). Lo
   que no tiene precio se cuenta aparte; los básicos no cuentan. */
export function costeDe(lista) {
  let total = 0, conocidos = 0, sinPrecio = 0;
  for (const f of lista) {
    const p = f.id ? POR_ID[f.id] : null;
    if (!p || f.basico || f.sinCantidad || !(f.total > 0)) continue;
    const filas = preciosDe(f.id).filter(x => x.base != null);
    const pref = tiendaPreferida(f.id);
    const fila = filas.find(x => x.tienda === pref) || filas[0];
    const c = fila ? precioDeCantidad(fila.base, f.total, f.unidad, p) : null;
    if (c == null) { sinPrecio++; continue; }
    total += c; conocidos++;
  }
  return { total: Math.round(total * 100) / 100, conocidos, sinPrecio };
}

/* Coste aproximado de UNA ración de una receta */
export function costePorRacion(receta) {
  const n = receta.raciones || 1;
  const c = costeDe(consolidar([{ receta, raciones: n }]));
  return { ...c, porRacion: c.conocidos ? Math.round((c.total / n) * 100) / 100 : null };
}

/* ¿Tienes todo para esta receta? Para el selector: «Tienes todo» o «Falta 2» */
export function disponibilidadReceta(receta, raciones = null) {
  const lista = consolidar([{ receta, raciones: raciones || receta.raciones }]);
  const faltan = lista.filter(x => esFalta(x.estado)).length;
  const sinComprobar = lista.filter(x => x.id && x.estado === 'desconocido').length;
  return { faltan, sinComprobar, todo: faltan === 0 && sinComprobar === 0, total: lista.length };
}

/* Añade a la lista de la compra lo que falta (sin duplicar), con las
   cantidades que hacen falta y no de una en una. */
export function faltasALaLista(lista, opciones = {}) {
  let anadidos = 0, yaEstaban = 0, sinSaber = 0, unidades = 0;
  for (const f of itemsFaltantes(lista, opciones)) {
    if (enLista(f.id) > 0) { yaEstaban++; continue; }
    const n = cantidadAComprar(f);
    sumarALista(f.id, n);
    anadidos++; unidades += n;
    if (f.estado === 'desconocido') sinSaber++;
  }
  return { anadidos, yaEstaban, sinSaber, unidades };
}

/* «Generar lista» de la semana: todo lo que falta para lo planificado */
export function consolidarSemana(fechas) {
  const recetas = [];
  for (const f of fechas) {
    for (const franja of FRANJAS) recetas.push(...recetasDeFranja(f, franja.id));
  }
  return consolidar(recetas);
}

/* ---------- qué toca hoy ---------- */

export function tocaHoy(fechaD = fechaISO()) {
  const bloque = bloqueDe(fechaD);
  const recetas = bloque.flatMap(x => x.recetas.map(r => ({ ...r, fecha: x.fecha, franja: x.franja })));
  const cons = consolidar(recetas);
  const manana = bloqueDe(sumarDias(fechaD, 1)).flatMap(x => x.recetas.map(r => r.receta.nombre));
  return {
    fecha: fechaD, bloque, recetas, consolidado: cons,
    resumen: resumenConsolidado(cons),
    faltas: cons.filter(x => x.id && esFalta(x.estado)),
    mananaNombres: [...new Set(manana)]
  };
}
