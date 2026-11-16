/* Pruebas del historial de precios normalizado.
   Ejecutar:  node tests/historial.test.mjs */
import assert from 'node:assert/strict';
import { app } from './_app.mjs';
const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
const H = await app('js/historial.js');

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log('  ok  ', nombre); } catch (e) { console.error('  FALLA', nombre, '\n ', e.message); process.exitCode = 1; } };
const tomate = { id: 1, u: 'kg', pu: 150 }, leche = { id: 2, u: 'l' }, huevos = { id: 3, u: 'ud' };

test('1) el €/kg que dice el ticket manda (producto a granel)', () => {
  assert.equal(H.baseDeLinea({ precio: 2.14, cant: 1, q: { v: 0.612, u: 'kg' }, pb: 3.49 }, tomate), 3.49);
});
test('2) importe ÷ cantidad: 0,612 kg por 2,14 € = 3,50 €/kg', () => {
  assert.equal(H.baseDeLinea({ precio: 2.14, cant: 1, q: { v: 0.612, u: 'kg' } }, tomate), 3.5);
  assert.equal(H.baseDeLinea({ precio: 1.6, cant: 1, q: { v: 500, u: 'g' } }, tomate), 3.2);
});
test('3) producto por unidad: 2,35 € por una docena', () => {
  assert.equal(H.baseDeLinea({ precio: 2.35, cant: 12 }, huevos), 0.2);
  assert.equal(H.baseDeLinea({ precio: 4.7, cant: 2 }, huevos), 2.35);
});
test('4) unidades de un producto por peso, con peso medio: 4 tomates a 0,90 €', () => {
  assert.equal(H.baseDeLinea({ precio: 0.9, cant: 4 }, tomate), 1.5);     // 4×150 g = 0,6 kg
});
test('5) si no hay forma de saberlo, no se inventa (null)', () => {
  assert.equal(H.baseDeLinea({ precio: 1.29, cant: 1 }, leche), null);
  assert.equal(H.baseDeLinea({ precio: 3, cant: 1 }, { u: 'kg' }), null);
  assert.equal(H.baseDeLinea({ precio: null, cant: 1 }, huevos), null);
});
test('5b) con el formato conocido en esa tienda sí: leche de 1 L a 1,29 €', () => {
  const formatoDe = t => (t === 'mercadona' ? { q: 1, u: 'l' } : null);
  assert.equal(H.baseDeLinea({ precio: 1.29, cant: 1 }, leche, formatoDe, 'mercadona'), 1.29);
  assert.equal(H.baseDeLinea({ precio: 2.58, cant: 2 }, leche, formatoDe, 'mercadona'), 1.29);
  assert.equal(H.baseDeLinea({ precio: 1.29, cant: 1 }, leche, formatoDe, 'dia'), null);
});

