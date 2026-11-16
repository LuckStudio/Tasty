/* Pruebas del teclado de cantidad. Ejecutar:  node tests/cantidad.test.mjs */
import assert from 'node:assert/strict';
import { app } from './_app.mjs';
const C = await app('js/cantidad.js');

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log('  ok  ', nombre); } catch (e) { console.error('  FALLA', nombre, '\n ', e.message); process.exitCode = 1; } };
const kiwi = { u: 'kg', pu: 85 }, queso = { u: 'kg' }, leche = { u: 'l' }, huevos = { u: 'ud' };
const teclas = (est, s) => [...s].reduce((e, t) => C.teclear(e, t), est);

test('modos: por peso y unidades solo si se sabe el peso de una unidad', () => {
  assert.deepEqual(C.modosDe(kiwi), ['peso', 'unidades']);
  assert.deepEqual(C.modosDe(queso), ['peso']);
  assert.deepEqual(C.modosDe(huevos), ['unidades']);
  assert.equal(C.nombreModo('peso', leche), 'Por volumen');
});
test('el ejemplo del PDF: kiwi 500 g a 3,49 €/kg ≈ 6 kiwis · 1,75 €', () => {
  const est = teclas(C.estadoInicial(kiwi), '500');
  assert.equal(C.mostrar(est, kiwi), '500 g');
  const a = C.aproximacion(est, kiwi, 3.49);
  assert.equal(a.texto, '≈ 6 unidades · 1,75 €');          // 500/85 = 5,9 → 6
  assert.equal(a.precio, 1.75);
});
test('el teclado: dígitos, borrar y C', () => {
  let e = teclas(C.estadoInicial(kiwi), '250');
  assert.equal(e.valor, 250);
  e = C.teclear(e, '<'); assert.equal(e.valor, 25);
  e = C.teclear(e, 'C'); assert.equal(e.valor, 0);
  assert.equal(C.teclear(e, '<').valor, 0);            // borrar con 0 no da negativos
});
test('tope: no deja pasarse de 99.999', () => {
  assert.equal(teclas(C.estadoInicial(kiwi), '999999').valor, 99999);
});
test('1500 g se ve y se guarda como 1,5 kg; 750 ml como 750 ml', () => {
  const e = teclas(C.estadoInicial(kiwi), '1500');
  assert.equal(C.mostrar(e, kiwi), '1,5 kg');
  assert.deepEqual(C.leer(e, kiwi), { v: 1.5, u: 'kg' });
  assert.deepEqual(C.leer(teclas(C.estadoInicial(leche), '750'), leche), { v: 750, u: 'ml' });
  assert.deepEqual(C.leer(teclas(C.estadoInicial(leche), '2000'), leche), { v: 2, u: 'l' });
});
test('atajos: 250 g, 500 g, 750 g, 1 kg', () => {
  const e0 = C.estadoInicial(kiwi);
  const a = C.atajosDe(e0, kiwi);
  assert.deepEqual(a.map(x => x.v + x.u), ['250g', '500g', '750g', '1kg']);
  assert.equal(C.aplicarAtajo(e0, a[3], kiwi).valor, 1000);
  assert.equal(C.mostrar(C.aplicarAtajo(e0, a[3], kiwi), kiwi), '1 kg');
});
test('cambiar a «Por unidades» conserva lo equivalente: 510 g = 6 ud, y al volver 510 g', () => {
  let e = teclas(C.estadoInicial(kiwi), '510');
  e = C.cambiarModo(e, 'unidades', kiwi);
  assert.equal(e.valor, 6);
  assert.equal(C.mostrar(e, kiwi), '6 ud');
  assert.deepEqual(C.leer(e, kiwi), { v: 6, u: 'ud' });
  e = C.cambiarModo(e, 'peso', kiwi);
  assert.equal(e.valor, 510);
});
test('por unidades: 6 kiwis ≈ 510 g y su precio', () => {
  const e = { modo: 'unidades', valor: 6 };
  const a = C.aproximacion(e, kiwi, 3.49);
  assert.equal(a.texto, '≈ 510 g · 1,78 €');
});
test('producto por unidad: huevos 12 ud a 0,20 €/ud = 2,40 €', () => {
  const e = teclas(C.estadoInicial(huevos), '12');
  assert.equal(C.mostrar(e, huevos), '12 ud');
  assert.equal(C.aproximacion(e, huevos, 0.2).precio, 2.4);
});
test('sin precio conocido no se inventa: solo la equivalencia', () => {
  const a = C.aproximacion(teclas(C.estadoInicial(kiwi), '500'), kiwi, null);
  assert.equal(a.precio, null);
  assert.equal(a.texto, '≈ 6 unidades');
  assert.equal(C.aproximacion(teclas(C.estadoInicial(queso), '300'), queso, null).texto, '');
});
test('en cero no hay nada que guardar', () => assert.equal(C.leer(C.estadoInicial(kiwi), kiwi), null));
test('se parte de una cantidad ya guardada', () => {
  assert.equal(C.estadoInicial(kiwi, { v: 0.5, u: 'kg' }).valor, 500);
  assert.equal(C.estadoInicial(kiwi, { v: 6, u: 'ud' }).modo, 'unidades');
  assert.equal(C.estadoInicial(huevos, { v: 12, u: 'ud' }).valor, 12);
});

console.log(`\n${n} pruebas${process.exitCode ? ' (hay fallos)' : ' correctas'}`);
