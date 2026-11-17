/* ============================================================
   EL HOGAR — preferencias que afectan a todo
   ------------------------------------------------------------
   · cuántas personas sois: las recetas vienen para 1 ración y el menú
     parte de ahí, así que al planificar salen las raciones del hogar
   · cuándo se hizo la última copia de seguridad, y el aviso para hacerla
   · si ya se enseñó la configuración de primera vez
   ============================================================ */

import { datos, guardar } from './almacen.js?v=39';

const DIA = 86400000;
export const DIAS_ENTRE_COPIAS = 30;
const DIAS_DE_ESPERA = 7;           // al pulsar «más tarde»

/* ---------- personas ---------- */

export function personas() {
  const n = Math.round(Number(datos.ajustes?.personas));
  return n >= 1 && n <= 12 ? n : 1;
}
export function fijarPersonas(n) {
  const v = Math.max(1, Math.min(12, Math.round(Number(n)) || 1));
  datos.ajustes.personas = v;
  guardar();
  return v;
}

/* ---------- copia de seguridad ---------- */

export function copiaHecha(ahora = new Date()) {
  datos.ajustes.ultimaCopia = ahora.toISOString();
  delete datos.ajustes.copiaPospuesta;
  guardar();
}

export function ultimaCopia() { return datos.ajustes?.ultimaCopia || null; }

/* ¿Hay algo que merezca la pena guardar? (si la app está vacía no se avisa) */
function hayDatos() {
  return datos.tickets.length > 0 || (datos.recetas || []).length > 14
    || Object.keys(datos.despensa || {}).length > 0 || Object.keys(datos.menu || {}).length > 0;
}

/* Devuelve null si no toca avisar, o { dias } (null = nunca se ha hecho) */
export function avisoDeCopia(ahora = Date.now()) {
  if (!hayDatos()) return null;
  const pospuesta = datos.ajustes?.copiaPospuesta;
  if (pospuesta && ahora < new Date(pospuesta).getTime()) return null;
  const u = ultimaCopia();
  if (!u) return { dias: null };
  const dias = Math.floor((ahora - new Date(u).getTime()) / DIA);
  return dias >= DIAS_ENTRE_COPIAS ? { dias } : null;
}

export function posponerAvisoDeCopia(ahora = Date.now()) {
  datos.ajustes.copiaPospuesta = new Date(ahora + DIAS_DE_ESPERA * DIA).toISOString();
  guardar();
}

/* ---------- configuración de primera vez ---------- */

export function bienvenidaVista() { return !!datos.ajustes?.bienvenida; }
export function marcarBienvenida() { datos.ajustes.bienvenida = true; guardar(); }

/* Quien ya usa la app (tiene compras o una lista) no necesita la bienvenida */
export function hayQueDarLaBienvenida() {
  if (bienvenidaVista()) return false;
  const usada = datos.tickets.length > 0 || Object.keys(datos.lista || {}).length > 0
    || Object.keys(datos.menu || {}).length > 0;
  return !usada;
}
