/* Pruebas del modelo de datos ampliado: secciones y rutas, unidades,
   memoria de textos de ticket, migración y fusión segura.
   Ejecutar:  node tests/datos.test.mjs */
import assert from 'node:assert/strict';
import { app } from './_app.mjs';

const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k)
};
globalThis.location = { reload() {} };

/* Datos de un usuario con la versión anterior (esquema 8) */
mem.set('luckstudio_compra', JSON.stringify({
  schema: 8,
  tickets: [{ id: 't1', fecha: '2026-11-01T10:00:00.000Z', tienda: 'mercadona', total: 3.2,
              lineas: [{ id: 101, n: 'Plátanos', cant: 1, precio: 3.2 }] }],
  preciosLocal: { 101: { mercadona: { f: 1.6, b: 1.6, q: 1, u: 'kg', d: '2026-11-01' } } },
  prefTienda: { 101: ['mercadona'] }
}));

const A = await app('js/almacen.js');
const S = await app('js/secciones.js');
const U = await app('js/unidades.js');
const L = await app('js/alias.js');
const IO = await app('js/datos-io.js');
const { datos } = A;
const { CATEGORIAS } = await app('datos/categorias.js');

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log('  ok  ', nombre); } catch (e) { console.error('  FALLA', nombre, '\n ', e.message); process.exitCode = 1; } };

console.log('Migración');
test('un usuario con esquema 8 llega al esquema actual (10) sin perder nada', () => {
  assert.equal(datos.schema, 10);
  assert.deepEqual([datos.despensa, datos.menu, datos.bloques], [{}, {}, {}]);
  assert.equal(datos.tickets.length, 1);
  assert.equal(datos.tickets[0].lineas[0].n, 'Plátanos');
  assert.equal(datos.preciosLocal[101].mercadona.f, 1.6);
  assert.deepEqual(datos.prefTienda[101], ['mercadona']);
  assert.deepEqual(datos.rutas, {});
  assert.deepEqual(datos.alias, {});
});

console.log('Secciones y rutas');
test('la sección sale de la categoría si el usuario no eligió otra', () => {
  assert.equal(S.seccionDe({ c: 'frutas' }), 'fruta-verdura');
  assert.equal(S.seccionDe({ c: 'verduras' }), 'fruta-verdura');
  assert.equal(S.seccionDe({ c: 'carne' }), 'carnes');
  assert.equal(S.seccionDe({ c: 'higiene' }), 'drogueria');
});
test('una sección elegida a mano manda; una inventada se ignora', () => {
  assert.equal(S.seccionDe({ c: 'despensa', s: 'aceites' }), 'aceites');
  assert.equal(S.seccionDe({ c: 'despensa', s: 'no-existe' }), 'despensa');
  assert.equal(S.seccionDe({ c: 'rara' }), S.SIN_SECCION);
  assert.equal(S.seccionDe(null), S.SIN_SECCION);
});
test('toda categoría del catálogo tiene sección', () => {
  for (const c of CATEGORIAS) assert.notEqual(S.seccionDe({ c: c.id }), S.SIN_SECCION, c.id);
});
test('el orden completo añade al final las secciones que la ruta no conoce y limpia basura', () => {
  const o = S.ordenCompleto({ orden: ['carnes', 'basura', 'carnes', 'bebidas'] });
  assert.deepEqual(o.slice(0, 2), ['carnes', 'bebidas']);
  assert.equal(new Set(o).size, o.length);
  assert.equal(o.length, S.SECCIONES.length);
});

