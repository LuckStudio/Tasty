/* Pruebas de la despensa (existencias). Ejecutar:  node tests/despensa.test.mjs */
import assert from 'node:assert/strict';
import { app } from './_app.mjs';

const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };

const { datos } = await app('js/almacen.js');
const E = await app('js/estado.js');
const D = await app('js/despensa.js');
const IO = await app('js/datos-io.js');
const R = await app('js/recetas.js');
const { editarProducto } = await app('js/catalogo-edit.js');
const { RECETAS_NOVIEMBRE } = await app('datos/recetas-noviembre.js');
E.reconstruirCatalogo();

const PATATA = 204, HUEVOS = 501, KIWI = 110, LECHE = E.PRODUCTOS.find(p => p.n === 'Leche').id;
let n = 0;
const cola = [];
const test = (nombre, fn) => cola.push([nombre, fn]);

test('fijar stock valida lo que recibe', () => {
  assert.equal(D.fijarStock(PATATA, 650, 'g'), true);
  assert.equal(D.fijarStock(99999, 5, 'g'), false);          // producto inexistente
  assert.equal(D.fijarStock(PATATA, -1, 'g'), false);
  assert.equal(D.fijarStock(PATATA, 5, 'parsec'), false);
  assert.equal(D.fijarStock(PATATA, 5, 'kg'), false);        // solo g, ml o ud: la unidad de stock es siempre la mínima
  assert.deepEqual(D.stockDe(PATATA).cant, 650);
});
test('disponibilidad: hay, falta y conversión entre g y kg', () => {
  assert.equal(D.disponibilidad(PATATA, { cant: 220, unidad: 'g' }).estado, 'hay');
  assert.equal(D.disponibilidad(PATATA, { cant: 0.5, unidad: 'kg' }).estado, 'hay');
  assert.equal(D.disponibilidad(PATATA, { cant: 700, unidad: 'g' }).estado, 'falta');
  assert.equal(D.disponibilidad(PATATA, { cant: 650, unidad: 'g' }).estado, 'hay');       // justo
  assert.deepEqual(D.disponibilidad(PATATA, { cant: 1, unidad: 'g' }).tengo, { cant: 650, unidad: 'g' });
});
test('de lo que no se sabe nada se dice «desconocido», nunca «falta» ni «hay»', () => {
  assert.equal(D.disponibilidad(HUEVOS, { cant: 2, unidad: 'ud' }).estado, 'desconocido');
  assert.equal(D.esFalta('desconocido'), false);
});
test('si no se puede comparar unidades (sin peso medio) no se inventa una falta', () => {
  /* 650 g de patata y la receta pide «2 ud»: sin peso medio no se sabe */
  assert.equal(D.disponibilidad(PATATA, { cant: 2, unidad: 'ud' }).estado, 'hay');
});
test('con peso medio sí se compara unidades con peso: kiwi 500 g vs 6 ud de 85 g', () => {
  editarProducto(KIWI, { pu: 85 });
  D.fijarStock(KIWI, 500, 'g');
  assert.equal(D.disponibilidad(KIWI, { cant: 5, unidad: 'ud' }).estado, 'hay');     // 425 g
  assert.equal(D.disponibilidad(KIWI, { cant: 6, unidad: 'ud' }).estado, 'falta');   // 510 g
});
test('«se está acabando» y «se ha acabado»', () => {
  D.fijarStock(LECHE, 1000, 'ml');
  D.marcar(LECHE, 'acaba');
  assert.equal(D.disponibilidad(LECHE, { cant: 200, unidad: 'ml' }).estado, 'acaba');
  assert.equal(D.esFalta('acaba'), false);
  D.marcar(LECHE, 'agotado');
  assert.equal(D.stockDe(LECHE).cant, 0);
  assert.equal(D.disponibilidad(LECHE, { cant: 1, unidad: 'ml' }).estado, 'agotado');
  assert.equal(D.esFalta('agotado'), true);
  assert.equal(D.marcar(LECHE, 'raro'), false);
});
test('sumar convierte unidades y vuelve a «hay»', () => {
  D.fijarStock(PATATA, 500, 'g');
  assert.equal(D.sumarStock(PATATA, 0.25, 'kg'), true);
  assert.equal(D.stockDe(PATATA).cant, 750);
  D.marcar(LECHE, 'agotado');
  D.sumarStock(LECHE, 1, 'l');
  assert.deepEqual([D.stockDe(LECHE).cant, D.stockDe(LECHE).estado], [1000, 'hay']);
});
test('restar nunca baja de 0 y marca agotado al llegar', () => {
  D.fijarStock(HUEVOS, 3, 'ud');
  assert.equal(D.restarStock(HUEVOS, 2, 'ud'), true);
  assert.equal(D.stockDe(HUEVOS).cant, 1);
  D.restarStock(HUEVOS, 5, 'ud');
  assert.deepEqual([D.stockDe(HUEVOS).cant, D.stockDe(HUEVOS).estado], [0, 'agotado']);
});
test('restar sin cantidad conocida o sin conversión devuelve false y no toca nada', () => {
  D.confirmarHay(203);                                     // ajo: solo «hay», sin cantidad
  assert.equal(D.restarStock(203, 1, 'ud'), false);
  assert.equal(D.stockDe(203).cant, null);
  D.fijarStock(PATATA, 500, 'g');
  assert.equal(D.restarStock(PATATA, 2, 'ud'), false);     // sin peso medio
  assert.equal(D.stockDe(PATATA).cant, 500);
});

