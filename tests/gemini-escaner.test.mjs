/* Pruebas de la lógica de Gemini y del escáner (sin navegador ni red).
   Ejecutar:  node tests/gemini-escaner.test.mjs */
import assert from 'node:assert/strict';
import { app } from './_app.mjs';

/* --- simulacros del navegador --- */
const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k)
};
let llamadas = [];
let respuestas = [];
globalThis.fetch = async (url, op) => {
  llamadas.push({ url, op });
  const r = respuestas.shift();
  if (!r) throw new Error('fetch sin respuesta preparada: ' + url);
  if (r === 'red') throw new TypeError('network');
  return { ok: r.status < 400, status: r.status, json: async () => r.cuerpo };
};
const ok = cuerpo => ({ status: 200, cuerpo });
const ko = (status, message = '') => ({ status, cuerpo: { error: { message } } });

const G = await app('js/gemini.js');
const E = await app('js/escaner.js');

let n = 0;
const test = async (nombre, fn) => {
  mem.clear(); llamadas = []; respuestas = [];
  try { await fn(); n++; console.log('  ok  ', nombre); }
  catch (e) { console.error('  FALLA', nombre, '\n', e); process.exitCode = 1; }
};
const m = (name, metodos = ['generateContent']) => ({ name: 'models/' + name, supportedGenerationMethods: metodos });
const CLAVE = 'AIzaSyEjemploFalsoParaPruebas_1234567890';

