/* Pruebas de lo cocinado, el hogar y la copia de seguridad.
   Ejecutar:  node tests/cocina.test.mjs */
import assert from 'node:assert/strict';
import { app } from './_app.mjs';

const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };

const { datos } = await app('js/almacen.js');
const E = await app('js/estado.js');
const R = await app('js/recetas.js');
const D = await app('js/despensa.js');
const C = await app('js/cocina.js');
const H = await app('js/hogar.js');
const IO = await app('js/datos-io.js');
const { RECETAS_NOVIEMBRE } = await app('datos/recetas-noviembre.js');
R.importarRecetas(RECETAS_NOVIEMBRE);
E.reconstruirCatalogo();

let n = 0;
const cola = [];
const test = (nombre, fn) => cola.push([nombre, fn]);
const TORTITAS = 'r-tortitas-de-platano-desayuno', TACOS = 'r-tacos-de-pescado-cena';

test('se apunta cuándo se cocinó cada receta; la última vez es la más reciente', () => {
  assert.equal(C.ultimaVezCocinada(TACOS), null);
  assert.equal(C.registrarCocinada(TACOS, '2026-11-02'), true);
  assert.equal(C.registrarCocinada(TACOS, '2026-11-16'), true);
  assert.equal(C.registrarCocinada(TACOS, '2026-11-09'), true);
  assert.equal(C.ultimaVezCocinada(TACOS), '2026-11-16');
  assert.equal(C.vecesCocinada(TACOS), 3);
  assert.deepEqual(datos.cocinadas[TACOS], ['2026-11-16', '2026-11-09', '2026-11-02']);
});
test('el mismo día no cuenta dos veces y solo se guardan las 12 últimas', () => {
  C.registrarCocinada(TACOS, '2026-11-16');
  assert.equal(C.vecesCocinada(TACOS), 3);
  for (let d = 1; d <= 20; d++) C.registrarCocinada(TORTITAS, `2026-10-${String(d).padStart(2, '0')}`);
  assert.equal(C.vecesCocinada(TORTITAS), 12);
  assert.equal(C.ultimaVezCocinada(TORTITAS), '2026-10-20');
});
test('datos no válidos se rechazan', () => {
  assert.equal(C.registrarCocinada('no-existe', '2026-11-16'), false);
  assert.equal(C.registrarCocinada(TACOS, 'ayer'), false);
  assert.equal(C.ultimaVezCocinada('__proto__'), null);
  assert.equal(C.vecesCocinada('constructor'), 0);
});
test('«hace N días» legible', () => {
  const h = '2026-11-16';
  assert.equal(C.textoHace('2026-11-16', h), 'hoy');
  assert.equal(C.textoHace('2026-11-15', h), 'ayer');
  assert.equal(C.textoHace('2026-11-04', h), 'hace 12 días');
  assert.equal(C.textoHace('2026-10-26', h), 'hace 3 semanas');
  assert.equal(C.textoHace('2026-08-16', h), 'hace 3 meses');
  assert.equal(C.textoHace(null, h), null);
  assert.equal(C.textoHace('2026-12-01', h), 'hoy');            // una fecha futura no da «hace -15 días»
});
test('«He terminado de cocinar»: descuenta lo usado, apunta la receta y cuenta lo que no pudo cuantificar', () => {
  D.fijarStock(501, 5, 'ud'); D.fijarStock(101, 500, 'g'); D.fijarStock(743, 1000, 'g'); D.fijarStock(519, 1000, 'ml');
  const r = C.terminarDeCocinar([{ receta: R.recetaPorId(TORTITAS), raciones: 2 }], '2026-11-17');
  assert.deepEqual([r.recetas, r.descontados, r.sinCuantificar], [1, 4, 0]);
  assert.equal(D.stockDe(501).cant, 3);                     // 2 huevos
  assert.equal(D.stockDe(101).cant, 380);                   // 120 g de plátano
  assert.equal(C.ultimaVezCocinada(TORTITAS), '2026-11-17');
});
test('terminar con una receta que ya no existe se ignora sin romper nada', () => {
  const r = C.terminarDeCocinar([{ receta: { id: 'fantasma', raciones: 1, ingredientes: [] }, raciones: 1 }]);
  assert.equal(r.recetas, 0);
});

