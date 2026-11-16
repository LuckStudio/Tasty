/* Pruebas de la fusión de productos duplicados.
   Ejecutar:  node tests/fusion.test.mjs */
import assert from 'node:assert/strict';
import { app } from './_app.mjs';

const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };

/* Productos reales del catálogo: 110 Kiwi, 111 (otro de frutas), 503 Yogur natural */
const { datos } = await app('js/almacen.js');
const E = await app('js/estado.js');       // POR_ID se reconstruye: siempre leerlo del módulo, no copiarlo
const F = await app('js/fusion.js');
const L = await app('js/alias.js');
const { crearProducto, editarProducto } = await app('js/catalogo-edit.js');
E.reconstruirCatalogo();

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log('  ok  ', nombre); } catch (e) { console.error('  FALLA', nombre, '\n ', e.message); process.exitCode = 1; } };

/* un duplicado creado por el usuario: «Kiwis verdes» (nuevo) que es el Kiwi de siempre */
const dup = crearProducto({ n: 'Kiwis verdes', c: 'frutas', u: 'kg' }).producto;
const DUP = dup.id, KIWI = 110;

/* preparamos un montón de datos que apuntan al duplicado */
datos.tickets.push({ id: 'ta', fecha: '2026-11-01T10:00:00Z', tienda: 'mercadona', total: 2, noCogidas: [], lineas: [{ id: DUP, n: 'Kiwis verdes', c: 'frutas', cant: 1, precio: 2 }] });
datos.tickets.push({ id: 'tb', fecha: '2026-11-02T10:00:00Z', tienda: 'dia', total: 5, noCogidas: [], lineas: [{ id: KIWI, n: 'Kiwi', c: 'frutas', cant: 1, precio: 3 }, { id: 503, n: 'Yogur natural', c: 'lacteos', cant: 1, precio: 2 }] });
datos.listas = [{ id: 'l0', nombre: 'x', emoji: '', lista: { [DUP]: 2, [KIWI]: 1, 503: 1 }, libres: [], urgencia: { [DUP]: '2026-11-20' } },
                { id: 'l1', nombre: 'y', emoji: '', lista: { [DUP]: 3 }, libres: [], urgencia: {} }];
datos.lista = { [DUP]: 2, [KIWI]: 1, 503: 1 }; datos.urgencia = { [DUP]: '2026-11-20', [KIWI]: '2026-11-25' };
datos.compra = { lineas: [{ id: DUP, n: 'Kiwis verdes' }, { id: 503, n: 'Yogur' }] };
datos.preciosLocal = { [DUP]: { mercadona: { b: 3.1, d: '2026-11-10' }, lidl: { b: 2.9, d: '2026-10-01' } }, [KIWI]: { mercadona: { b: 3.4, d: '2026-09-01' } } };
datos.prefTienda = { [DUP]: ['mercadona', 'dia'], [KIWI]: ['dia', 'lidl'] };
datos.sustitutos = { [DUP]: [503], 503: [DUP], 800: [DUP, KIWI] };
datos.marcas = { [DUP]: { estricta: true, texto: 'Zespri' } };
datos.periodicidad = { [DUP]: 7 }; datos.sugerenciasFuera = {};
datos.recetas = [{ id: 'r1', nombre: 'Ensalada', ingredientes: [{ id: DUP, cant: 2, unidad: 'ud' }, { id: 503, cant: 1, unidad: 'ud' }] }];
L.aprenderAlias('mercadona', 'KIWI ZESPRI', DUP);

test('no se puede fusionar consigo mismo, con algo que no existe ni con un archivado', () => {
  assert.equal(F.fusionarProductos(KIWI, KIWI).ok, false);
  assert.equal(F.fusionarProductos(KIWI, 99999).ok, false);
  assert.equal(F.fusionarProductos(99999, KIWI).ok, false);
});