test('al guardar una compra: lo anotado, las unidades y el formato conocido suman; lo demás solo «hay»', () => {
  const ya = datos.despensa;
  for (const k of Object.keys(ya)) delete ya[k];
  datos.preciosLocal[LECHE] = { mercadona: { f: 1.2, b: 1.2, q: 1, u: 'l', d: '2026-11-01' } };
  const cambios = D.desdeTicket({ tienda: 'mercadona', lineas: [
    { id: KIWI, cant: 1, precio: 1.75, q: { v: 0.5, u: 'kg' } },    // pesado: 500 g
    { id: HUEVOS, cant: 12, precio: 2.35 },                          // por unidad: 12
    { id: LECHE, cant: 2, precio: 2.4 },                             // formato conocido: 2 × 1 L
    { id: PATATA, cant: 1, precio: 1.5 },                            // sin formato ni peso: solo «hay»
    { n: 'cosa a mano', cant: 1, precio: 1 }                         // sin producto: se ignora
  ] });
  assert.equal(cambios, 4);
  assert.equal(D.stockDe(KIWI).cant, 500);
  assert.equal(D.stockDe(HUEVOS).cant, 12);
  assert.deepEqual([D.stockDe(LECHE).cant, D.stockDe(LECHE).unidad], [2000, 'ml']);
  assert.deepEqual([D.stockDe(PATATA).cant, D.stockDe(PATATA).estado], [null, 'hay']);
});
test('una compra posterior suma a lo que ya había', () => {
  D.desdeTicket({ tienda: 'mercadona', lineas: [{ id: HUEVOS, cant: 6, precio: 1.2 }] });
  assert.equal(D.stockDe(HUEVOS).cant, 18);
});

test('al terminar de cocinar se descuenta lo usado, con las raciones', () => {
  R.importarRecetas(RECETAS_NOVIEMBRE);
  const r = datos.recetas.find(x => x.nombre === 'Tortitas de plátano');   // 1 huevo, 100 ml claras, 60 g plátano, 35 g harina de arroz
  D.fijarStock(HUEVOS, 5, 'ud'); D.fijarStock(101, 500, 'g'); D.fijarStock(743, 1000, 'g'); D.fijarStock(519, 1000, 'ml');
  const res = D.descontarReceta(r, 2);
  assert.equal(res.descontados, 4);
  assert.equal(D.stockDe(HUEVOS).cant, 3);                 // 2 huevos
  assert.equal(D.stockDe(101).cant, 380);                  // 120 g
  assert.equal(D.stockDe(743).cant, 930);                  // 70 g
  assert.equal(D.stockDe(519).cant, 800);                  // 200 ml
});
test('lo que no se puede cuantificar al cocinar se cuenta aparte, sin romper nada', () => {
  const r = datos.recetas.find(x => x.nombre === 'Tostadas de pollo y aguacate');
  D.confirmarHay(610);                                     // pan: hay, sin cantidad
  const res = D.descontarReceta(r);
  assert.ok(res.sinCuantificar >= 1);
  assert.equal(D.stockDe(610).cant, null);
});

test('«se acaba» va a la lista sin duplicar', () => {
  for (const k of Object.keys(datos.lista)) delete datos.lista[k];
  datos.lista[HUEVOS] = 2;                                  // ya estaba en la lista
  const r = D.aLaLista([HUEVOS, KIWI, 99999], 'acaba');
  assert.deepEqual(r, { anadidos: 1, yaEstaban: 1 });
  assert.equal(datos.lista[HUEVOS], 2);                    // no se suma otra
  assert.equal(datos.lista[KIWI], 1);
  assert.equal(D.stockDe(KIWI).estado, 'acaba');
  const r2 = D.aLaLista([KIWI], 'agotado');
  assert.deepEqual(r2, { anadidos: 0, yaEstaban: 1 });
  assert.equal(D.stockDe(KIWI).estado, 'agotado');
});

