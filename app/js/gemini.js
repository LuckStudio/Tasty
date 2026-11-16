/* ============================================================
   GEMINI — acceso a la API con el modelo siempre al día (M9)
   ------------------------------------------------------------
   Esta app no tiene servidor, así que la llamada sale directa
   del dispositivo a Google. Por eso:

   · LA CLAVE LA PONE EL USUARIO en Ajustes y vive solo en este
     dispositivo (localStorage). Nunca va en el código, ni en el
     repositorio, ni en las copias de datos que se exportan.
   · Es una clave para uso privado del hogar. Si algún día la app
     se hace pública o con cuentas, la llamada tendrá que pasar a
     un servidor (ver docs/PLAN-DE-DESARROLLO.md).

   EL MODELO SE ELIGE SOLO
     1. Se pide a Google el listado de modelos.
     2. Se descartan los que no generan texto/imagen o no son de
        uso general (embeddings, voz, imagen generada, live...).
     3. Se ordenan: versión más reciente primero; a igual versión,
        estable antes que preview; a igual estabilidad, flash,
        luego flash-lite y al final pro (la capa gratuita suele
        cubrir flash y flash-lite).
     4. La elección se guarda 24 h para no preguntar en cada foto.
     5. PLAN B: si el modelo falla (no existe, cuota agotada,
        servicio saturado) se prueba el siguiente de la lista.
   Se puede forzar un modelo a mano desde Ajustes.
   ============================================================ */

const API = 'https://generativelanguage.googleapis.com/v1beta';

const K_CLAVE  = 'tasty_gemini_clave';
const K_MANUAL = 'tasty_gemini_modelo_manual';
const K_CACHE  = 'tasty_gemini_modelos';
const K_ULTIMO = 'tasty_gemini_ultimo_usado';

export const CACHE_MS = 24 * 60 * 60 * 1000;

/* Códigos HTTP tras los que merece la pena probar otro modelo */
const SE_REINTENTA = new Set([404, 429, 500, 502, 503, 504]);

/* ---------- almacenamiento seguro (puede fallar en privado) ---------- */

function leer(k) { try { return localStorage.getItem(k); } catch { return null; } }
function escribir(k, v) { try { localStorage.setItem(k, v); } catch { /* sin espacio o bloqueado */ } }
function quitar(k) { try { localStorage.removeItem(k); } catch { /* nada */ } }

/* ---------- clave ---------- */

export function hayClave() { return !!leer(K_CLAVE); }

/* Para enseñar al usuario sin revelarla entera */
export function claveEnmascarada() {
  const c = leer(K_CLAVE);
  return c ? '••••••••' + c.slice(-4) : '';
}

export function guardarClave(texto) {
  const limpia = String(texto || '').trim();
  /* Las claves de Google AI Studio son una sola palabra sin espacios */
  if (!/^[A-Za-z0-9_-]{20,}$/.test(limpia)) {
    return { ok: false, error: 'Eso no parece una clave de Gemini. Cópiala entera, sin espacios.' };
  }
  escribir(K_CLAVE, limpia);
  quitar(K_CACHE);                 // otra clave puede ver otros modelos
  return { ok: true };
}

export function borrarClave() {
  quitar(K_CLAVE);
  quitar(K_CACHE);
  quitar(K_ULTIMO);
}

/* ---------- ajuste manual y último modelo usado ---------- */

export function modeloManual() { return leer(K_MANUAL) || ''; }
export function fijarModeloManual(nombre) {
  nombre ? escribir(K_MANUAL, nombre) : quitar(K_MANUAL);
}
export function ultimoModeloUsado() { return leer(K_ULTIMO) || ''; }

/* ---------- elegir modelos (función pura, probada aparte) ---------- */

const EXCLUIDOS = /(embedding|aqa|tts|image|imagen|veo|live|audio|native|robotics|computer|learnlm|gemma|exp|thinking|vision|nano|deep-research|customtools|latest)/;
const TIER = { 'flash': 0, 'flash-lite': 1, 'pro': 2 };

