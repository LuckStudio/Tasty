/* Pruebas de la búsqueda de productos. Ejecutar:  node tests/busqueda.test.mjs */
import assert from 'node:assert/strict';
import { app } from './_app.mjs';
const B = await app('js/busqueda.js');

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log('  ok  ', nombre); } catch (e) { console.error('  FALLA', nombre, '\n ', e.message); process.exitCode = 1; } };

const P = [
  { id: 1, n: 'Yogur natural', c: 'lacteos', u: 'ud' }, { id: 2, n: 'Yogur griego', c: 'lacteos', u: 'ud' },
  { id: 3, n: 'Yogur de fresa', c: 'lacteos', u: 'ud' }, { id: 4, n: 'Yogur archivado', c: 'lacteos', u: 'ud', a: true },
  { id: 5, n: 'Tomate', c: 'verduras', u: 'kg' }, { id: 6, n: 'Leche', c: 'lacteos', u: 'l' }
];
const filas = {
  1: [{ tienda: 'mercadona', base: 1.2, formato: 1.2, cantidad: 8, unidad: 'ud' }, { tienda: 'dia', base: 1.1, formato: 1.1 }],
  2: [{ tienda: 'mercadona', base: 2.47, formato: 1.85, cantidad: 6, unidad: 'ud' }],
  3: [],
  5: [{ tienda: 'dia', base: 1.99, formato: 1.99 }]
};
const ctx = {
  filasDe: id => filas[id] || [],
  seccionDe: p => (p.c === 'verduras' ? 'fruta-verdura' : 'lacteos-huevos'),
  enLista: id => ({ 1: 3 }[id] || 0)
};
const nombres = r => r.map(x => x.p.n);

test('texto sin tildes ni mayúsculas; los archivados nunca salen', () => {
  assert.deepEqual(nombres(B.buscarProductos({ texto: 'YOGUR' }, P, ctx)), ['Yogur de fresa', 'Yogur griego', 'Yogur natural']);
  assert.equal(B.buscarProductos({ texto: 'yogúr' }, P, ctx).length, 3);    // las tildes no cuentan al buscar
  assert.equal(B.buscarProductos({ texto: 'archivado' }, P, ctx).length, 0);
});
test('sin texto salen todos los activos', () => assert.equal(B.buscarProductos({}, P, ctx).length, 5));
test('filtro por sección', () => {
  assert.deepEqual(nombres(B.buscarProductos({ seccion: 'fruta-verdura' }, P, ctx)), ['Tomate']);
});
test('ordenar por precio: el más barato primero y los sin precio al final', () => {
  const r = B.buscarProductos({ texto: 'yogur', orden: 'precio' }, P, ctx);
  assert.deepEqual(nombres(r), ['Yogur natural', 'Yogur griego', 'Yogur de fresa']);   // 1,10 · 2,47 · sin precio
  const d = B.buscarProductos({ texto: 'yogur', orden: 'precio-desc' }, P, ctx);
  assert.deepEqual(nombres(d), ['Yogur griego', 'Yogur natural', 'Yogur de fresa']);   // el sin precio sigue último
});
test('sin tienda elegida se muestra el precio más barato conocido', () => {
  const r = B.buscarProductos({ texto: 'natural' }, P, ctx)[0];
  assert.equal(r.fila.tienda, 'mercadona');    // la primera con base; el orden de filas lo da preciosDe (ya por precio)
});
test('con tienda elegida se muestra SU precio, y se avisa si no lo tiene (sin esconderlo)', () => {
  const r = B.buscarProductos({ texto: 'yogur', tienda: 'dia' }, P, ctx);
  assert.equal(r.find(x => x.p.id === 1).fila.base, 1.1);
  assert.equal(r.find(x => x.p.id === 2).sinPrecioEnTienda, true);
  assert.equal(r.length, 3);
});
test('cantidad en la lista', () => assert.equal(B.buscarProductos({ texto: 'natural' }, P, ctx)[0].enLista, 3));
test('formato legible', () => {
  assert.equal(B.textoFormato({ cantidad: 500, unidad: 'g' }, P[4]), '500 g');
  assert.equal(B.textoFormato({ cantidad: 1.5, unidad: 'l' }, P[5]), '1,5 L');
  assert.equal(B.textoFormato(null, P[4]), 'Se vende por kg');
  assert.equal(B.textoFormato(null, P[0]), 'Por unidad');
});

console.log(`\n${n} pruebas${process.exitCode ? ' (hay fallos)' : ' correctas'}`);