const r = F.fusionarProductos(DUP, KIWI);
test('la fusión funciona e informa', () => {
  assert.equal(r.ok, true);
  assert.equal(r.destino, KIWI);
  assert.equal(r.informe.recetas, 1);
});
test('los tickets apuntan al producto que se queda y llevan su nombre', () => {
  assert.equal(datos.tickets.find(t => t.id === 'ta').lineas[0].id, KIWI);
  assert.equal(datos.tickets.find(t => t.id === 'ta').lineas[0].n, 'Kiwi');
  assert.equal(datos.tickets.some(t => t.lineas.some(l => l.id === DUP)), false);
  assert.equal(datos.compra.lineas[0].id, KIWI);
  assert.equal(datos.compra.lineas[1].id, 503);          // lo demás no se toca
});
test('las listas suman cantidades (y las demás no cambian)', () => {
  assert.equal(datos.listas[0].lista[KIWI], 3);          // 1 + 2
  assert.equal(datos.listas[0].lista[503], 1);
  assert.equal(datos.listas[1].lista[KIWI], 3);          // solo estaba el duplicado
  assert.equal(DUP in datos.listas[0].lista, false);
  assert.equal(datos.lista[KIWI], 3);
});
test('la urgencia se queda con la fecha más próxima', () => {
  assert.equal(datos.listas[0].urgencia[KIWI], '2026-11-20');
  assert.equal(datos.urgencia[KIWI], '2026-11-20');       // 20 nov antes que 25 nov
  assert.equal(DUP in datos.urgencia, false);
});
test('precios: por tienda gana el dato más reciente y se conservan las tiendas nuevas', () => {
  assert.equal(datos.preciosLocal[KIWI].mercadona.b, 3.1);   // 10 nov frente a 1 sep
  assert.equal(datos.preciosLocal[KIWI].lidl.b, 2.9);
  assert.equal(DUP in datos.preciosLocal, false);
});
test('tiendas preferidas: unión sin repetidos y sin perder el orden del destino', () => {
  assert.deepEqual(datos.prefTienda[KIWI], ['dia', 'lidl', 'mercadona']);
});
test('equivalentes: se sustituye el id viejo, sin autorreferencias ni repetidos', () => {
  assert.deepEqual(datos.sustitutos[KIWI], [503]);
  assert.deepEqual(datos.sustitutos[503], [KIWI]);
  assert.deepEqual(datos.sustitutos[800], [KIWI]);       // [DUP, KIWI] -> [KIWI] sin repetir
  assert.equal(DUP in datos.sustitutos, false);
});
test('marca, periodicidad y recetas pasan al destino', () => {
  assert.equal(datos.marcas[KIWI].texto, 'Zespri');
  assert.equal(datos.periodicidad[KIWI], 7);
  assert.equal(datos.recetas[0].ingredientes[0].id, KIWI);
  assert.equal(datos.recetas[0].ingredientes[1].id, 503);
});
test('los textos de ticket recordados pasan al destino', () => {
  assert.equal(L.buscarAlias('mercadona', 'KIWI ZESPRI'), KIWI);
  assert.equal(r.informe.textos, 1);
});
test('el duplicado queda ARCHIVADO, no borrado (su id sigue reservado)', () => {
  assert.equal(E.POR_ID[DUP]?.a, true);
  assert.ok(E.POR_ID[DUP]);
});
test('si el destino ya tenía marca o periodicidad, manda la suya', () => {
  const d2 = crearProducto({ n: 'Kiwi dorado', c: 'frutas', u: 'kg' }).producto.id;
  datos.marcas[d2] = { estricta: false, texto: 'Otra' }; datos.periodicidad[d2] = 3;
  datos.marcas[KIWI] = { estricta: true, texto: 'Zespri' }; datos.periodicidad[KIWI] = 7;
  F.fusionarProductos(d2, KIWI);
  assert.equal(datos.marcas[KIWI].texto, 'Zespri');
  assert.equal(datos.periodicidad[KIWI], 7);
});
test('sección y peso medio se heredan solo si el destino no los tenía', () => {
  const origen = crearProducto({ n: 'Kiwi ecológico', c: 'frutas', u: 'kg' }).producto.id;
  editarProducto(origen, { s: 'aceites', pu: 90 });
  F.fusionarProductos(origen, KIWI);
  assert.equal(E.POR_ID[KIWI].s, 'aceites');
  assert.equal(E.POR_ID[KIWI].pu, 90);
  const otro = crearProducto({ n: 'Kiwi gold', c: 'frutas', u: 'kg' }).producto.id;
  editarProducto(otro, { s: 'despensa', pu: 50 });
  F.fusionarProductos(otro, KIWI);
  assert.equal(E.POR_ID[KIWI].s, 'aceites');                 // no se pisa
  assert.equal(E.POR_ID[KIWI].pu, 90);
});
test('el destino archivado se rechaza', () => assert.equal(F.fusionarProductos(KIWI, DUP).ok, false));

console.log(`\n${n} pruebas${process.exitCode ? ' (hay fallos)' : ' correctas'}`);