/* El ejemplo real del brief */
const items = [
  { n: 'Pechuga', seccion: 'carnes' }, { n: 'Hummus', seccion: 'platos-preparados' },
  { n: 'Guisantes', seccion: 'congelados' }, { n: 'Cola', seccion: 'bebidas' },
  { n: 'Misterio', seccion: 'sin-seccion' }
];
test('Mercadona Aragonia: Carnes → Platos preparados → Congelados → Bebidas', () => {
  const g = S.agruparPorRuta(items, { orden: ['carnes', 'platos-preparados', 'congelados', 'bebidas'] });
  assert.deepEqual(g.map(x => x.seccion), ['carnes', 'platos-preparados', 'congelados', 'bebidas', 'sin-seccion']);
});
test('Mercadona Los Pinos: Platos preparados → Carnes → Congelados → Aceites…', () => {
  const g = S.agruparPorRuta(items, { orden: ['platos-preparados', 'carnes', 'congelados', 'aceites'] });
  assert.deepEqual(g.map(x => x.seccion).slice(0, 3), ['platos-preparados', 'carnes', 'congelados']);
});
test('los productos de una sección oculta NO desaparecen: van a «Sin sección»', () => {
  const g = S.agruparPorRuta(items, { orden: ['carnes'], ocultas: ['bebidas'] });
  const sin = g.find(x => x.seccion === 'sin-seccion');
  assert.ok(sin.items.some(i => i.n === 'Cola'));
  assert.equal(g.some(x => x.seccion === 'bebidas'), false);
});
test('lo tachado baja al final de su sección y conserva el orden', () => {
  const g = S.agruparPorRuta([
    { n: 'a', seccion: 'carnes', hecho: true }, { n: 'b', seccion: 'carnes' },
    { n: 'c', seccion: 'carnes', hecho: true }, { n: 'd', seccion: 'carnes' }
  ], {});
  assert.deepEqual(g[0].items.map(i => i.n), ['b', 'd', 'a', 'c']);
});
test('mover, colocar, ocultar y restablecer la ruta de una tienda', () => {
  assert.equal(S.tieneRutaPropia('lidl'), false);
  assert.equal(S.rutaDe('lidl').orden[0], 'fruta-verdura');
  assert.equal(S.moverSeccion('lidl', 'fruta-verdura', +1), true);
  assert.equal(S.rutaDe('lidl').orden[1], 'fruta-verdura');
  assert.equal(S.moverSeccion('lidl', 'fruta-verdura', -1), true);
  assert.equal(S.moverSeccion('lidl', S.rutaDe('lidl').orden[0], -1), false);   // ya es la primera
  S.colocarSeccion('lidl', 'bebidas', 0);
  assert.equal(S.rutaDe('lidl').orden[0], 'bebidas');
  S.ocultarSeccion('lidl', 'farmacia');
  assert.deepEqual(S.rutaDe('lidl').ocultas, ['farmacia']);
  S.ocultarSeccion('lidl', 'farmacia', false);
  assert.deepEqual(S.rutaDe('lidl').ocultas, []);
  assert.equal(S.tieneRutaPropia('lidl'), true);
  S.restablecerRuta('lidl');
  assert.equal(S.tieneRutaPropia('lidl'), false);
});
test('dos tiendas de la misma cadena tienen rutas independientes; se puede copiar', () => {
  S.colocarSeccion('mercadona-a', 'carnes', 0);
  S.colocarSeccion('mercadona-b', 'platos-preparados', 0);
  assert.equal(S.rutaDe('mercadona-a').orden[0], 'carnes');
  assert.equal(S.rutaDe('mercadona-b').orden[0], 'platos-preparados');
  S.copiarRuta('mercadona-a', 'mercadona-c');
  assert.equal(S.rutaDe('mercadona-c').orden[0], 'carnes');
});
test('arrastrar con secciones ocultas por medio: la posición visible se traduce a la real', () => {
  const orden = ['a', 'b', 'c', 'd', 'e'];
  /* c está oculta: lo que se ve es a b d e. Mover «e» a la posición 2 de las visibles = antes de «d» */
  assert.equal(S.posicionEnOrden(orden, ['c'], 'e', 2), 3);        // [a b c e d]
  assert.equal(S.posicionEnOrden(orden, ['c'], 'a', 3), 4);        // al final: sin «a» hay 4
  assert.equal(S.posicionEnOrden(orden, ['c'], 'd', 0), 0);        // al principio
  assert.equal(S.posicionEnOrden(orden, [], 'b', 99), 4);          // pasarse del final se queda en el final
  assert.equal(S.posicionEnOrden(orden, [], 'b', -5), 0);
});
test('ocultar una sección inexistente se rechaza', () => assert.equal(S.ocultarSeccion('lidl', 'xyz'), false));

