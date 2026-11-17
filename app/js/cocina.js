/* ============================================================
   COCINADO — qué se ha cocinado y cuándo
   ------------------------------------------------------------
   Al pulsar «He terminado de cocinar»:
     · se descuenta de la despensa lo usado (con las raciones cocinadas)
     · se apunta que esa receta se cocinó hoy, para poder decir «la
       última vez fue hace 12 días» y variar sin que la app decida por ti

   datos.cocinadas[idReceta] = ['2026-11-16', '2026-11-02', …]  (las 12 últimas)
   ============================================================ */

import { datos, guardar } from './almacen.js?v=39';
import { recetaPorId } from './recetas.js?v=39';
import { descontarReceta } from './despensa.js?v=39';
import { fechaISO, aFecha } from './menu.js?v=39';

const oyentes = new Set();
export function suscribirCocinado(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
function avisar() { guardar(); oyentes.forEach(fn => fn()); }

const MAX = 12;
const propio = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export function registrarCocinada(idReceta, fecha = fechaISO()) {
  if (!recetaPorId(idReceta) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  datos.cocinadas ??= {};
  const previas = propio(datos.cocinadas, idReceta) ? datos.cocinadas[idReceta] : [];
  datos.cocinadas[idReceta] = [...new Set([fecha, ...previas])].sort().reverse().slice(0, MAX);
  return true;
}

export function ultimaVezCocinada(idReceta) {
  const l = datos.cocinadas && propio(datos.cocinadas, idReceta) ? datos.cocinadas[idReceta] : null;
  return l?.length ? l[0] : null;
}

export function vecesCocinada(idReceta) {
  return datos.cocinadas && propio(datos.cocinadas, idReceta) ? datos.cocinadas[idReceta].length : 0;
}

/* «hoy», «ayer», «hace 12 días», «hace 3 semanas», «hace 2 meses» */
export function textoHace(fecha, hoy = fechaISO()) {
  if (!fecha) return null;
  const dias = Math.round((aFecha(hoy) - aFecha(fecha)) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 14) return `hace ${dias} días`;
  if (dias < 60) return `hace ${Math.floor(dias / 7)} semanas`;
  return `hace ${Math.floor(dias / 30)} meses`;
}

/* items: [{ receta, raciones }]. Devuelve cuánto se descontó y cuánto no
   se pudo cuantificar (por ejemplo «tomate» sin cantidad). */
export function terminarDeCocinar(items, fecha = fechaISO()) {
  let descontados = 0, sinCuantificar = 0, recetas = 0;
  for (const { receta, raciones } of items) {
    if (!recetaPorId(receta.id)) continue;
    const r = descontarReceta(receta, raciones);
    descontados += r.descontados; sinCuantificar += r.sinCuantificar;
    registrarCocinada(receta.id, fecha);
    recetas++;
  }
  if (recetas) avisar();
  return { recetas, descontados, sinCuantificar };
}
