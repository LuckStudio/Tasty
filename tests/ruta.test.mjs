/* Pruebas de la ruta de compra. Ejecutar:  node tests/ruta.test.mjs */
import assert from 'node:assert/strict';
import { app } from './_app.mjs';

const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };

const { datos } = await app('js/almacen.js');
const E = await app('js/estado.js');
const R = await app('js/ruta.js');
const S = await app('js/secciones.js');
E.reconstruirCatalogo();

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log('  ok  ', nombre); } catch (e) { console.error('  FALLA', nombre, '\n ', e.message); process.exitCode = 1; } };

/* ids reales: 110 Kiwi (frutas), 301 pollo?, 503 Yogur natural (lacteos) */
const linea = (id, extra = {}) => ({ k: 'p', id, n: E.POR_ID[id].n, c: E.POR_ID[id].c, cant: 1, hecho: false, precio: null, ...extra });
const carne = Object.values(E.POR_ID).find(p => p.c === 'carne').id;
const lineas = [linea(110), linea(carne), linea(503), { k: 'l', n: 'cosa a mano', cant: 1, hecho: false }];

test('agrupa según la ruta: el orden lo manda la tienda, no la categoría', () => {
  const g1 = R.gruposDeCompra(lineas, { orden: ['carnes', 'lacteos-huevos', 'fruta-verdura'] });
  assert.deepEqual(g1.map(g => g.seccion), ['carnes', 'lacteos-huevos', 'fruta-verdura', 'sin-seccion']);
  const g2 = R.gruposDeCompra(lineas, { orden: ['fruta-verdura', 'carnes', 'lacteos-huevos'] });
  assert.deepEqual(g2.map(g => g.seccion).slice(0, 3), ['fruta-verdura', 'carnes', 'lacteos-huevos']);
});
test('numera los grupos y cuenta lo hecho', () => {
  const l = lineas.map(x => ({ ...x }));
  l[1].hecho = true;
  const g = R.gruposDeCompra(l, { orden: ['carnes'] });
  assert.deepEqual(g.map(x => x.numero), [1, 2, 3, 4]);
  assert.deepEqual([g[0].hechos, g[0].total], [1, 1]);
});
test('lo escrito a mano va a «Sin sección» y se conservan los índices originales', () => {
  const g = R.gruposDeCompra(lineas, {});
  const sin = g.find(x => x.seccion === 'sin-seccion');
  assert.equal(sin.items[0].l.n, 'cosa a mano');
  assert.equal(sin.items[0].i, 3);
});
test('lo hecho baja al final de su sección', () => {
  const dos = [linea(110, { hecho: true }), linea(E.PRODUCTOS.find(p => p.c === 'frutas' && p.id !== 110).id)];
  const g = R.gruposDeCompra(dos, {});
  assert.equal(g[0].items[0].hecho, false);
  assert.equal(g[0].items[1].hecho, true);
});
test('una sección oculta en esa tienda: sus productos pasan a «Sin sección», no desaparecen', () => {
  const g = R.gruposDeCompra(lineas, { orden: ['carnes'], ocultas: ['lacteos-huevos'] });
  assert.equal(g.some(x => x.seccion === 'lacteos-huevos'), false);
  assert.ok(g.find(x => x.seccion === 'sin-seccion').items.some(x => x.l.id === 503));
});
test('sección actual: la primera con algo pendiente', () => {
  const g = R.gruposDeCompra(lineas.map(x => ({ ...x })), { orden: ['fruta-verdura', 'carnes'] });
  assert.equal(R.seccionActual(g), 0);
  g[0].hechos = g[0].total;
  assert.equal(R.seccionActual(g), 1);
  for (const x of g) x.hechos = x.total;
  assert.equal(R.seccionActual(g), g.length - 1);
  assert.equal(R.seccionActual([]), 0);
});

test('estimar por tienda: suma lo que tiene precio ahí y cuenta aparte lo que no', () => {
  datos.preciosLocal[110] = { mercadona: { f: 1.75, b: 3.49, d: '2026-11-01' } };
  datos.preciosLocal[503] = { mercadona: { f: 1.2, b: 1.2, d: '2026-11-01' }, dia: { f: 1.1, b: 1.1, d: '2026-11-01' } };
  const l = [linea(110, { cant: 2 }), linea(503), linea(carne)];
  assert.deepEqual(R.estimarLineas(l, 'mercadona'), { total: 4.7, conocidos: 2, sinPrecio: 1 });
  assert.deepEqual(R.estimarLineas(l, 'dia'), { total: 1.1, conocidos: 1, sinPrecio: 2 });
  assert.deepEqual(R.estimarLineas(l, 'lidl'), { total: 0, conocidos: 0, sinPrecio: 3 });
  assert.equal(R.estimarLineas([{ k: 'l', n: 'x' }], 'dia').sinPrecio, 0);       // lo escrito a mano no cuenta
});

test('última tienda y última vez: la de un ticket o la de la última elección, la más reciente', () => {
  assert.equal(R.ultimaVez('mercadona'), null);
  datos.tickets.push({ id: 't', fecha: '2026-11-10T10:00:00.000Z', tienda: 'mercadona', lineas: [] });
  assert.equal(R.ultimaVez('mercadona'), '2026-11-10T10:00:00.000Z');
  R.recordarTienda('mercadona', new Date('2026-11-14T09:00:00Z'));
  assert.equal(R.ultimaVez('mercadona'), '2026-11-14T09:00:00.000Z');
  assert.equal(R.ultimaTienda(), 'mercadona');
});
test('«hace N días»', () => {
  const ahora = new Date('2026-11-16T12:00:00Z').getTime();
  assert.equal(R.textoHace('2026-11-16T08:00:00Z', ahora), 'hoy');
  assert.equal(R.textoHace('2026-11-15T08:00:00Z', ahora), 'ayer');
  assert.equal(R.textoHace('2026-11-10T08:00:00Z', ahora), 'hace 6 días');
  assert.equal(R.textoHace('2026-08-10T08:00:00Z', ahora), 'hace 3 meses');
  assert.equal(R.textoHace(null, ahora), null);
});
test('orden de tiendas: la última usada primero', () => {
  const t = [{ id: 'dia', orden: 5 }, { id: 'mercadona', orden: 1 }, { id: 'lidl', orden: 4 }];
  R.recordarTienda('lidl');
  assert.equal(R.ordenarTiendas(t)[0].id, 'lidl');
});
test('vista previa de la ruta: los primeros pasillos visibles, en su orden', () => {
  S.colocarSeccion('t1', 'carnes', 0); S.colocarSeccion('t1', 'platos-preparados', 1);
  S.ocultarSeccion('t1', 'platos-preparados');
  const r = R.resumenRuta('t1', 3);
  assert.equal(r[0], 'Carnes');
  assert.equal(r.includes('Platos preparados'), false);
  assert.equal(r.length, 3);
});

console.log(`\n${n} pruebas${process.exitCode ? ' (hay fallos)' : ' correctas'}`);