const T = (fecha, tienda, precio, cant = 1, extra = {}) => ({ fecha, tienda, lineas: [{ id: 1, precio, cant, ...extra }] });
const tickets = [
  T('2026-10-05T10:00:00Z', 'mercadona', 1.68, 1, { q: { v: 0.75, u: 'kg' } }),   // 2,24
  T('2026-10-21T10:00:00Z', 'dia',       1.10, 1, { q: { v: 0.5,  u: 'kg' } }),   // 2,20
  T('2026-11-02T10:00:00Z', 'mercadona', 1.86, 1, { q: { v: 0.85, u: 'kg' } }),   // 2,19
  T('2026-11-16T10:00:00Z', 'mercadona', 1.99, 1, { q: { v: 1,    u: 'kg' } }),   // 1,99
  { fecha: '2026-11-16T10:00:00Z', tienda: 'dia', lineas: [{ id: 99, precio: 5, cant: 1 }] }
];
test('la serie queda ordenada, solo con el producto pedido', () => {
  const s = H.serie(1, [...tickets].reverse(), tomate);
  assert.deepEqual(s.map(p => p.base), [2.24, 2.2, 2.19, 1.99]);
});
test('las líneas sin precio normalizable no entran en la serie', () => {
  const s = H.serie(2, [{ fecha: '2026-11-01T00:00:00Z', lineas: [{ id: 2, precio: 1.2, cant: 1 }] }], leche);
  assert.equal(s.length, 0);
});
test('tendencia: el ejemplo del PDF, ha bajado frente a los 3 meses anteriores', () => {
  const t = H.tendencia(H.serie(1, tickets, tomate));
  assert.equal(t.estado, 'baja');
  assert.equal(t.pct, 10);                       // 1,99 frente a media 2,21
  assert.equal(t.media, 2.21);
});
test('tendencia estable dentro de ±3 % y subida', () => {
  const mk = (a, b) => H.tendencia([{ fecha: '2026-10-01T00:00:00Z', base: a }, { fecha: '2026-11-01T00:00:00Z', base: b }]);
  assert.equal(mk(2, 2.04).estado, 'estable');
  assert.equal(mk(2, 2.5).estado, 'sube');
  assert.equal(mk(2, 2.5).pct, 25);
});
test('sin datos suficientes no hay tendencia (no se inventa)', () => {
  assert.equal(H.tendencia([]), null);
  assert.equal(H.tendencia([{ fecha: '2026-11-01T00:00:00Z', base: 2 }]), null);
  /* la única compra anterior es de hace un año: fuera de los 3 meses */
  assert.equal(H.tendencia([{ fecha: '2025-11-01T00:00:00Z', base: 2 }, { fecha: '2026-11-01T00:00:00Z', base: 3 }]), null);
});
test('recortar por periodo (3M / 6M / 1A)', () => {
  const s = H.serie(1, tickets, tomate);
  const ahora = new Date('2026-11-17T00:00:00Z').getTime();
  assert.equal(H.recortar(s, 1, ahora).length, 3);   // desde el 17 oct: 21 oct, 2 nov y 16 nov
  assert.equal(H.recortar(s, 0.5, ahora).length, 2);  // desde el 2 nov: 2 nov y 16 nov
  assert.equal(H.recortar(s, 6, ahora).length, 4);
  assert.equal(H.recortar(s, 0, ahora).length, 4);
});
test('agrupar por tienda para dibujar una línea por cadena', () => {
  const g = H.porTienda(H.serie(1, tickets, tomate));
  assert.deepEqual([...g.keys()].sort(), ['dia', 'mercadona']);
  assert.equal(g.get('mercadona').length, 3);
});
test('€/kg a €/ud con peso medio', () => {
  assert.equal(H.baseAUnidad(1.99, tomate), 0.3);
  assert.equal(H.baseAUnidad(1.99, { u: 'kg' }), null);
  assert.equal(H.baseAUnidad(0.2, huevos), 0.2);
});

/* --- los tickets guardan y aprenden precio normalizado --- */
const { reconstruirCatalogo } = await app('js/estado.js');
reconstruirCatalogo();            // la app lo hace al arrancar
const G = await app('js/gastos.js');
const P = await app('js/precios.js');
const { datos } = await app('js/almacen.js');

test('un ticket a granel guarda cantidad y €/kg, y el precio aprendido es el del kilo', () => {
  const r = G.crearTicketManual({ tienda: 'mercadona', fecha: '2026-11-16', lineas: [
    { id: 110, n: 'Kiwi', cant: 1, precio: 2.14, q: { v: 0.612, u: 'kg' } }] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.ticket.lineas[0].q, { v: 0.612, u: 'kg' });
  assert.equal(datos.preciosLocal[110].mercadona.b, 3.5);
});
test('con formato conocido, el precio de formato se recalcula con el €/kg', () => {
  datos.preciosLocal[110].mercadona = { f: 1.5, q: 500, u: 'g', b: 3, d: '2026-10-01' };
  G.crearTicketManual({ tienda: 'mercadona', fecha: '2026-11-17', lineas: [
    { id: 110, n: 'Kiwi', cant: 1, precio: 2, q: { v: 0.5, u: 'kg' } }] });
  assert.equal(datos.preciosLocal[110].mercadona.b, 4);
  assert.equal(datos.preciosLocal[110].mercadona.f, 2);      // 500 g a 4 €/kg
});
test('SEGURIDAD: un ticket importado con cantidades absurdas se limpia', () => {
  const v = G.validarTicket(JSON.stringify({ lineas: [
    { n: 'Kiwi', id: 110, cant: 1, precio: 1, q: { v: -5, u: 'parsec' }, pb: 'x' },
    { n: 'Pera', cant: 1, precio: 1, q: { v: 1e12, u: 'kg' }, pb: 1e12 },
    { n: 'Uva', cant: 1, precio: 1, q: { v: '0,5', u: 'KG' }, pb: '2,5' }] }));
  assert.equal(v.ok, true);
  assert.equal(v.ticket.lineas[0].q, undefined);
  assert.equal(v.ticket.lineas[0].pb, undefined);
  assert.equal(v.ticket.lineas[1].q, undefined);
  assert.equal(v.ticket.lineas[1].pb, undefined);
  assert.equal(v.ticket.lineas[2].q, undefined);   // «0,5» con coma no es un número válido aquí: se descarta, no se adivina
});

console.log(`\n${n} pruebas${process.exitCode ? ' (hay fallos)' : ' correctas'}`);
