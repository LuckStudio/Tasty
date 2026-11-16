/* ============================================================
   REPOSICIÓN INTELIGENTE
   ------------------------------------------------------------
   Cada cuánto se compra cada cosa, y qué toca reponer hoy.

   LA PERIODICIDAD SALE DE TRES SITIOS, en este orden:

   1. MANUAL      lo que tú hayas dicho en la ficha. Manda
                  siempre sobre todo lo demás.
   2. APRENDIDA   la media de días entre compras reales, sacada
                  del historial de tickets. Hacen falta al menos
                  tres compras para fiarse.
   3. ESTIMADA    un valor por defecto según la frecuencia del
                  producto. Es solo un punto de partida hasta
                  que haya historial.

   La estimación nunca se presenta como un dato: la interfaz
   dice de dónde viene cada cifra.
   ============================================================ */

import { datos, guardar } from './almacen.js?v=29';
import { POR_ID, PRODUCTOS } from './estado.js?v=29';

/* Días por defecto según con qué frecuencia se compra algo.
   3 = compra usual, 2 = puntual, 1 = rara vez */
const POR_FRECUENCIA = { 3: 10, 2: 30, 1: 90 };

/* Compras mínimas para fiarse de la media del historial */
const MINIMO_PARA_APRENDER = 3;

/* Un producto se sugiere a partir de este porcentaje de su
   periodicidad: mejor avisar un poco antes que quedarse sin */
const MARGEN = 0.85;