test('la copia lleva despensa, menú, bloques y recetas, y se restauran con ida y vuelta', () => {
  datos.menu['2026-11-17'] = { desayuno: [{ r: 'r-tortitas-de-platano-desayuno', n: 2 }], comida: [], cena: [{ r: 'r-tacos-de-pescado-cena', n: 1 }] };
  datos.bloques['2026-11-17'] = { franjas: [{ f: '2026-11-17', s: 'cena' }] };
  const copia = JSON.parse(IO.copiaTexto());
  assert.ok(copia.recetas.length >= 14 && copia.despensa[HUEVOS] && copia.menu['2026-11-17'] && copia.bloques['2026-11-17']);
  assert.ok(copia.resumen.recetas >= 14 && copia.resumen.diasDeMenu >= 1);
  delete datos.menu['2026-11-17']; delete datos.bloques['2026-11-17']; delete datos.despensa[HUEVOS];
  const inf = IO.fusionar(copia);
  assert.equal(datos.menu['2026-11-17'].desayuno[0].n, 2);
  assert.equal(datos.bloques['2026-11-17'].franjas[0].s, 'cena');
  assert.equal(datos.despensa[HUEVOS].cant, copia.despensa[HUEVOS].cant);
  assert.ok(inf.menu >= 1 && inf.despensa >= 1);
});
test('los ids de receta son estables: las recetas del paquete tienen el mismo id en cualquier dispositivo', () => {
  assert.ok(datos.recetas.some(r => r.id === 'r-tacos-de-pescado-cena'));
  assert.ok(datos.recetas.some(r => r.id === 'r-tortitas-de-platano-desayuno'));
});
test('en la despensa gana el dato más reciente al fusionar', () => {
  datos.despensa[HUEVOS] = { cant: 9, unidad: 'ud', estado: 'hay', d: '2026-11-20T10:00:00.000Z' };
  IO.fusionar({ formato: 'lista-compra-luckstudio-copia', despensa: { [HUEVOS]: { cant: 1, unidad: 'ud', estado: 'hay', d: '2026-11-10T10:00:00.000Z' } } });
  assert.equal(datos.despensa[HUEVOS].cant, 9);                       // la de la copia es más antigua
  IO.fusionar({ formato: 'lista-compra-luckstudio-copia', despensa: { [HUEVOS]: { cant: 4, unidad: 'ud', estado: 'hay', d: '2026-11-25T10:00:00.000Z' } } });
  assert.equal(datos.despensa[HUEVOS].cant, 4);
});
test('SEGURIDAD: una copia con basura en despensa, menú y bloques se limpia y no contamina', () => {
  const mala = JSON.parse(`{
    "formato": "lista-compra-luckstudio-copia",
    "despensa": { "__proto__": { "cant": 1, "estado": "hay" }, "abc": { "cant": 1, "estado": "hay" }, "201": { "cant": -5, "estado": "hay" },
                  "202": { "cant": 1e12, "estado": "hay" }, "203": { "cant": 2, "estado": "raro" }, "205": { "cant": 3, "unidad": "parsec", "estado": "hay", "d": "x" } },
    "menu": { "no-es-fecha": { "cena": [] }, "2026-12-01": { "desayuno": [{ "r": "../../x", "n": 5 }, { "r": "ok-1", "n": 999 }, { "r": "ok-2", "n": "x" }], "comida": "no", "cena": [], "fuera": { "cena": true, "comida": "si" } },
              "__proto__": { "cena": [{ "r": "x", "n": 1 }] } },
    "bloques": { "2026-12-01": { "franjas": [{ "f": "2026-12-01", "s": "cena" }, { "f": "mal", "s": "cena" }, { "f": "2026-12-02", "s": "merienda" }] }, "__proto__": { "franjas": [] } }
  }`);
  IO.fusionar(mala);
  assert.equal({}.cant, undefined); assert.equal({}.cena, undefined); assert.equal({}.franjas, undefined);
  assert.equal(datos.despensa['abc'], undefined);
  assert.equal(datos.despensa['201']?.cant === -5, false);
  assert.equal(datos.despensa['202'], undefined);
  assert.equal(datos.despensa['203'], undefined);
  assert.equal(datos.despensa['205'].unidad, null);
  assert.equal(datos.menu['no-es-fecha'], undefined);
  const dia = datos.menu['2026-12-01'];
  assert.deepEqual(dia.desayuno, [{ r: 'ok-1', n: 20 }, { r: 'ok-2', n: 1 }]);   // la ruta «../../x» se descarta
  assert.deepEqual(dia.comida, []);
  assert.deepEqual(dia.fuera, { cena: true });
  assert.deepEqual(datos.bloques['2026-12-01'].franjas, [{ f: '2026-12-01', s: 'cena' }]);
});

for (const [nombre, fn] of cola) {
  try { await fn(); n++; console.log('  ok  ', nombre); }
  catch (e) { console.error('  FALLA', nombre, '\n ', e.message); process.exitCode = 1; }
}
console.log(`\n${n} pruebas${process.exitCode ? ' (hay fallos)' : ' correctas'}`);