/* models/gemini-2.5-flash-lite  ->  { version: 2.5, tier: 'flash-lite', estable: true } */
export function analizarModelo(m) {
  const nombre = String(m.name || '').replace(/^models\//, '');
  if (!Array.isArray(m.supportedGenerationMethods)
      || !m.supportedGenerationMethods.includes('generateContent')) return null;

  const r = /^gemini-(\d+(?:\.\d+)?)-(flash-lite|flash|pro)(?:-(.+))?$/.exec(nombre);
  if (!r) return null;

  const sufijo = r[3] || '';
  if (EXCLUIDOS.test(sufijo)) return null;

  /* Un sufijo con fecha (-001, -09-2025) sigue siendo estable;
     "preview" no */
  const estable = !/preview/.test(sufijo);
  return { nombre, version: parseFloat(r[1]), tier: r[2], estable, sufijo };
}

export function ordenarModelos(lista) {
  const validos = (lista || []).map(analizarModelo).filter(Boolean);
  validos.sort((a, b) =>
    b.version - a.version
    || (b.estable - a.estable)
    || (TIER[a.tier] - TIER[b.tier])
    || a.sufijo.length - b.sufijo.length          // el nombre más corto = el principal
    || a.nombre.localeCompare(b.nombre));

  /* Sin repetidos (varias fechas del mismo modelo) */
  const vistos = new Set();
  const salida = [];
  for (const m of validos) {
    const k = `${m.version}-${m.tier}-${m.estable}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    salida.push(m.nombre);
  }
  return salida;
}

/* ---------- errores ---------- */

export class ErrorGemini extends Error {
  constructor(codigo, mensaje, estado) {
    super(mensaje);
    this.codigo = codigo;       // sin-clave | clave | cuota | red | respuesta | modelos
    this.estado = estado;
  }
}

function errorDeEstado(estado, cuerpo) {
  const detalle = cuerpo?.error?.message || '';
  if (estado === 400 && /API key|API_KEY/i.test(detalle)) {
    return new ErrorGemini('clave', 'La clave de Gemini no es válida.', estado);
  }
  if (estado === 401 || estado === 403) {
    return new ErrorGemini('clave', 'Google ha rechazado la clave. Revisa que esté bien copiada y activa.', estado);
  }
  if (estado === 429) {
    return new ErrorGemini('cuota', 'Se ha agotado la cuota gratuita de Gemini. Prueba en un rato.', estado);
  }
  return new ErrorGemini('respuesta', `Gemini respondió con un error (${estado}). ${detalle}`.trim(), estado);
}

async function llamar(url, opciones) {
  let res;
  try {
    res = await fetch(url, opciones);
  } catch {
    throw new ErrorGemini('red', 'No hay conexión con Gemini. Comprueba internet.');
  }
  let cuerpo = null;
  try { cuerpo = await res.json(); } catch { /* sin cuerpo */ }
  if (!res.ok) throw errorDeEstado(res.status, cuerpo);
  return cuerpo;
}

/* ---------- listado de modelos con caché ---------- */

export async function modelosDisponibles({ refrescar = false } = {}) {
  const clave = leer(K_CLAVE);
  if (!clave) throw new ErrorGemini('sin-clave', 'Falta la clave de Gemini. Añádela en Ajustes.');

  if (!refrescar) {
    try {
      const c = JSON.parse(leer(K_CACHE) || 'null');
      if (c && Array.isArray(c.modelos) && c.modelos.length
          && Date.now() - c.t < CACHE_MS) return c.modelos;
    } catch { /* caché corrupta: se ignora */ }
  }

  const todos = [];
  let pagina = '';
  for (let i = 0; i < 5; i++) {           // tope de seguridad
    const cuerpo = await llamar(
      `${API}/models?pageSize=1000${pagina ? '&pageToken=' + encodeURIComponent(pagina) : ''}`,
      { headers: { 'x-goog-api-key': clave } });
    todos.push(...(cuerpo.models || []));
    pagina = cuerpo.nextPageToken;
    if (!pagina) break;
  }

  const modelos = ordenarModelos(todos);
  if (!modelos.length) {
    throw new ErrorGemini('modelos', 'Google no ha devuelto ningún modelo compatible.');
  }
  escribir(K_CACHE, JSON.stringify({ t: Date.now(), modelos }));
  return modelos;
}

/* Lo que hay en caché, sin llamar a la red (para pintar Ajustes) */
export function modelosEnCache() {
  try {
    const c = JSON.parse(leer(K_CACHE) || 'null');
    return c && Array.isArray(c.modelos) ? c.modelos : [];
  } catch { return []; }
}

/* ---------- generar contenido ---------- */

/* partes: [{ text } | { inlineData: { mimeType, data } }]
   esquema: responseSchema de Gemini para forzar JSON
   Devuelve { texto, modelo }. */
export async function generar({ partes, esquema, temperatura = 0 }) {
  const clave = leer(K_CLAVE);
  if (!clave) throw new ErrorGemini('sin-clave', 'Falta la clave de Gemini. Añádela en Ajustes.');

  /* Orden de intentos: el manual (si lo hay), luego los automáticos */
  const manual = modeloManual();
  let candidatos = manual ? [manual] : [];
  try {
    const auto = await modelosDisponibles();
    candidatos = [...candidatos, ...auto.filter(m => m !== manual)];
  } catch (e) {
    /* Si no se puede listar pero hay uno manual, se intenta igualmente */
    if (!candidatos.length) throw e;
  }

  let ultimoError = null;
  for (const modelo of candidatos.slice(0, 6)) {     // no se prueban todos: serían minutos
    try {
      const cuerpo = await llamar(`${API}/models/${modelo}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: partes }],
          generationConfig: {
            temperature: temperatura,
            ...(esquema ? { responseMimeType: 'application/json', responseSchema: esquema } : {})
          }
        })
      });

      const texto = cuerpo?.candidates?.[0]?.content?.parts
        ?.map(p => p.text || '').join('') || '';
      if (!texto) {
        const motivo = cuerpo?.promptFeedback?.blockReason || cuerpo?.candidates?.[0]?.finishReason;
        throw new ErrorGemini('respuesta', `Gemini no devolvió texto${motivo ? ' (' + motivo + ')' : ''}.`, 200);
      }
      escribir(K_ULTIMO, modelo);
      return { texto, modelo };
    } catch (e) {
      ultimoError = e;
      /* La clave mala o la falta de red no se arreglan cambiando de modelo */
      if (e.codigo === 'clave' || e.codigo === 'red') throw e;
      /* Errores de este modelo: se prueba el siguiente */
      const reintentable = e.codigo === 'cuota' || SE_REINTENTA.has(e.estado) || e.estado === 200;
      if (!reintentable) throw e;
    }
  }
  throw ultimoError || new ErrorGemini('modelos', 'No hay ningún modelo disponible.');
}

/* Comprobación rápida desde Ajustes */
export async function probar() {
  const { texto, modelo } = await generar({ partes: [{ text: 'Responde solo con la palabra: ok' }] });
  return { modelo, respuesta: texto.trim().slice(0, 40) };
}