console.log('Gemini');
await test('ordena: versión nueva primero, estable antes que preview, flash antes que pro', () => {
  const orden = G.ordenarModelos([
    m('gemini-2.0-flash'), m('gemini-2.5-pro'), m('gemini-2.5-flash'),
    m('gemini-2.5-flash-lite'), m('gemini-3-flash-preview'), m('gemini-3-pro-preview')
  ]);
  assert.deepEqual(orden, ['gemini-3-flash-preview', 'gemini-3-pro-preview',
    'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-2.0-flash']);
});
await test('descarta embeddings, tts, imagen, live y los que no generan contenido', () => {
  const orden = G.ordenarModelos([
    m('gemini-2.5-flash'), m('gemini-2.5-flash-preview-tts'), m('gemini-2.5-flash-image'),
    m('gemini-2.0-flash-live-001'), m('gemini-embedding-001', ['embedContent']),
    m('gemma-3-27b-it'), m('gemini-2.0-flash-exp'), m('gemini-flash-latest'),
    m('gemini-2.5-pro', ['countTokens'])
  ]);
  assert.deepEqual(orden, ['gemini-2.5-flash']);
});
await test('varias fechas del mismo modelo cuentan una vez', () => {
  const orden = G.ordenarModelos([m('gemini-2.0-flash-001'), m('gemini-2.0-flash'), m('gemini-2.0-flash-lite')]);
  assert.deepEqual(orden, ['gemini-2.0-flash', 'gemini-2.0-flash-lite']);
});
await test('guardarClave rechaza basura y acepta una clave con forma de clave', () => {
  assert.equal(G.guardarClave('hola').ok, false);
  assert.equal(G.guardarClave('con espacios aqui 12345678901234567890').ok, false);
  assert.equal(G.guardarClave(CLAVE).ok, true);
  assert.equal(G.hayClave(), true);
  assert.equal(G.claveEnmascarada().endsWith('7890'), true);
  assert.equal(G.claveEnmascarada().includes('AIza'), false);
});
await test('sin clave no hay llamadas de red', async () => {
  await assert.rejects(G.generar({ partes: [{ text: 'x' }] }), e => e.codigo === 'sin-clave');
  assert.equal(llamadas.length, 0);
});
await test('la clave va en cabecera, nunca en la URL', async () => {
  G.guardarClave(CLAVE);
  respuestas.push(ok({ models: [m('gemini-2.5-flash')] }));
  respuestas.push(ok({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }));
  await G.generar({ partes: [{ text: 'hola' }] });
  for (const l of llamadas) {
    assert.equal(l.url.includes(CLAVE), false);
    assert.equal(l.op.headers['x-goog-api-key'], CLAVE);
  }
});
await test('cachea el listado 24 h: la segunda vez no lo vuelve a pedir', async () => {
  G.guardarClave(CLAVE);
  respuestas.push(ok({ models: [m('gemini-2.5-flash')] }));
  respuestas.push(ok({ candidates: [{ content: { parts: [{ text: 'a' }] } }] }));
  respuestas.push(ok({ candidates: [{ content: { parts: [{ text: 'b' }] } }] }));
  await G.generar({ partes: [{ text: '1' }] });
  await G.generar({ partes: [{ text: '2' }] });
  assert.equal(llamadas.filter(l => l.url.includes('/models?')).length, 1);
});
await test('la caché caduca pasadas 24 h', async () => {
  G.guardarClave(CLAVE);
  const antes = Date.now;
  respuestas.push(ok({ models: [m('gemini-2.5-flash')] }));
  await G.modelosDisponibles();
  Date.now = () => antes() + G.CACHE_MS + 1000;
  respuestas.push(ok({ models: [m('gemini-3-flash')] }));
  const l = await G.modelosDisponibles();
  Date.now = antes;
  assert.deepEqual(l, ['gemini-3-flash']);
});
await test('PLAN B: si el primero da 429 o 503 prueba el siguiente', async () => {
  G.guardarClave(CLAVE);
  respuestas.push(ok({ models: [m('gemini-3-flash'), m('gemini-2.5-flash'), m('gemini-2.0-flash')] }));
  respuestas.push(ko(429, 'quota'));
  respuestas.push(ko(503, 'overloaded'));
  respuestas.push(ok({ candidates: [{ content: { parts: [{ text: 'hecho' }] } }] }));
  const r = await G.generar({ partes: [{ text: 'x' }] });
  assert.equal(r.modelo, 'gemini-2.0-flash');
  assert.equal(G.ultimoModeloUsado(), 'gemini-2.0-flash');
});
await test('una clave rechazada NO prueba más modelos', async () => {
  G.guardarClave(CLAVE);
  respuestas.push(ok({ models: [m('gemini-3-flash'), m('gemini-2.5-flash')] }));
  respuestas.push(ko(400, 'API key not valid. Please pass a valid API key.'));
  await assert.rejects(G.generar({ partes: [{ text: 'x' }] }), e => e.codigo === 'clave');
  assert.equal(llamadas.length, 2);
});
await test('sin conexión da un error de red claro', async () => {
  G.guardarClave(CLAVE);
  respuestas.push('red');
  await assert.rejects(G.generar({ partes: [{ text: 'x' }] }), e => e.codigo === 'red');
});
await test('el modelo manual se prueba primero', async () => {
  G.guardarClave(CLAVE);
  G.fijarModeloManual('gemini-2.0-flash');
  respuestas.push(ok({ models: [m('gemini-3-flash')] }));
  respuestas.push(ok({ candidates: [{ content: { parts: [{ text: 'x' }] } }] }));
  const r = await G.generar({ partes: [{ text: 'x' }] });
  assert.equal(r.modelo, 'gemini-2.0-flash');
});
await test('si falla el listado pero hay modelo manual, se usa igualmente', async () => {
  G.guardarClave(CLAVE);
  G.fijarModeloManual('gemini-2.0-flash');
  respuestas.push(ko(500));
  respuestas.push(ok({ candidates: [{ content: { parts: [{ text: 'x' }] } }] }));
  assert.equal((await G.generar({ partes: [{ text: 'x' }] })).modelo, 'gemini-2.0-flash');
});