const oyentes = new Set();
export function suscribirReposicion(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
function avisar() {
  guardar();
  oyentes.forEach(fn => fn());
}

/* ---------- historial de compras de un producto ---------- */

/* Fechas en las que se compró, de antigua a reciente */
export function comprasDe(id) {
  const fechas = [];
  for (const t of datos.tickets) {
    if (t.lineas.some(l => l.id === id)) fechas.push(t.fecha);
  }
  return fechas.sort();
}

export function ultimaCompra(id) {
  const f = comprasDe(id);
  return f.length ? f[f.length - 1] : null;
}

export function diasDesde(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

/* ---------- periodicidad ---------- */

/* Media de días entre compras. Se descartan los intervalos de
   menos de un día: dos tickets del mismo día son una sola
   compra partida, no dos compras seguidas. */
function mediaAprendida(id) {
  const fechas = comprasDe(id);
  if (fechas.length < MINIMO_PARA_APRENDER) return null;

  const huecos = [];
  for (let i = 1; i < fechas.length; i++) {
    const d = Math.round(
      (new Date(fechas[i]) - new Date(fechas[i - 1])) / 86400000);
    if (d >= 1) huecos.push(d);
  }
  if (!huecos.length) return null;

  const media = huecos.reduce((a, b) => a + b, 0) / huecos.length;
  return Math.max(1, Math.round(media));
}

export function periodicidad(id) {
  const manual = datos.periodicidad?.[id];
  if (Number.isFinite(manual) && manual > 0) {
    return { dias: manual, origen: 'manual', compras: comprasDe(id).length };
  }

  const aprendida = mediaAprendida(id);
  if (aprendida) {
    return { dias: aprendida, origen: 'aprendida', compras: comprasDe(id).length };
  }

  const p = POR_ID[id];
  return {
    dias: POR_FRECUENCIA[p?.f] ?? 30,
    origen: 'estimada',
    compras: comprasDe(id).length
  };
}

export function fijarPeriodicidad(id, dias) {
  if (!datos.periodicidad) datos.periodicidad = {};
  const n = parseInt(dias, 10);
  if (Number.isFinite(n) && n > 0) datos.periodicidad[id] = n;
  else delete datos.periodicidad[id];
  avisar();
}

export function textoOrigen(origen, compras) {
  if (origen === 'manual') return 'lo has fijado tú';
  if (origen === 'aprendida') return `media de tus ${compras} compras`;
  return 'estimación, aún sin historial';
}

/* ---------- sugerencias ---------- */

/* Un producto se sugiere cuando ha pasado su periodicidad desde
   la última vez que se compró. Nunca se sugiere algo que ya está
   en la lista, ni algo que acabas de descartar. */
export function sugerencias() {
  const fuera = descartes();
  const filas = [];

  for (const p of PRODUCTOS) {
    if (datos.lista[p.id]) continue;          // ya está en la lista
    if (fuera.has(p.id)) continue;            // descartado hace poco

    const ultima = ultimaCompra(p.id);
    if (!ultima) continue;                    // nunca comprado, no hay base

    const per = periodicidad(p.id);
    const dias = diasDesde(ultima);
    if (dias < per.dias * MARGEN) continue;

    filas.push({
      producto: p,
      dias,
      periodo: per.dias,
      origen: per.origen,
      /* Cuánto se ha pasado de plazo, para ordenar por urgencia */
      retraso: dias - per.dias
    });
  }

  return filas.sort((a, b) => b.retraso - a.retraso);
}

/* ---------- descartes ---------- */

/* Descartar una sugerencia la calla durante un tiempo, no para
   siempre: lo que se compra cada semana volvería a colarse a los
   dos días si el descarte no caducase. */
function descartes() {
  const activos = new Set();
  const ahora = Date.now();
  for (const [id, hasta] of Object.entries(datos.sugerenciasFuera || {})) {
    if (new Date(hasta).getTime() > ahora) activos.add(+id);
  }
  return activos;
}

export function descartarSugerencia(id) {
  if (!datos.sugerenciasFuera) datos.sugerenciasFuera = {};
  const per = periodicidad(id);
  /* Se calla un tercio de su ciclo, mínimo tres días */
  const dias = Math.max(3, Math.round(per.dias / 3));
  const hasta = new Date(Date.now() + dias * 86400000);
  datos.sugerenciasFuera[id] = hasta.toISOString();
  avisar();
  return dias;
}

export function limpiarDescartes() {
  datos.sugerenciasFuera = {};
  avisar();
}

/* ---------- urgencia ---------- */

/* Una fecha límite para un producto de la lista: "esto lo
   necesito sí o sí antes del jueves". */
export function urgenciaDe(id) {
  return datos.urgencia?.[id] || null;
}

export function fijarUrgencia(id, fecha) {
  if (!datos.urgencia) datos.urgencia = {};
  if (fecha) datos.urgencia[id] = fecha;
  else delete datos.urgencia[id];
  avisar();
}

/* Días que faltan. Negativo si ya se pasó la fecha. */
export function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(fecha + 'T00:00:00');
  return Math.round((objetivo - hoy) / 86400000);
}

export function textoUrgencia(fecha) {
  const d = diasHasta(fecha);
  if (d == null) return '';
  if (d < 0) return `Se pasó hace ${-d} ${-d === 1 ? 'día' : 'días'}`;
  if (d === 0) return 'Para hoy';
  if (d === 1) return 'Para mañana';
  if (d <= 7) return `En ${d} días`;
  return new Date(fecha + 'T00:00:00')
    .toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

/* Nivel para pintarlo: pasado, hoy, pronto o tranquilo */
export function nivelUrgencia(fecha) {
  const d = diasHasta(fecha);
  if (d == null) return null;
  if (d < 0) return 'pasada';
  if (d === 0) return 'hoy';
  if (d <= 2) return 'pronto';
  return 'lejos';
}

/* Lo urgente de la lista actual, ordenado por fecha */
export function urgentes() {
  const filas = [];
  for (const [id, fecha] of Object.entries(datos.urgencia || {})) {
    if (!datos.lista[id]) continue;
    const p = POR_ID[id];
    if (!p) continue;
    filas.push({ producto: p, fecha, dias: diasHasta(fecha),
                 nivel: nivelUrgencia(fecha) });
  }
  return filas.sort((a, b) => a.dias - b.dias);
}

/* Al vaciar la lista o quitar un producto, su urgencia sobra */
export function limpiarUrgenciasHuerfanas() {
  if (!datos.urgencia) return;
  let cambio = false;
  for (const id of Object.keys(datos.urgencia)) {
    if (!datos.lista[id]) { delete datos.urgencia[id]; cambio = true; }
  }
  if (cambio) guardar();
}
