/* ============================================================
   ALMACÉN — persistencia en el navegador
   ------------------------------------------------------------
   Todo lo que el usuario cambia en su dispositivo vive aquí,
   como una capa encima del catálogo horneado en /datos/.

   ESQUEMA (versión 1)
     listas       todas las listas guardadas (casa, oficina…)
     listaActiva  cuál se está editando ahora
     lista        copia de trabajo de la lista activa
     libres       productos escritos a mano  [ "queso azul", ... ]
     preciosLocal precios editados en el móvil
     prefTienda   dónde comprar cada producto, en orden:
                  el primero es el preferido, los siguientes
                  son el plan B
     catalogoLocal ediciones y altas de productos hechas aquí
     tickets      compras finalizadas            (Fase 4)
     pendientes   productos sin catalogar
     periodicidad cada cuántos días se compra cada producto
     sustitutos   qué productos son equivalentes entre sí
     marcas       exigencias de marca por producto
     recetas      dieta: qué se cocina y con qué
     urgencia     fecha límite de un producto de la lista
     recordatorios avisos programados de hacer la compra
     ajustes      preferencias de la app

   Al subir SCHEMA se ejecutan las migraciones necesarias para
   no perder datos de versiones anteriores.
   ============================================================ */

const CLAVE  = 'luckstudio_compra';
const SCHEMA = 9;

/* Toda instalación arranca con una lista, aunque nunca se
   creen más. Así el resto del código no tiene que distinguir
   entre "sin listas" y "con listas". */
export const LISTA_INICIAL = {
  id: 'l0', nombre: 'La compra', emoji: '🛒',
  lista: {}, libres: [], urgencia: {}
};

const INICIAL = {
  schema: SCHEMA,
  listas: [structuredClone(LISTA_INICIAL)],
  listaActiva: 'l0',
  lista: {},
  libres: [],
  compra: null,
  preciosLocal: {},
  prefTienda: {},
  catalogoLocal: { ediciones: {}, nuevos: [] },
  tiendasLocal: { propias: [], ediciones: {} },
  tickets: [],
  pendientes: [],
  periodicidad: {},
  sustitutos: {},
  marcas: {},
  recetas: [],
  urgencia: {},
  sugerenciasFuera: {},
  recordatorios: [],
  rutas: {},
  alias: {},
  ajustes: { vista: 'frecuencia', agrupar: 'categoria' }
};

function migrar(datos) {
  /* Cada bloque transforma una versión del esquema en la
     siguiente. Nunca se borra nada del usuario. */
  if (datos.schema < 2) {
    /* v2 añade la capa de precios y las tiendas preferidas.
       Las claves nuevas ya vienen del objeto INICIAL, así que
       aquí solo hay que dejar constancia del salto. */
    datos.schema = 2;
  }
  if (datos.schema < 3) {
    /* v3 añade la capa editable del catálogo */
    if (!datos.catalogoLocal) datos.catalogoLocal = { ediciones: {}, nuevos: [] };
    datos.schema = 3;
  }
  if (datos.schema < 4) {
    /* v4: la preferencia de tienda pasa de ser una sola a ser
       una lista ordenada (preferida + plan B). Lo que había se
       convierte en una lista de un elemento. */
    for (const [id, valor] of Object.entries(datos.prefTienda || {})) {
      if (valor == null) delete datos.prefTienda[id];
      else if (!Array.isArray(valor)) datos.prefTienda[id] = [valor];
    }
    if (!datos.tiendasLocal) datos.tiendasLocal = { propias: [], ediciones: {} };
    datos.schema = 4;
  }
  if (datos.schema < 5) {
    /* v5: reposición inteligente. Solo hay que asegurar que las
       claves nuevas existen; los valores se van llenando solos. */
    datos.periodicidad ??= {};
    datos.urgencia ??= {};
    datos.sugerenciasFuera ??= {};
    datos.recordatorios ??= [];
    datos.schema = 5;
  }
  if (datos.schema < 6) {
    /* v6: varias listas. Lo que había pasa a ser la primera,
       para no perder nada de lo que estuviera a medias. */
    datos.listas = [{
      ...structuredClone(LISTA_INICIAL),
      lista: datos.lista || {},
      libres: datos.libres || [],
      urgencia: datos.urgencia || {}
    }];
    datos.listaActiva = 'l0';
    datos.schema = 6;
  }
  if (datos.schema < 7) {
    /* v7: decisión de compra. Equivalencias entre productos y
       exigencias de marca. */
    datos.sustitutos ??= {};
    datos.marcas ??= {};
    datos.schema = 7;
  }
  if (datos.schema < 8) {
    /* v8: dieta y recetas */
    datos.recetas ??= [];
    datos.schema = 8;
  }
  if (datos.schema < 9) {
    /* v9: secciones de supermercado y memoria de equivalencias de
       ticket. Los productos no necesitan migración: su sección sale
       de su categoría hasta que el usuario la cambie (campo `s` en
       la capa editable) y el peso medio (`pu`) es opcional. */
    datos.rutas ??= {};
    datos.alias ??= {};
    datos.schema = 9;
  }
  datos.schema = SCHEMA;
  return datos;
}

function leer() {
  try {
    const bruto = localStorage.getItem(CLAVE);
    if (!bruto) return structuredClone(INICIAL);
    return migrar({ ...structuredClone(INICIAL), ...JSON.parse(bruto) });
  } catch (e) {
    console.warn('No se pudo leer el almacén, se empieza de cero.', e);
    return structuredClone(INICIAL);
  }
}

/* IMPORTANTE: un único objeto para toda la app.
   Si cada módulo cargase su propia copia, el último en guardar
   pisaría los cambios de los demás. */
export const datos = leer();

let pendienteGuardar = null;

export function guardar() {
  /* Se agrupa en una sola escritura por frame para no castigar
     el almacenamiento cuando se tocan muchos botones seguidos */
  clearTimeout(pendienteGuardar);
  pendienteGuardar = setTimeout(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
    } catch (e) {
      console.error('El almacenamiento está lleno.', e);
    }
  }, 120);
}

export function borrarTodo() {
  localStorage.removeItem(CLAVE);
}
