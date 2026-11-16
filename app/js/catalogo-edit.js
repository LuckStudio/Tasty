/* ============================================================
   CATÁLOGO EDITABLE
   ------------------------------------------------------------
   REGLA QUE NO SE ROMPE NUNCA: un id no cambia jamás y no se
   reutiliza. Los enlaces que ya has compartido dependen de él.

   Por eso aquí nada se borra de verdad:
     · retirar un producto  →  se archiva (a: true)
     · un producto nuevo    →  coge el primer id libre de su
                               bloque de categoría, siempre por
                               encima del último usado

   Cambiar un producto de categoría NO le cambia el id. Queda
   fuera de su bloque y no pasa nada: el bloque solo sirve para
   repartir ids nuevos, no para clasificar.
   ============================================================ */

import { datos, guardar } from './almacen.js?v=24';
import { reconstruirCatalogo, catalogoCompleto, POR_ID } from './estado.js?v=24';
import { CATALOGO, CATALOGO_VERSION } from '../datos/catalogo.js?v=24';
import { CATEGORIAS, CAT_POR_ID } from '../datos/categorias.js?v=24';
import { TIENDAS } from './tiendas.js?v=24';
import { preferencias } from './precios.js?v=24';
import { reconstruirTiendas } from './tiendas.js?v=24';
import { slug, rutaIcono, normalizar } from './util.js?v=24';

