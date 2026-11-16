/* ============================================================
   DIETA Y RECETAS
   ------------------------------------------------------------
   Cada receta pertenece a una comida del día y a un plan.

   PLANES
     dieta     "Dieta estricta". Aparece primero.
     varias    "Recetas varias". Lo que vas viendo por ahí.

   ACTIVAS E INACTIVAS
     Una receta activa es de las que rotas ahora mismo. Las
     inactivas no desaparecen: siguen consultables para ver qué
     harían falta, pero no cuentan al calcular la compra.

   La gracia del invento: cada receta lleva sus ingredientes
   enlazados al catálogo, así que la app puede decir qué falta
   para poder cocinar lo que tienes planeado.
   ============================================================ */

import { datos, guardar } from './almacen.js?v=25';
import { POR_ID, PRODUCTOS } from './estado.js?v=25';
import { nuevoId, normalizar } from './util.js?v=25';

export const COMIDAS = [
  { id: 'desayuno', nombre: 'Desayuno', orden: 1 },
  { id: 'almuerzo', nombre: 'Almuerzo', orden: 2 },
  { id: 'comida',   nombre: 'Comida',   orden: 3 },
  { id: 'merienda', nombre: 'Merienda', orden: 4 },
  { id: 'cena',     nombre: 'Cena',     orden: 5 }
];

export const PLANES = [
  { id: 'dieta',  nombre: 'Dieta estricta', orden: 1 },
  { id: 'varias', nombre: 'Recetas varias', orden: 2 }
];

export const COMIDA_POR_ID = Object.fromEntries(COMIDAS.map(c => [c.id, c]));
export const PLAN_POR_ID = Object.fromEntries(PLANES.map(p => [p.id, p]));