test('personas del hogar: por defecto 1, entre 1 y 12', () => {
  assert.equal(H.personas(), 1);
  assert.equal(H.fijarPersonas(2), 2);
  assert.equal(H.personas(), 2);
  assert.equal(H.fijarPersonas(99), 12);
  assert.equal(H.fijarPersonas(0), 1);
  assert.equal(H.fijarPersonas('x'), 1);
  datos.ajustes.personas = 'basura'; assert.equal(H.personas(), 1);
  H.fijarPersonas(2);
});

test('aviso de copia de seguridad: no avisa a quien no tiene nada que guardar', () => {
  const ahora = new Date('2026-11-17T10:00:00Z').getTime();
  datos.tickets = []; datos.despensa = {}; datos.menu = {};
  assert.equal(H.avisoDeCopia(ahora), null);
});
test('aviso de copia: si hay datos y nunca se hizo, avisa; si se hizo hace poco, no; a los 30 días, sí', () => {
  const ahora = new Date('2026-11-17T10:00:00Z').getTime();
  datos.tickets = [{ id: 't', fecha: '2026-11-01T10:00:00Z', lineas: [], total: 1 }];
  assert.deepEqual(H.avisoDeCopia(ahora), { dias: null });
  H.copiaHecha(new Date('2026-11-10T10:00:00Z'));
  assert.equal(H.avisoDeCopia(ahora), null);
  assert.deepEqual(H.avisoDeCopia(new Date('2026-12-15T10:00:00Z').getTime()), { dias: 35 });
});
test('«más tarde» pospone el aviso una semana y hacer la copia lo borra', () => {
  const t0 = new Date('2026-12-15T10:00:00Z').getTime();
  H.posponerAvisoDeCopia(t0);
  assert.equal(H.avisoDeCopia(t0 + 3 * 86400000), null);
  assert.deepEqual(H.avisoDeCopia(t0 + 8 * 86400000), { dias: 35 + 8 });
  H.posponerAvisoDeCopia(t0);
  H.copiaHecha(new Date(t0));
  assert.equal(datos.ajustes.copiaPospuesta, undefined);
  assert.equal(H.avisoDeCopia(t0 + 86400000), null);
});
test('generar el texto de la copia por sí solo no cuenta como haberla hecho (solo guardarla o copiarla)', () => {
  datos.ajustes.ultimaCopia = '2020-01-01T00:00:00.000Z';
  IO.copiaTexto();                                         // el texto de la copia no cambia la fecha: solo guardarla
  assert.equal(datos.ajustes.ultimaCopia, '2020-01-01T00:00:00.000Z');
});

test('bienvenida: se enseña solo a quien no usa todavía la app', () => {
  delete datos.ajustes.bienvenida; datos.tickets = []; datos.lista = {}; datos.menu = {};
  assert.equal(H.hayQueDarLaBienvenida(), true);
  H.marcarBienvenida();
  assert.equal(H.hayQueDarLaBienvenida(), false);
  delete datos.ajustes.bienvenida;
  datos.lista = { 110: 1 };
  assert.equal(H.hayQueDarLaBienvenida(), false);          // ya la usa: no se le interrumpe
  datos.lista = {};
});

test('las copias llevan lo cocinado y lo restauran unido, sin pasarse de 12 ni aceptar basura', () => {
  const copia = JSON.parse(IO.copiaTexto());
  assert.deepEqual(copia.cocinadas[TACOS], ['2026-11-16', '2026-11-09', '2026-11-02']);
  delete datos.cocinadas[TACOS];
  IO.fusionar(copia);
  assert.deepEqual(datos.cocinadas[TACOS], ['2026-11-16', '2026-11-09', '2026-11-02']);
  IO.fusionar({ formato: 'lista-compra-luckstudio-copia', cocinadas: {
    [TACOS]: ['2026-11-20', 'ayer', 5, null], '__proto__': ['2026-01-01'], '../../x': ['2026-01-01'], 'otra': 'no-es-lista' } });
  assert.equal(datos.cocinadas[TACOS][0], '2026-11-20');
  assert.equal(datos.cocinadas[TACOS].length, 4);          // 3 + la fecha válida; «ayer», 5 y null se descartan
  assert.equal({}[0], undefined);
  assert.equal(datos.cocinadas['../../x'], undefined);
  assert.equal(datos.cocinadas.otra, undefined);
});

for (const [nombre, fn] of cola) {
  try { await fn(); n++; console.log('  ok  ', nombre); }
  catch (e) { console.error('  FALLA', nombre, '\n ', e.message); process.exitCode = 1; }
}
console.log(`\n${n} pruebas${process.exitCode ? ' (hay fallos)' : ' correctas'}`);