const oyentes = new Set();
export function suscribirCatalogo(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
function avisar() {
  reconstruirCatalogo();
  guardar();
  oyentes.forEach(fn => fn());
}

const local = () => datos.catalogoLocal;

/* ---------- altas ---------- */

/* Primer id libre del bloque de una categoría */
export function siguienteId(categoria) {
  const bloque = CAT_POR_ID[categoria]?.bloque ?? 9000;
  const usados = catalogoCompleto()
    .map(p => p.id)
    .filter(id => id >= bloque && id < bloque + 100);
  const ultimo = usados.length ? Math.max(...usados) : bloque;
  const siguiente = ultimo + 1;

  /* Si el bloque se llena (100 productos en una categoría), se
     sigue por encima de todo lo demás en vez de fallar */
  if (siguiente >= bloque + 100) {
    return Math.max(...catalogoCompleto().map(p => p.id)) + 1;
  }
  return siguiente;
}

/* Devuelve el producto que ya lleva ese nombre, o null.
   Compara sin acentos ni mayúsculas: "Tomate" y "tomate" son
   el mismo producto para todos los efectos. */
export function nombreOcupadoPor(nombre, exceptoId = null) {
  const q = normalizar(nombre).trim();
  if (!q) return null;
  return catalogoCompleto().find(
    p => p.id !== exceptoId && normalizar(p.n).trim() === q
  ) || null;
}

export function nombreLibre(nombre, exceptoId = null) {
  return !!String(nombre).trim() && !nombreOcupadoPor(nombre, exceptoId);
}

export function crearProducto({ n, c, f, u, e }) {
  const nombre = String(n || '').trim();
  if (!nombre) return { ok: false, error: 'Le falta el nombre.' };
  if (!CAT_POR_ID[c]) return { ok: false, error: 'Elige una categoría.' };
  const choca = nombreOcupadoPor(nombre);
  if (choca) {
    return { ok: false, error:
      `Ya existe “${choca.n}”${choca.a ? ' (archivado)' : ''}, con el id ${choca.id}.` };
  }

  const producto = {
    id: siguienteId(c),
    n: nombre,
    c,
    f: [1, 2, 3].includes(+f) ? +f : 2,
    u: ['kg', 'l', 'ud'].includes(u) ? u : 'ud',
    e: String(e || '').trim() || null
  };

  local().nuevos.push(producto);
  avisar();
  return { ok: true, producto };
}

/* ---------- ediciones ---------- */

export function editarProducto(id, cambios) {
  const p = POR_ID[id];
  if (!p) return { ok: false, error: 'Ese producto no existe.' };

  if (cambios.n !== undefined) {
    const nombre = String(cambios.n).trim();
    if (!nombre) return { ok: false, error: 'El nombre no puede quedar vacío.' };
    const choca = nombreOcupadoPor(nombre, id);
    if (choca) {
      return { ok: false, error: `Ya existe “${choca.n}”, con el id ${choca.id}.` };
    }
    cambios.n = nombre;
  }

  /* Un producto nacido aquí se edita en su sitio; uno del
     catálogo horneado guarda solo la diferencia */
  const nuevo = local().nuevos.find(x => x.id === id);
  if (nuevo) {
    Object.assign(nuevo, cambios);
  } else {
    local().ediciones[id] = { ...(local().ediciones[id] || {}), ...cambios };
    limpiarEdicion(id);
  }

  avisar();
  return { ok: true };
}

/* Si una edición acaba coincidiendo con el original, se borra:
   así el export solo lleva cambios de verdad */
function limpiarEdicion(id) {
  const original = CATALOGO.find(p => p.id === id);
  const edit = local().ediciones[id];
  if (!original || !edit) return;

  for (const k of Object.keys(edit)) {
    const igual = (original[k] ?? null) === (edit[k] ?? null);
    if (igual) delete edit[k];
  }
  if (!Object.keys(edit).length) delete local().ediciones[id];
}

export function archivarProducto(id, archivar = true) {
  return editarProducto(id, { a: archivar || undefined });
}

/* Deshace todos los cambios locales de un producto */
export function restaurarProducto(id) {
  delete local().ediciones[id];
  avisar();
}

/* Un producto nacido aquí y del que te arrepientes en el momento.
   Solo se permite si nunca ha salido en un ticket ni en la lista:
   a partir de ahí se archiva como cualquier otro. */
export function puedeBorrarse(id) {
  const esNuevo = local().nuevos.some(x => x.id === id);
  if (!esNuevo) return false;
  const enTicket = datos.tickets.some(t => t.lineas.some(l => l.id === id));
  const enLista = id in datos.lista;
  return !enTicket && !enLista;
}

export function borrarProductoNuevo(id) {
  if (!puedeBorrarse(id)) return { ok: false, error: 'Ya se ha usado. Archívalo.' };
  local().nuevos = local().nuevos.filter(x => x.id !== id);
  avisar();
  return { ok: true };
}

/* ---------- catalogar un pendiente ---------- */

export function catalogarPendiente(clave, { c, f, u, e }) {
  const p = datos.pendientes.find(x => x.clave === clave);
  if (!p) return { ok: false, error: 'Ese pendiente ya no está.' };

  const r = crearProducto({ n: p.nombre, c, f, u, e });
  if (!r.ok) return r;

  /* Los precios que ya se conocían del pendiente pasan al
     producto nuevo, para no perder lo aprendido */
  if (p.precio != null && p.tiendas.length) {
    if (!datos.preciosLocal[r.producto.id]) datos.preciosLocal[r.producto.id] = {};
    for (const t of p.tiendas) {
      datos.preciosLocal[r.producto.id][t] = {
        f: p.precio, b: null, q: null, u: null,
        d: (p.ultima || new Date().toISOString()).slice(0, 10)
      };
    }
  }

  datos.pendientes = datos.pendientes.filter(x => x.clave !== clave);
  avisar();
  return { ok: true, producto: r.producto };
}

/* ---------- iconos ---------- */

export function rutaDe(p) { return rutaIcono(p); }
export function slugDe(p) { return slug(p.n); }

/* Comprueba de verdad qué SVG existen en el servidor.
   Se hace bajo petición y de poco en poco: son muchas peticiones
   y no tiene sentido lanzarlas al abrir la app. */
export async function comprobarIconos(productos, alProgresar) {
  const resultado = { hay: [], faltan: [] };
  const tanda = 12;

  for (let i = 0; i < productos.length; i += tanda) {
    const trozo = productos.slice(i, i + tanda);
    await Promise.all(trozo.map(async p => {
      const ruta = rutaIcono(p);
      try {
        const r = await fetch(ruta, { method: 'HEAD', cache: 'no-store' });
        (r.ok ? resultado.hay : resultado.faltan).push({ producto: p, ruta });
      } catch {
        resultado.faltan.push({ producto: p, ruta });
      }
    }));
    alProgresar?.(Math.min(i + tanda, productos.length), productos.length);
  }

  resultado.hay.sort((a, b) => a.ruta.localeCompare(b.ruta));
  resultado.faltan.sort((a, b) => a.ruta.localeCompare(b.ruta));
  return resultado;
}

/* ---------- export para regenerar el catálogo ---------- */

/* Instantánea completa. Lleva el catálogo ya mezclado más el
   detalle de qué se ha tocado, para poder comparar la base
   anterior con la actual sin ambigüedades. */
export function exportar() {
  const todos = catalogoCompleto();
  const ed = local().ediciones;
  const nuevos = local().nuevos;

  return {
    app: 'lista-compra-luckstudio',
    exportado: new Date().toISOString(),
    schema: datos.schema,
    catalogoVersion: CATALOGO_VERSION,

    resumen: {
      productos: todos.length,
      activos: todos.filter(p => !p.a).length,
      nuevos: nuevos.length,
      editados: Object.keys(ed).length,
      archivados: todos.filter(p => p.a).length,
      conPrecio: Object.keys(datos.preciosLocal).length,
      pendientes: datos.pendientes.length,
      tickets: datos.tickets.length
    },

    /* Catálogo completo tal y como debe quedar horneado */
    productos: todos.map(p => ({
      id: p.id, n: p.n, c: p.c, f: p.f, u: p.u,
      e: p.e ?? null,
      t: preferencias(p.id),
      a: p.a ? true : undefined,
      p: datos.preciosLocal[p.id] || undefined,
      icono: rutaIcono(p)
    })),

    /* Qué ha cambiado respecto a la base horneada */
    cambios: {
      nuevos: nuevos.map(p => p.id),
      editados: Object.entries(ed).map(([id, campos]) => ({
        id: +id, campos, antes: CATALOGO.find(p => p.id === +id) || null
      })),
      preferencias: datos.prefTienda
    },

    pendientes: datos.pendientes,
    categorias: CATEGORIAS,
    tiendas: TIENDAS,
    tiendasPropias: datos.tiendasLocal?.propias || []
  };
}

/* ---------- importar una instantánea ---------- */

export function importarSnapshot(texto) {
  let s;
  try { s = JSON.parse(String(texto).trim()); }
  catch { return { ok: false, error: 'Eso no es una copia válida.' }; }

  if (!s || s.app !== 'lista-compra-luckstudio') {
    return { ok: false, error: 'Esa copia no es de esta aplicación.' };
  }
  if (!Array.isArray(s.productos)) {
    return { ok: false, error: 'A la copia le faltan los productos.' };
  }

  /* Se reconstruye la capa local a partir de la instantánea:
     todo lo que no esté en el catálogo horneado pasa a ser un
     producto nuevo, y lo que difiera pasa a ser una edición. */
  const nuevos = [];
  const ediciones = {};
  const precios = {};
  const prefs = {};

  for (const p of s.productos) {
    if (!Number.isFinite(p.id) || typeof p.n !== 'string') continue;
    const original = CATALOGO.find(x => x.id === p.id);
    const limpio = {
      id: p.id, n: p.n.trim(), c: p.c, f: +p.f || 2,
      u: ['kg', 'l', 'ud'].includes(p.u) ? p.u : 'ud',
      e: p.e || null
    };
    if (p.a) limpio.a = true;

    if (!original) {
      nuevos.push(limpio);
    } else {
      /* Ya está horneado: solo se guarda lo que difiera, nunca
         como producto nuevo, o quedaría duplicado */
      const diff = {};
      for (const k of ['n', 'c', 'f', 'u', 'e', 'a']) {
        if ((limpio[k] ?? null) !== (original[k] ?? null)) diff[k] = limpio[k];
      }
      if (Object.keys(diff).length) ediciones[p.id] = diff;
    }

    if (p.p && typeof p.p === 'object') precios[p.id] = p.p;
    if (Array.isArray(p.t) && p.t.length) prefs[p.id] = p.t;
    else if (typeof p.t === 'string' && p.t) prefs[p.id] = [p.t];
  }

  /* Las tiendas propias vuelven antes que nada: las preferencias
     y los precios apuntan a sus ids */
  if (Array.isArray(s.tiendasPropias)) {
    datos.tiendasLocal = {
      propias: s.tiendasPropias.filter(t => t && t.id && t.nombre),
      ediciones: datos.tiendasLocal?.ediciones || {}
    };
  }

  datos.catalogoLocal = { ediciones, nuevos };
  datos.preciosLocal = precios;
  datos.prefTienda = prefs;
  if (Array.isArray(s.pendientes)) datos.pendientes = s.pendientes;

  reconstruirTiendas();
  avisar();

  return {
    ok: true,
    productos: s.productos.length,
    nuevos: nuevos.length,
    editados: Object.keys(ediciones).length
  };
}

/* ---------- diagnóstico ---------- */

export function estadoCatalogo() {
  const todos = catalogoCompleto();

  /* Se cuentan los que de verdad siguen siendo locales. Uno que
     ya se haya horneado deja de contar, aunque su copia siga en
     el dispositivo: decir "1 sin consolidar" de algo ya
     consolidado invita a volver a exportarlo para nada. */
  const nuevosVivos = todos.filter(p => p.esNuevo).length;
  const editados = Object.keys(local().ediciones).length;

  return {
    total: todos.length,
    activos: todos.filter(p => !p.a).length,
    archivados: todos.filter(p => p.a).length,
    nuevos: nuevosVivos,
    editados,
    sinCambios: !nuevosVivos && !editados
  };
}

/* Copias locales que ya están en el catálogo horneado y por
   tanto sobran. Se pueden limpiar sin perder nada. */
export function localesRedundantes() {
  const horneados = new Set(CATALOGO.map(p => p.id));
  return (local().nuevos || []).filter(p => horneados.has(p.id));
}

export function limpiarRedundantes() {
  const horneados = new Set(CATALOGO.map(p => p.id));
  const antes = local().nuevos.length;
  local().nuevos = local().nuevos.filter(p => !horneados.has(p.id));
  const quitados = antes - local().nuevos.length;
  if (quitados) avisar();
  return quitados;
}