console.log('Escáner');
await test('normaliza una lectura normal y detecta que cuadra con el total', () => {
  const r = E.normalizarLectura(JSON.stringify({
    tienda: 'Mercadona Aragonia', fecha: '2026-11-16', total: 5.35,
    lineas: [
      { texto: 'PECHUGA POLLO', cant: 1, importe: 3.45 },
      { texto: 'KIWI VERDE', cant: 1, importe: 1.90, peso_kg: 0.545, precio_kg: 3.49 }
    ]
  }));
  assert.equal(r.ok, true);
  assert.equal(r.suma, 5.35);
  assert.equal(r.cuadra, true);
  assert.equal(r.lineas[1].pesoKg, 0.545);
});
await test('avisa si la suma no cuadra con el total', () => {
  const r = E.normalizarLectura(JSON.stringify({ total: 10, lineas: [{ texto: 'A', importe: 3 }] }));
  assert.equal(r.cuadra, false);
});
await test('acepta números con coma y JSON envuelto en ```json', () => {
  const r = E.normalizarLectura('```json\n{"lineas":[{"texto":"Leche","cant":"2","importe":"1,29"}]}\n```');
  assert.equal(r.ok, true);
  assert.equal(r.lineas[0].importe, 1.29);
  assert.equal(r.lineas[0].cant, 2);
});
await test('descarta líneas rotas y fechas imposibles', () => {
  const r = E.normalizarLectura(JSON.stringify({
    fecha: '2099-01-01',
    lineas: [{ texto: '', importe: 1 }, { texto: 'X' }, null, { texto: 'Pan', importe: 0.8 }]
  }));
  assert.equal(r.lineas.length, 1);
  assert.equal(r.fecha, null);
});
await test('respuestas inservibles dan errores en español', () => {
  assert.equal(E.normalizarLectura('esto no es json').ok, false);
  assert.equal(E.normalizarLectura('{"lineas":[]}').ok, false);
  assert.equal(E.normalizarLectura('{"x":1}').ok, false);
});