console.log('Unidades');
const kiwi = { u: 'kg', pu: 85 }, huevo = { u: 'ud', pu: 60 }, leche = { u: 'l' };
test('500 g a 3,20 €/kg = 1,60 € (el ejemplo del brief)', () => {
  assert.equal(U.precioDeCantidad(3.2, 500, 'g', { u: 'kg' }), 1.6);
});
test('6 kiwis de 85 g ≈ 0,51 kg y 510 g', () => {
  assert.equal(U.aBase(6, 'ud', kiwi), 0.51);
  assert.equal(U.convertir(6, 'ud', 'g', kiwi), 510);
  assert.equal(U.convertir(510, 'g', 'ud', kiwi), 6);
});
test('sin peso medio no se inventa la conversión', () => {
  assert.equal(U.aBase(6, 'ud', { u: 'kg' }), null);
  assert.equal(U.convertir(6, 'ud', 'g', { u: 'kg' }), null);
});
test('masa↔masa y volumen↔volumen se convierten siempre', () => {
  assert.equal(U.convertir(1.5, 'kg', 'g'), 1500);
  assert.equal(U.convertir(750, 'ml', 'l'), 0.75);
  assert.equal(U.convertir(1, 'l', 'ml'), 1000);
  assert.equal(U.convertir(1, 'kg', 'l'), null);          // masa a volumen: imposible sin densidad
});
test('ticket a granel: 0,612 kg por 2,14 € = 3,50 €/kg', () => {
  assert.equal(U.precioBaseDeCompra(2.14, 0.612, 'kg', { u: 'kg' }), 3.5);
  assert.equal(U.precioBaseDeCompra(2.14, 612, 'g', { u: 'kg' }), 3.5);
});
test('leche: 1,5 L a 0,89 €/L = 1,34 €', () => assert.equal(U.precioDeCantidad(0.89, 1.5, 'l', leche), 1.34));
test('huevos por unidad a 0,2 €/ud', () => assert.equal(U.precioDeCantidad(0.2, 12, 'ud', huevo), 2.4));
test('leerCantidad entiende lo que escribiría un usuario', () => {
  assert.deepEqual(U.leerCantidad('500 g'), { valor: 500, unidad: 'g' });
  assert.deepEqual(U.leerCantidad('1,5 kg'), { valor: 1.5, unidad: 'kg' });
  assert.deepEqual(U.leerCantidad('250ml'), { valor: 250, unidad: 'ml' });
  assert.deepEqual(U.leerCantidad('x12'), { valor: 12, unidad: 'ud' });
  assert.deepEqual(U.leerCantidad('2 litros'), { valor: 2, unidad: 'l' });
  for (const malo of ['', 'abc', '0 g', '-3 kg', '5 parsecs', null]) assert.equal(U.leerCantidad(malo), null, String(malo));
});
test('cuánto comprar: 450 g de tomate en bandejas de 500 g = 1 bandeja; 600 g = 2', () => {
  assert.deepEqual(U.cantidadACompra(450, 'g', { cantidad: 500, unidad: 'g' }, { u: 'kg' }), { paquetes: 1, cantidad: 500, unidad: 'g' });
  assert.deepEqual(U.cantidadACompra(600, 'g', { cantidad: 500, unidad: 'g' }, { u: 'kg' }), { paquetes: 2, cantidad: 1000, unidad: 'g' });
  assert.deepEqual(U.cantidadACompra(500, 'g', { cantidad: 500, unidad: 'g' }, { u: 'kg' }).paquetes, 1);   // justo, sin pasarse
});
test('atajos y formato legibles', () => {
  assert.deepEqual(U.atajos('kg').map(a => a.v + a.u), ['250g', '500g', '750g', '1kg']);
  assert.equal(U.formatearCantidad(0.5, 'kg'), '500 g');
  assert.equal(U.formatearCantidad(1.25, 'l'), '1,25 L');
  assert.equal(U.formatearCantidad(0.25, 'l'), '250 ml');
});

console.log('Memoria de textos de ticket');
test('lo enlazado se recuerda por cadena y no se mezcla entre cadenas', () => {
  assert.equal(L.aprenderAlias('mercadona', 'BANDEJA KIWI 500 G', 101), true);
  assert.equal(L.buscarAlias('mercadona', 'bandeja  kiwi 500 g'), 101);     // mayúsculas y espacios no importan
  assert.equal(L.buscarAlias('dia', 'BANDEJA KIWI 500 G'), null);
  assert.equal(L.aprenderAlias('mercadona', 'BANDEJA KIWI 500 G', 101), false);   // sin cambios no reescribe
});
test('un producto puede tener varios textos', () => {
  L.aprenderAlias('mercadona', 'KIWI ZESPRI', 101);
  L.aprenderAlias('dia', 'KIWIS GRANEL', 101);
  assert.equal(L.textosDe(101).length, 3);
});
test('fusionar productos mueve sus textos al que se queda', () => {
  L.aprenderAlias('mercadona', 'KIWI VERDE', 999);
  assert.equal(L.moverAlias(999, 101), 1);
  assert.equal(L.buscarAlias('mercadona', 'KIWI VERDE'), 101);
});
test('olvidar un texto lo borra', () => {
  L.olvidarAlias('dia', 'KIWIS GRANEL');
  assert.equal(L.buscarAlias('dia', 'KIWIS GRANEL'), null);
});
test('entradas inválidas no se guardan', () => {
  assert.equal(L.aprenderAlias('', 'x', 1), false);
  assert.equal(L.aprenderAlias('mercadona', '   ', 1), false);
  assert.equal(L.aprenderAlias('mercadona', 'x', 'no-numero'), false);
});
test('SEGURIDAD: las cadenas «__proto__» y «constructor» no contaminan nada', () => {
  assert.equal(L.aprenderAlias('__proto__', 'pwned', 1), false);
  assert.equal(L.aprenderAlias('constructor', 'pwned', 1), false);
  assert.equal({}.pwned, undefined);
});