const oyentes = new Set();
export function suscribirRecetas(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
function avisar() {
  guardar();
  oyentes.forEach(fn => fn());
}

const todas = () => datos.recetas || [];

/* ---------- lectura ---------- */

export function recetas({ comida, plan, soloActivas } = {}) {
  let lista = todas();
  if (comida) lista = lista.filter(r => r.comida === comida);
  if (plan) lista = lista.filter(r => r.plan === plan);
  if (soloActivas) lista = lista.filter(r => r.activa);

  return lista.sort((a, b) =>
    (PLAN_POR_ID[a.plan]?.orden ?? 9) - (PLAN_POR_ID[b.plan]?.orden ?? 9)
    || (b.activa - a.activa)
    || a.nombre.localeCompare(b.nombre, 'es'));
}

export function recetaPorId(id) {
  return todas().find(r => r.id === id) || null;
}

export function cuentaPorComida(comida) {
  const lista = todas().filter(r => r.comida === comida);
  return { total: lista.length, activas: lista.filter(r => r.activa).length };
}

/* ---------- alta y edición ---------- */

export function crearReceta({ nombre, comida, plan, activa, notas }) {
  const limpio = String(nombre || '').trim();
  if (!limpio) return { ok: false, error: 'Ponle un nombre.' };
  if (!COMIDA_POR_ID[comida]) return { ok: false, error: 'Elige a qué comida va.' };

  const repetida = todas().find(
    r => normalizar(r.nombre) === normalizar(limpio) && r.comida === comida);
  if (repetida) return { ok: false, error: `Ya tienes «${repetida.nombre}» ahí.` };

  const receta = {
    id: nuevoId('r'),
    nombre: limpio,
    comida,
    plan: PLAN_POR_ID[plan] ? plan : 'varias',
    activa: activa !== false,
    raciones: 2,
    notas: String(notas || '').trim(),
    ingredientes: []       // { id, cant, unidad, texto }
  };

  if (!datos.recetas) datos.recetas = [];
  datos.recetas.push(receta);
  avisar();
  return { ok: true, receta };
}

export function editarReceta(id, cambios) {
  const r = recetaPorId(id);
  if (!r) return { ok: false, error: 'Esa receta ya no está.' };

  if (cambios.nombre !== undefined) {
    const limpio = String(cambios.nombre).trim();
    if (!limpio) return { ok: false, error: 'El nombre no puede quedar vacío.' };
    cambios.nombre = limpio;
  }
  Object.assign(r, cambios);
  avisar();
  return { ok: true };
}

export function borrarReceta(id) {
  datos.recetas = todas().filter(r => r.id !== id);
  avisar();
}

export function alternarActiva(id) {
  const r = recetaPorId(id);
  if (!r) return;
  r.activa = !r.activa;
  avisar();
}

/* ---------- ingredientes ---------- */

/* Un ingrediente puede estar enlazado al catálogo (y entonces
   cuenta para la compra) o ser texto suelto (y entonces solo
   sirve para leerlo al cocinar). */
export function anadirIngrediente(idReceta, { id, texto, cant, unidad }) {
  const r = recetaPorId(idReceta);
  if (!r) return { ok: false, error: 'Esa receta ya no está.' };

  const producto = id && POR_ID[id] ? POR_ID[id] : null;
  const nombre = producto ? producto.n : String(texto || '').trim();
  if (!nombre) return { ok: false, error: 'Le falta el nombre.' };

  const yaEsta = r.ingredientes.some(
    x => producto ? x.id === producto.id : normalizar(x.texto || '') === normalizar(nombre));
  if (yaEsta) return { ok: false, error: `${nombre} ya está en la receta.` };

  r.ingredientes.push({
    id: producto ? producto.id : null,
    texto: producto ? null : nombre,
    cant: Number.isFinite(+cant) && +cant > 0 ? +cant : 1,
    unidad: unidad || (producto ? producto.u : 'ud')
  });
  avisar();
  return { ok: true };
}

export function quitarIngrediente(idReceta, i) {
  const r = recetaPorId(idReceta);
  if (!r) return;
  r.ingredientes.splice(i, 1);
  avisar();
}

export function cambiarIngrediente(idReceta, i, cambios) {
  const r = recetaPorId(idReceta);
  const ing = r?.ingredientes[i];
  if (!ing) return;
  if (cambios.cant !== undefined) {
    const n = parseFloat(String(cambios.cant).replace(',', '.'));
    ing.cant = Number.isFinite(n) && n > 0 ? n : 1;
  }
  if (cambios.unidad !== undefined) ing.unidad = cambios.unidad;
  avisar();
}

export function nombreIngrediente(ing) {
  return ing.id ? (POR_ID[ing.id]?.n || 'Producto retirado') : ing.texto;
}

/* ---------- qué falta para cocinar ---------- */

/* Todo lo que hace falta para las recetas activas, sumando las
   cantidades cuando un mismo producto sale en varias. */
export function ingredientesNecesarios({ comida, plan, soloActivas = true } = {}) {
  const acumulado = new Map();

  for (const r of recetas({ comida, plan, soloActivas })) {
    for (const ing of r.ingredientes) {
      const clave = ing.id ? `p${ing.id}` : `t${normalizar(ing.texto || '')}`;
      const ficha = acumulado.get(clave) || {
        id: ing.id, texto: ing.texto, unidad: ing.unidad,
        cant: 0, recetas: []
      };
      /* Solo se suman cantidades de la misma unidad; si no
         coinciden se deja constancia en vez de inventar una
         conversión que podría estar mal */
      if (ficha.unidad === ing.unidad) ficha.cant += ing.cant;
      else ficha.mezcla = true;
      ficha.recetas.push(r.nombre);
      acumulado.set(clave, ficha);
    }
  }

  return [...acumulado.values()]
    .sort((a, b) => b.recetas.length - a.recetas.length);
}

/* De lo necesario, qué no está en la lista de la compra.
   No sabe lo que tienes en la despensa: eso la app no puede
   saberlo, así que lo que hace es comparar con la lista.

   Los ingredientes de texto suelto se buscan entre los añadidos
   a mano, comparando sin acentos ni mayúsculas. */
export function faltaPorAnadir(opciones = {}) {
  const libres = (datos.libres || []).map(normalizar);

  return ingredientesNecesarios(opciones).filter(ing => {
    if (ing.id) return !datos.lista[ing.id];
    return !libres.includes(normalizar(ing.texto || ''));
  });
}

/* Qué recetas se podrían hacer con lo que hay en la lista */
export function recetasCubiertas() {
  const filas = [];

  for (const r of recetas({ soloActivas: true })) {
    const conProducto = r.ingredientes.filter(i => i.id);
    if (!conProducto.length) continue;

    const tengo = conProducto.filter(i => datos.lista[i.id]).length;
    filas.push({
      receta: r,
      tengo,
      total: conProducto.length,
      faltan: conProducto.filter(i => !datos.lista[i.id])
        .map(i => POR_ID[i.id]?.n).filter(Boolean),
      pct: Math.round(tengo / conProducto.length * 100)
    });
  }

  return filas.sort((a, b) => b.pct - a.pct);
}

/* ---------- volcar a la lista ---------- */

/* Devuelve los productos a añadir; quien llama decide cómo
   meterlos en la lista, para no duplicar aquí esa lógica. */
export function productosDe(opciones = {}) {
  return ingredientesNecesarios(opciones)
    .filter(ing => ing.id && POR_ID[ing.id])
    .map(ing => ing.id);
}

export function textosDe(opciones = {}) {
  return ingredientesNecesarios(opciones)
    .filter(ing => !ing.id && ing.texto)
    .map(ing => ing.texto);
}

/* ---------- buscador de productos para el editor ---------- */

export function buscarParaReceta(texto, limite = 8) {
  const q = normalizar(String(texto).trim());
  if (!q) return [];
  return PRODUCTOS.filter(p => normalizar(p.n).includes(q)).slice(0, limite);
}

/* ============================================================
   EXPORTAR E IMPORTAR RECETAS
   ------------------------------------------------------------
   El formato lleva los ingredientes con SU NOMBRE además del id.
   El id sirve para reconectar con el catálogo al importar; el
   nombre sirve para que un humano lo pueda leer y editar, y para
   poder recuperar el enlace si los ids no coinciden entre
   dispositivos.
   ============================================================ */

export const FORMATO_RECETAS = 'lista-compra-recetas';

export function exportarRecetas() {
  return {
    formato: FORMATO_RECETAS,
    version: 1,
    exportado: new Date().toISOString(),
    resumen: {
      total: todas().length,
      activas: todas().filter(r => r.activa).length,
      porComida: Object.fromEntries(
        COMIDAS.map(c => [c.id, todas().filter(r => r.comida === c.id).length]))
    },
    comidas: COMIDAS,
    planes: PLANES,
    recetas: todas().map(r => ({
      id: r.id,
      nombre: r.nombre,
      comida: r.comida,
      plan: r.plan,
      activa: r.activa,
      raciones: r.raciones ?? 2,
      notas: r.notas || '',
      ingredientes: r.ingredientes.map(i => ({
        id: i.id,
        nombre: nombreIngrediente(i),
        cant: i.cant,
        unidad: i.unidad
      }))
    }))
  };
}

/* Versión legible, para mandarla por mensaje o guardarla */
export function recetasTexto() {
  const partes = ['RECETAS', ''];

  for (const c of COMIDAS) {
    const suyas = recetas({ comida: c.id });
    if (!suyas.length) continue;
    partes.push(c.nombre.toUpperCase());

    for (const r of suyas) {
      partes.push(`  ${r.nombre}${r.activa ? '' : '  (inactiva)'}` +
                  `  ·  ${PLAN_POR_ID[r.plan]?.nombre}`);
      for (const i of r.ingredientes) {
        partes.push(`     - ${nombreIngrediente(i)}: ${i.cant} ${i.unidad}`);
      }
      if (r.notas) partes.push(`     ${r.notas}`);
      partes.push('');
    }
  }
  return partes.join('\n');
}

/* ---------- importar ---------- */

export function validarRecetas(texto) {
  let d;
  try { d = JSON.parse(String(texto).trim()); }
  catch { return { ok: false, error: 'Eso no es un archivo de recetas válido.' }; }

  if (!d || typeof d !== 'object') {
    return { ok: false, error: 'El contenido no tiene forma de recetario.' };
  }
  if (!Array.isArray(d.recetas)) {
    return { ok: false, error: 'No se encuentran las recetas dentro.' };
  }
  return { ok: true, datos: d };
}

/* Reconecta cada ingrediente con el catálogo:
   primero por id, y si ese id ya no existe, por nombre. Así un
   recetario escrito en otro dispositivo sigue funcionando. */
function reconectar(ing) {
  if (Number.isFinite(ing.id) && POR_ID[ing.id]) {
    return { id: ing.id, texto: null };
  }
  const nombre = String(ing.nombre || ing.texto || '').trim();
  if (!nombre) return null;

  const q = normalizar(nombre);
  const encontrado = PRODUCTOS.find(p => normalizar(p.n) === q)
    || PRODUCTOS.find(p => normalizar(p.n).includes(q) && q.length > 3);

  return encontrado
    ? { id: encontrado.id, texto: null }
    : { id: null, texto: nombre };
}

/* Fusiona: lo que coincide por nombre y comida se sobrescribe,
   lo demás se añade. Nunca se pierde lo que ya había. */
export function importarRecetas(d, { sustituir = false } = {}) {
  if (!datos.recetas) datos.recetas = [];
  if (sustituir) datos.recetas = [];

  const informe = { nuevas: 0, actualizadas: 0, ingredientes: 0, sinEnlazar: [] };

  for (const r of d.recetas) {
    const nombre = String(r.nombre || '').trim();
    if (!nombre) continue;

    const comida = COMIDA_POR_ID[r.comida] ? r.comida : 'comida';
    const plan = PLAN_POR_ID[r.plan] ? r.plan : 'varias';

    const ingredientes = [];
    for (const i of (r.ingredientes || [])) {
      const enlace = reconectar(i);
      if (!enlace) continue;
      if (!enlace.id) informe.sinEnlazar.push(enlace.texto);
      ingredientes.push({
        id: enlace.id,
        texto: enlace.texto,
        cant: Number.isFinite(+i.cant) && +i.cant > 0 ? +i.cant : 1,
        unidad: i.unidad || 'ud'
      });
      informe.ingredientes++;
    }

    const existente = datos.recetas.find(
      x => normalizar(x.nombre) === normalizar(nombre) && x.comida === comida);

    if (existente) {
      existente.plan = plan;
      existente.activa = r.activa !== false;
      existente.raciones = r.raciones ?? existente.raciones ?? 2;
      existente.notas = String(r.notas || existente.notas || '');
      existente.ingredientes = ingredientes;
      informe.actualizadas++;
    } else {
      datos.recetas.push({
        id: nuevoId('r'),
        nombre, comida, plan,
        activa: r.activa !== false,
        raciones: r.raciones ?? 2,
        notas: String(r.notas || ''),
        ingredientes
      });
      informe.nuevas++;
    }
  }

  informe.sinEnlazar = [...new Set(informe.sinEnlazar)];
  avisar();
  return informe;
}

/* ---------- resumen ---------- */

export function resumenDieta() {
  const lista = todas();
  return {
    total: lista.length,
    activas: lista.filter(r => r.activa).length,
    ingredientes: ingredientesNecesarios().length,
    faltan: faltaPorAnadir().length
  };
}