await test('SEGURIDAD: el texto de la foto no puede traer HTML ni comillas', () => {
  const r = E.normalizarLectura(JSON.stringify({
    tienda: 'Super<script>alert(1)</script>',
    lineas: [{ texto: '<img src=x onerror=alert(1)> LECHE" onfocus="x', importe: 1 }]
  }));
  assert.equal(/[<>"'`]/.test(r.lineas[0].texto), false);
  assert.equal(/[<>"'`]/.test(r.tiendaTexto), false);
});

const CAT = [
  { id: 1, n: 'Kiwi', c: 'frutas' }, { id: 2, n: 'Tomate', c: 'verduras' },
  { id: 3, n: 'Tomate frito', c: 'despensa' }, { id: 4, n: 'Leche', c: 'lacteos' },
  { id: 5, n: 'Huevos', c: 'lacteos' }, { id: 6, n: 'Judías verdes', c: 'verduras' },
  { id: 7, n: 'Queso fresco', c: 'lacteos' }
];
await test('enlaza abreviaturas habituales con el catálogo', () => {
  assert.equal(E.proponerProducto('BANDEJA KIWI 500 G', CAT).nombre, 'Kiwi');
  assert.equal(E.proponerProducto('KIWIS', CAT).nombre, 'Kiwi');
  assert.equal(E.proponerProducto('HUEVOS L x12', CAT).nombre, 'Huevos');
  assert.equal(E.proponerProducto('JUDIAS VERDES', CAT).nombre, 'Judías verdes');
});
await test('entre "Tomate" y "Tomate frito" gana el más específico', () => {
  assert.equal(E.proponerProducto('TOMATE FRITO', CAT).nombre, 'Tomate frito');
  assert.equal(E.proponerProducto('TOMATE PERA', CAT).nombre, 'Tomate');
});
await test('si no se parece a nada devuelve null (no inventa)', () => {
  assert.equal(E.proponerProducto('HACENDADO MEZCLA 4', CAT), null);
  assert.equal(E.proponerProducto('Q. FR. BATIDO 0%', CAT), null);
});
await test('el borrador solo enlaza solo con seguridad alta y guarda el texto original', () => {
  const lectura = E.normalizarLectura(JSON.stringify({
    tienda: 'MERCADONA ARAGONIA', fecha: '2026-11-16', total: 4.2,
    lineas: [{ texto: 'KIWI VERDE', importe: 1.75 }, { texto: 'HACENDADO MEZCLA 4', importe: 1.85 },
             { texto: 'LECHE ENTERA', importe: 0.6 }]
  }));
  const b = E.aBorrador(lectura, { productos: CAT, tiendas: [{ id: 'mercadona', nombre: 'Mercadona' }, { id: 'dia', nombre: 'Dia' }] });
  assert.equal(b.tienda, 'mercadona');
  assert.equal(b.lineas[0].id, 1);
  assert.equal(b.lineas[1].id, null);
  assert.equal(b.lineas[1].n, 'HACENDADO MEZCLA 4');
  assert.equal(b.lineas[1].textoTicket, 'HACENDADO MEZCLA 4');
  assert.equal(b.escaneado.cuadra, true);
});

await test('la memoria de equivalencias enlaza sola, aunque el nombre no se parezca', () => {
  const lectura = E.normalizarLectura(JSON.stringify({
    tienda: 'Mercadona', lineas: [{ texto: 'HACENDADO MEZCLA 4', importe: 1.85 }, { texto: 'Q. FR. BATIDO 0%', importe: 1.39 }]
  }));
  const memoria = (tienda, texto) => (tienda === 'mercadona' && texto === 'HACENDADO MEZCLA 4' ? 7 : null);
  const b = E.aBorrador(lectura, { productos: CAT, tiendas: [{ id: 'mercadona', nombre: 'Mercadona' }], buscarAlias: memoria });
  assert.equal(b.lineas[0].id, 7);
  assert.equal(b.lineas[0].n, 'Queso fresco');
  assert.equal(b.lineas[0].porMemoria, true);
  assert.equal(b.lineas[1].id, null);
});
await test('un enlace recordado a un producto que ya no existe se ignora', () => {
  const lectura = E.normalizarLectura(JSON.stringify({ tienda: 'Mercadona', lineas: [{ texto: 'COSA RARA', importe: 1 }] }));
  const b = E.aBorrador(lectura, { productos: CAT, tiendas: [{ id: 'mercadona', nombre: 'Mercadona' }], buscarAlias: () => 12345 });
  assert.equal(b.lineas[0].id, null);
  assert.equal(b.lineas[0].porMemoria, false);
});

await test('candidatos parecidos: por palabra, por abreviatura y sin repetir lo excluido', () => {
  const cat = [...CAT, { id: 8, n: 'Mezcla de lechugas', c: 'verduras' }, { id: 9, n: 'Frutos secos mix', c: 'despensa' },
    { id: 10, n: 'Queso rallado 4 quesos', c: 'lacteos' }, { id: 11, n: 'Batido de chocolate', c: 'lacteos' }];
  assert.equal(E.buscarCandidatos('HACENDADO MEZCLA 4', cat)[0].n, 'Mezcla de lechugas');
  assert.equal(E.buscarCandidatos('BATID CHOC', cat)[0].n, 'Batido de chocolate');
  /* con un parecido fuerte (batido) las abreviaturas de 2 letras son ruido */
  assert.deepEqual(E.buscarCandidatos('Q. FR. BATIDO 0%', cat).map(p => p.n), ['Batido de chocolate']);
  /* sin nada fuerte, la abreviatura sí orienta */
  assert.equal(E.buscarCandidatos('Q. FR.', cat).some(p => p.n === 'Queso fresco'), true);
  assert.equal(E.buscarCandidatos('MEZCLA', cat, { excluir: [8] }).some(p => p.id === 8), false);
  assert.deepEqual(E.buscarCandidatos('ZZZ QQQ', cat), []);
  assert.deepEqual(E.buscarCandidatos('', cat), []);
  assert.ok(E.buscarCandidatos('QUESO', cat, { max: 2 }).length <= 2);
});

console.log(`\n${n} pruebas correctas${process.exitCode ? ' (hay fallos)' : ''}`);
