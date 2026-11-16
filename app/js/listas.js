/* ============================================================
   LISTAS
   ------------------------------------------------------------
   Varias listas que nunca se pisan: la de casa, la del piso de
   la playa, la de la oficina, la de un cumpleaños.

   CÓMO FUNCIONA POR DENTRO

   La lista que estás editando vive en `datos.lista`, tal y como
   siempre. Eso es a propósito: todo el resto del código sigue
   leyendo de ahí sin enterarse de que existen más listas.

   Al cambiar de lista se guarda la actual en su sitio y se
   carga la nueva encima de la copia de trabajo. Es un cambio
   de contexto, no un modelo de datos nuevo por todas partes.
   ============================================================ */

import { datos, guardar } from './almacen.js?v=21';

export const EMOJIS = ['🛒', '🏠', '🏖️', '💼', '🎉', '🐾', '🍳', '🧰', '🌿', '🎁'];

const oyentes = new Set();
export function suscribirListas(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
function avisar() {
  guardar();
  oyentes.forEach(fn => fn());
}

/* ---------- lectura ---------- */

export function listas() {
  return datos.listas || [];
}

export function listaActiva() {
  return listas().find(l => l.id === datos.listaActiva) || listas()[0];
}

export function cuantosEn(l) {
  const productos = Object.values(l.lista || {}).reduce((a, b) => a + b, 0);
  return productos + (l.libres?.length || 0);
}

/* Las demás listas, con lo que tienen dentro: sirve para avisar
   de que hay cosas pendientes en otro sitio */
export function otrasConCosas() {
  return listas()
    .filter(l => l.id !== datos.listaActiva && cuantosEn(l) > 0)
    .map(l => ({ ...l, cuantos: cuantosEn(l) }));
}

/* ---------- guardar y cargar la copia de trabajo ---------- */

/* Vuelca lo que se está editando dentro de su lista. Se llama
   en cada cambio, así que un cierre inesperado no pierde nada. */
export function sincronizar() {
  const l = listaActiva();
  if (!l) return;
  l.lista = datos.lista;
  l.libres = datos.libres;
  l.urgencia = datos.urgencia;
}

export function cambiarA(id) {
  const destino = listas().find(l => l.id === id);
  if (!destino || id === datos.listaActiva) return false;

  sincronizar();                    // se guarda la que se deja

  datos.listaActiva = id;
  datos.lista = destino.lista || {};
  datos.libres = destino.libres || [];
  datos.urgencia = destino.urgencia || {};

  avisar();
  return true;
}

/* ---------- alta, edición y baja ---------- */

export function crearLista({ nombre, emoji }) {
  const limpio = String(nombre || '').trim();
  if (!limpio) return { ok: false, error: 'Ponle un nombre.' };

  const repetida = listas().find(
    l => l.nombre.toLowerCase() === limpio.toLowerCase());
  if (repetida) return { ok: false, error: `Ya tienes «${repetida.nombre}».` };

  /* Los ids no se reutilizan: se cuenta desde el mayor usado */
  const usados = listas().map(l => parseInt(l.id.slice(1), 10) || 0);
  const nueva = {
    id: 'l' + (Math.max(0, ...usados) + 1),
    nombre: limpio,
    emoji: emoji || EMOJIS[listas().length % EMOJIS.length],
    lista: {}, libres: [], urgencia: {}
  };

  sincronizar();
  datos.listas.push(nueva);
  avisar();
  return { ok: true, lista: nueva };
}

export function renombrarLista(id, { nombre, emoji }) {
  const l = listas().find(x => x.id === id);
  if (!l) return { ok: false, error: 'Esa lista ya no está.' };

  if (nombre !== undefined) {
    const limpio = String(nombre).trim();
    if (!limpio) return { ok: false, error: 'El nombre no puede quedar vacío.' };
    const choca = listas().find(
      x => x.id !== id && x.nombre.toLowerCase() === limpio.toLowerCase());
    if (choca) return { ok: false, error: `Ya tienes «${choca.nombre}».` };
    l.nombre = limpio;
  }
  if (emoji !== undefined) l.emoji = emoji;

  avisar();
  return { ok: true };
}

export function borrarLista(id) {
  if (listas().length <= 1) {
    return { ok: false, error: 'Tiene que quedar al menos una lista.' };
  }
  const i = listas().findIndex(l => l.id === id);
  if (i < 0) return { ok: false, error: 'Esa lista ya no está.' };

  const eraLaActiva = datos.listaActiva === id;
  datos.listas.splice(i, 1);

  if (eraLaActiva) {
    /* Al borrar la que se estaba usando se salta a la primera,
       cargando su contenido en la copia de trabajo */
    const siguiente = listas()[0];
    datos.listaActiva = siguiente.id;
    datos.lista = siguiente.lista || {};
    datos.libres = siguiente.libres || [];
    datos.urgencia = siguiente.urgencia || {};
  }

  avisar();
  return { ok: true };
}

export function vaciarLista(id) {
  const l = listas().find(x => x.id === id);
  if (!l) return;
  l.lista = {}; l.libres = []; l.urgencia = {};
  if (datos.listaActiva === id) {
    datos.lista = {}; datos.libres = []; datos.urgencia = {};
  }
  avisar();
}

/* Copia todo lo de una lista a otra sin vaciar el origen */
export function copiarA(destinoId) {
  const destino = listas().find(l => l.id === destinoId);
  if (!destino) return { ok: false, error: 'Esa lista ya no está.' };

  sincronizar();
  let anadidos = 0;

  for (const [id, cant] of Object.entries(datos.lista)) {
    destino.lista[id] = (destino.lista[id] || 0) + cant;
    anadidos++;
  }
  for (const texto of datos.libres) {
    if (!destino.libres.some(x => x.toLowerCase() === texto.toLowerCase())) {
      destino.libres.push(texto);
      anadidos++;
    }
  }

  avisar();
  return { ok: true, anadidos, nombre: destino.nombre };
}