console.log('Copias y fusión');
test('la copia exportada lleva rutas y textos', () => {
  const c = IO.copiaCompleta();
  assert.ok(Object.keys(c.rutas).length >= 2);
  assert.equal(c.alias.mercadona['bandeja kiwi 500 g'], 101);
  assert.ok(c.resumen.textosDeTicket >= 2);
});
test('ida y vuelta: exportar, borrar y fusionar recupera rutas y textos', () => {
  const copia = JSON.parse(IO.copiaTexto());
  for (const k of Object.keys(datos.rutas)) delete datos.rutas[k];
  for (const k of Object.keys(datos.alias)) delete datos.alias[k];
  const inf = IO.fusionar(copia);
  assert.ok(inf.rutas >= 2 && inf.alias >= 2);
  assert.equal(S.rutaDe('mercadona-a').orden[0], 'carnes');
  assert.equal(L.buscarAlias('mercadona', 'bandeja kiwi 500 g'), 101);
});
test('SEGURIDAD: una copia maliciosa con __proto__ no altera los objetos de la app', () => {
  const mala = JSON.parse(`{
    "formato": "lista-compra-luckstudio-copia",
    "rutas": { "__proto__": { "orden": ["carnes"], "polluted": "si" } },
    "alias": { "__proto__": { "pwned": 1 }, "mercadona": { "__proto__": 5, "constructor": 6, "ok": 7 } },
    "preciosLocal": { "__proto__": { "x": { "d": "2030-01-01" } } },
    "prefTienda": { "__proto__": ["x"] }
  }`);
  IO.fusionar(mala);
  assert.equal({}.polluted, undefined);
  assert.equal({}.pwned, undefined);
  assert.equal({}.x, undefined);
  assert.equal(Object.prototype.orden, undefined);
  assert.equal(L.buscarAlias('mercadona', 'ok'), 7);          // lo legítimo sí entra
});

console.log('Borrar el historial de tickets');
test('borra solo los tickets y la bandeja de pendientes; todo lo demás se conserva', () => {
  datos.pendientes.push({ clave: 'x', nombre: 'X', veces: 1, tiendas: [] });
  datos.preciosLocal[101] = { mercadona: { f: 1.6, b: 1.6, d: '2026-11-01' } };
  datos.lista[101] = 2;
  L.aprenderAlias('mercadona', 'TEXTO RECORDADO', 101);
  S.colocarSeccion('lidl', 'bebidas', 0);
  const antes = datos.tickets.length;
  assert.ok(antes >= 1);
  const r = IO.borrarHistorialTickets();
  assert.equal(r.tickets, antes);
  assert.equal(r.pendientes, 1);
  assert.equal(datos.tickets.length, 0);
  assert.equal(datos.pendientes.length, 0);
  assert.equal(datos.preciosLocal[101].mercadona.f, 1.6);      // el precio actual se queda
  assert.equal(datos.lista[101], 2);
  assert.equal(L.buscarAlias('mercadona', 'TEXTO RECORDADO'), 101);
  assert.equal(S.rutaDe('lidl').orden[0], 'bebidas');
});
test('con el historial ya vacío no falla ni inventa nada', () => {
  const r = IO.borrarHistorialTickets();
  assert.deepEqual([r.tickets, r.gasto, r.pendientes], [0, 0, 0]);
});

console.log(`\n${n} pruebas${process.exitCode ? ' (hay fallos)' : ' correctas'}`);
