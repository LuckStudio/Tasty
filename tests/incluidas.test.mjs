/* Pruebas de las recetas que vienen con la app (carga automática).
   Ejecutar:  node tests/incluidas.test.mjs */
import assert from 'node:assert/strict';
import { app } from './_app.mjs';

const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };

const { datos } = await app('js/almacen.js');
const E = await app('js/estado.js');
const R = await app('js/recetas.js');
const { RECETAS_NOVIEMBRE: N } = await app('datos/recetas-noviembre.js');
const PAQUETES = [{ id: 'noviembre-2026', paquete: N }];

let n = 0;
const cola = [];
const test = (nombre, fn) => cola.push([nombre, fn]);
const reiniciar = () => { datos.recetas = []; delete datos.ajustes.paquetes; };

test('en un arranque nuevo las 14 recetas ya están dentro, sin pulsar nada', () => {
  reiniciar();
  assert.deepEqual(R.cargarPaquetesIncluidos(PAQUETES), ['noviembre-2026']);
  assert.equal(datos.recetas.length, 14);
  assert.deepEqual(datos.ajustes.paquetes, ['noviembre-2026']);
  const por = {};
  for (const r of datos.recetas) por[r.comida] = (por[r.comida] || 0) + 1;
  assert.deepEqual(por, { desayuno: 3, comida: 4, merienda: 3, cena: 4 });
});
test('todas quedan activas, con pasos, y con todos sus ingredientes enlazados al catálogo', () => {
  for (const r of datos.recetas) {
    assert.equal(r.activa, true, r.nombre);
    assert.ok(r.pasos.length >= 1, r.nombre);
    assert.ok(r.ingredientes.length >= 3, r.nombre);
    for (const i of r.ingredientes) assert.ok(i.id && E.POR_ID[i.id], `${r.nombre}: ${i.nombre || i.texto}`);
  }
});
test('los ingredientes de las recetas son productos visibles de la app (no archivados)', () => {
  const ids = new Set(datos.recetas.flatMap(r => r.ingredientes.map(i => i.id)));
  assert.ok(ids.size >= 30);
  for (const id of ids) assert.ok(E.PRODUCTOS.some(p => p.id === id), `producto ${id} no sale en el catálogo`);
  for (const nuevo of ['Tortillas integrales', 'Langostinos', 'Harina de arroz', 'Tomate cherry', 'Canela', 'Orégano']) {
    assert.ok(E.PRODUCTOS.some(p => p.n === nuevo), nuevo);
  }
});
test('arrancar otra vez no duplica nada ni vuelve a cargar', () => {
  assert.deepEqual(R.cargarPaquetesIncluidos(PAQUETES), []);
  assert.equal(datos.recetas.length, 14);
});
test('una receta que borras NO vuelve a aparecer en el siguiente arranque', () => {
  const borrada = datos.recetas.find(r => r.nombre === 'Batido rápido');
  R.borrarReceta(borrada.id);
  assert.equal(datos.recetas.length, 13);
  assert.deepEqual(R.cargarPaquetesIncluidos(PAQUETES), []);
  assert.equal(datos.recetas.length, 13);
  assert.equal(datos.recetas.some(r => r.nombre === 'Batido rápido'), false);
});
test('lo que editas se conserva: una receta que ya tenías no se pisa y solo se añaden las que faltan', () => {
  reiniciar();
  datos.recetas.push({ id: 'mia', nombre: 'Tacos de pescado', comida: 'cena', plan: 'varias', activa: false, raciones: 4,
    notas: 'a mi manera', ingredientes: [{ id: 402, cant: 200, unidad: 'g' }], pasos: [{ texto: 'Mis pasos' }] });
  datos.recetas.push({ id: 'propia', nombre: 'Mi receta', comida: 'comida', plan: 'varias', activa: true, raciones: 2, notas: '', ingredientes: [], pasos: [] });
  R.cargarPaquetesIncluidos(PAQUETES);
  assert.equal(datos.recetas.length, 15);                  // 2 tuyas + 13 nuevas (los tacos no se duplican)
  const tacos = datos.recetas.filter(r => r.nombre === 'Tacos de pescado');
  assert.equal(tacos.length, 1);
  assert.deepEqual([tacos[0].id, tacos[0].raciones, tacos[0].notas, tacos[0].activa], ['mia', 4, 'a mi manera', false]);
  assert.equal(tacos[0].pasos[0].texto, 'Mis pasos');
  assert.ok(datos.recetas.some(r => r.id === 'propia'));
});
test('quien ya las había cargado a mano antes no pierde nada (no se pisan sus ediciones)', () => {
  reiniciar();
  R.importarRecetas(N);                                    // como antes, con el botón
  R.editarReceta('r-tacos-de-pescado-cena', { raciones: 3, favorita: true });
  delete datos.ajustes.paquetes;                           // sin la marca nueva
  R.cargarPaquetesIncluidos(PAQUETES);
  const t = R.recetaPorId('r-tacos-de-pescado-cena');
  assert.deepEqual([datos.recetas.length, t.raciones, t.favorita], [14, 3, true]);
});
test('la marca de «cargado» no se rompe con datos raros', () => {
  reiniciar();
  datos.ajustes.paquetes = 'basura';
  R.cargarPaquetesIncluidos(PAQUETES);
  assert.equal(datos.recetas.length, 14);
  assert.ok(Array.isArray(datos.ajustes.paquetes));
});
test('el botón «Restaurar» sí vuelve a dejarlas como vienen de serie', () => {
  R.editarReceta('r-tacos-de-pescado-cena', { raciones: 9, notas: 'cambiada' });
  R.importarRecetas(N);
  const t = R.recetaPorId('r-tacos-de-pescado-cena');
  assert.deepEqual([t.raciones, t.notas.startsWith('Dos tortillas')], [1, true]);
  assert.equal(datos.recetas.filter(r => r.nombre === 'Tacos de pescado').length, 1);
});

for (const [nombre, fn] of cola) {
  try { await fn(); n++; console.log('  ok  ', nombre); }
  catch (e) { console.error('  FALLA', nombre, '\n ', e.message); process.exitCode = 1; }
}
console.log(`\n${n} pruebas${process.exitCode ? ' (hay fallos)' : ' correctas'}`);
