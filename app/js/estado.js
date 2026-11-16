/* ============================================================
   ESTADO — única fuente de verdad
   ------------------------------------------------------------
   Nadie toca localStorage ni el DOM por su cuenta. Se cambia
   el estado con estas funciones y las vistas se enteran solas
   porque están suscritas.
   ============================================================ */

import { CATALOGO } from '../datos/catalogo.js?v=29';
import { datos, guardar } from './almacen.js?v=29';

/* ------------------------------------------------------------
   EL CATÁLOGO ES VIVO

   Lo que se ve es la mezcla de dos capas:
     1. CATALOGO       lo horneado en datos/catalogo.js
     2. capa local     ediciones y altas hechas desde el móvil

   Se exporta con `let` a propósito: los módulos de ES mantienen
   enlaces vivos, así que cuando aquí se reconstruye, todos los
   que lo importan ven la versión nueva sin recargar la página.

   POR_ID incluye los archivados (los enlaces antiguos siguen
   necesitando resolverlos). PRODUCTOS solo los activos.
   ------------------------------------------------------------ */
export let PRODUCTOS = [];
export let POR_ID = {};

export function catalogoCompleto() {
  const local = datos.catalogoLocal || { ediciones: {}, nuevos: [] };

  const base = CATALOGO.map(p => {
    const cambios = local.ediciones[p.id];
    return cambios ? { ...p, ...cambios, editado: true } : p;
  });

  /* ------------------------------------------------------------
     PRODUCTOS YA CONSOLIDADOS

     Cuando algo que creaste en el móvil pasa al catálogo
     horneado, en el dispositivo sigue existiendo su copia local
     con el mismo id. Si no se filtrase aparecería DOS VECES en
     el grid y en POR_ID solo ganaría uno de los dos, con estados
     distintos según por dónde se mirase.

     La regla: si el id ya existe horneado, la copia local sobra.
     Lo que hayas editado encima se conserva como edición, no
     como producto aparte.
     ------------------------------------------------------------ */
  const horneados = new Set(CATALOGO.map(p => p.id));
  const nuevos = (local.nuevos || [])
    .filter(p => !horneados.has(p.id))
    .map(p => ({ ...p, esNuevo: true }));

  return [...base, ...nuevos].sort((a, b) => a.id - b.id);
}

export function reconstruirCatalogo() {
  const todos = catalogoCompleto();
  PRODUCTOS = todos.filter(p => !p.a);
  POR_ID = Object.fromEntries(todos.map(p => [p.id, p]));
  return todos;
}

reconstruirCatalogo();

const oyentes = new Set();

export function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

function avisar() {
  /* La copia de trabajo se vuelca en la lista activa en cada
     cambio, así un cierre inesperado no pierde nada */
  const activa = (datos.listas || []).find(l => l.id === datos.listaActiva);
  if (activa) {
    activa.lista = datos.lista;
    activa.libres = datos.libres;
    activa.urgencia = datos.urgencia;
  }
  guardar();
  oyentes.forEach(fn => fn(datos));
}

/* ---------- lectura ---------- */

export const estado = datos;

export function cantidad(id) {
  return datos.lista[id] || 0;
}

export function totalArticulos() {
  const productos = Object.values(datos.lista).reduce((a, b) => a + b, 0);
  return productos + datos.libres.length;
}

export function seleccionados() {
  return Object.entries(datos.lista)
    .filter(([, c]) => c > 0)
    .map(([id, c]) => ({ producto: POR_ID[id], cantidad: c }))
    .filter(x => x.producto);
}

/* ---------- escritura ---------- */

export function alternar(id) {
  datos.lista[id] = datos.lista[id] ? 0 : 1;
  if (!datos.lista[id]) delete datos.lista[id];
  avisar();
}

export function sumar(id, delta = 1) {
  const nueva = (datos.lista[id] || 0) + delta;
  if (nueva <= 0) delete datos.lista[id];
  else datos.lista[id] = Math.min(nueva, 99);
  avisar();
}

export function quitar(id) {
  delete datos.lista[id];
  avisar();
}

export function anadirLibre(texto) {
  const limpio = texto.trim();
  if (!limpio) return false;
  const yaEsta = datos.libres.some(
    l => l.toLowerCase() === limpio.toLowerCase()
  );
  if (yaEsta) return false;
  datos.libres.push(limpio);
  avisar();
  return true;
}

export function quitarLibre(indice) {
  datos.libres.splice(indice, 1);
  avisar();
}

export function vaciar() {
  datos.lista = {};
  datos.libres = [];
  avisar();
}

/* Sustituye la lista entera. Se usa al abrir un enlace.
   Los ids que no existan en este catálogo se descartan: puede
   pasar si el enlace es de una versión anterior o si el
   producto se archivó. Mejor perder una línea que mostrar
   fantasmas en el contador. */
export function cargarLista(lista, libres) {
  datos.lista = {};
  let descartados = 0;
  for (const [id, cant] of Object.entries(lista)) {
    if (POR_ID[id] && !POR_ID[id].a) datos.lista[id] = cant;
    else descartados++;
  }
  datos.libres = [...libres];
  avisar();
  return descartados;
}

export function fijarVista(vista) {
  datos.ajustes.vista = vista;
  avisar();
}

export function fijarAgrupacion(modo) {
  datos.ajustes.agrupar = modo;
  avisar();
}
