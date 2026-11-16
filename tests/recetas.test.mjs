/* Pruebas de las recetas de noviembre y de la importación.
   Ejecutar:  node tests/recetas.test.mjs */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { app } from './_app.mjs';

const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };

const E = await app('js/estado.js');
const R = await app('js/recetas.js');
const { datos } = await app('js/almacen.js');
const { RECETAS_NOVIEMBRE: N } = await app('datos/recetas-noviembre.js');
const { CATALOGO } = await app('datos/catalogo.js');
E.reconstruirCatalogo();

let n = 0;
const cola = [];
const test = (nombre, fn) => cola.push([nombre, fn]);       // se ejecutan en orden y se espera a cada una

test('el catálogo no tiene ids repetidos y respeta los bloques por categoría', async () => {
  const { CATEGORIAS } = await app('datos/categorias.js');
  assert.equal(new Set(CATALOGO.map(p => p.id)).size, CATALOGO.length);
  for (const p of CATALOGO) {
    const bloque = CATEGORIAS.find(c => c.id === p.c)?.bloque;
    assert.ok(bloque && p.id > bloque && p.id < bloque + 100, `${p.id} ${p.n} fuera de su bloque`);
  }
});

test('hay 14 recetas: 3 desayunos, 4 comidas, 3 meriendas y 4 cenas', () => {
  const por = {};
  for (const r of N.recetas) por[r.comida] = (por[r.comida] || 0) + 1;
  assert.deepEqual(por, { desayuno: 3, comida: 4, merienda: 3, cena: 4 });
  assert.equal(new Set(N.recetas.map(r => r.nombre)).size, 14);
});
test('todo ingrediente apunta a un producto del catálogo que existe y no está archivado', () => {
  for (const r of N.recetas) for (const i of r.ingredientes) {
    assert.ok(i.id && E.POR_ID[i.id] && !E.POR_ID[i.id].a, `${r.nombre}: ${i.nombre} (${i.id})`);
  }
});
test('cada ingrediente tiene cantidad y unidad, o está marcado «sin cantidad»', () => {
  for (const r of N.recetas) for (const i of r.ingredientes) {
    if (i.sinCantidad) continue;
    assert.ok(i.cant > 0 && ['g', 'ml', 'ud'].includes(i.unidad), `${r.nombre}: ${i.nombre}`);
  }
});
test('cada receta tiene ingredientes y al menos un paso', () => {
  for (const r of N.recetas) {
    assert.ok(r.ingredientes.length >= 3, r.nombre);
    assert.ok(r.pasos.length >= 1 && r.pasos.every(p => p.texto.length > 3), r.nombre);
  }
});
test('PRIVACIDAD: no se ha colado nada personal ni de salud del documento original', () => {
  const texto = readFileSync(new URL('../app/datos/recetas-noviembre.js', import.meta.url), 'utf8').toLowerCase();
  for (const prohibida of ['vesícula', 'ferritina', 'hierro', 'omega', 'magnesio',
    'probiótico', 'multivitamín', 'onagra', 'analítica', 'gimnasio', 'peso de referencia', 'composición corporal', 'brazos', 'llamada']) {
    assert.equal(texto.includes(prohibida), false, `aparece «${prohibida}»`);
  }
});

test('se importan las 14 y todas quedan enlazadas con el catálogo', () => {
  const r = R.importarRecetas(N);
  assert.equal(r.nuevas, 14);
  assert.deepEqual(r.sinEnlazar, []);
  assert.equal(datos.recetas.length, 14);
});
test('importar otra vez no duplica nada: se actualizan', () => {
  const r = R.importarRecetas(N);
  assert.equal(r.nuevas, 0);
  assert.equal(r.actualizadas, 14);
  assert.equal(datos.recetas.length, 14);
});
test('los pasos, las alternativas y las notas llegan a la receta', () => {
  const t = datos.recetas.find(x => x.nombre === 'Tostadas de pollo y aguacate');
  assert.deepEqual(t.pasos.map(p => p.texto), ['Corta el pollo en tiras.', 'Monta las tostadas con el aguacate machacado y el tomate.']);
  const alb = datos.recetas.find(x => x.nombre === 'Albóndigas caseras con patata');
  assert.equal(alb.ingredientes.find(i => i.id === 304).alternativa, 'Ternera o pavo');
  assert.match(alb.notas, /congelarlas/);
});
test('lo que no tiene cantidad se guarda como «al gusto», sin cantidad inventada', () => {
  const t = datos.recetas.find(x => x.nombre === 'Tostadas de pollo y aguacate');
  const tomate = t.ingredientes.find(i => i.id === 201);
  assert.equal(tomate.sinCantidad, true);
  assert.equal(tomate.cant, null);
  assert.equal(R.textoCantidad(tomate), 'al gusto');
  assert.equal(R.textoCantidad({ cant: 80, unidad: 'g' }), '80g');
});

test('sumas de ingredientes: patata 220+120+150+180 g; tomate triturado 100+100+60; aceite 4×5 ml', () => {
  const nec = R.ingredientesNecesarios({ plan: 'dieta' });
  const de = id => nec.find(x => x.id === id);
  assert.equal(de(204).cant, 670);
  assert.equal(de(204).unidad, 'g');
  assert.equal(de(204).recetas.length, 4);
  assert.equal(de(708).cant, 260);
  assert.equal(de(701).cant, 20);
  assert.equal(de(701).unidad, 'ml');
});
test('lo que no tiene cantidad cuenta como necesario pero no suma ni «mezcla» unidades', () => {
  const nec = R.ingredientesNecesarios({ plan: 'dieta' });
  const tomate = nec.find(x => x.id === 201);
  assert.equal(tomate.sinCantidad, true);
  assert.equal(tomate.cant, 0);
  assert.equal(tomate.mezcla, undefined);
  assert.ok(tomate.recetas.length >= 4);
});
test('si un producto sale con cantidad en una receta y «al gusto» en otra, suma solo la cantidad', () => {
  const nec = R.ingredientesNecesarios({ plan: 'dieta' });
  const aguacate = nec.find(x => x.id === 112);          // 30 g en tostadas y 30 g en fajitas
  assert.equal(aguacate.cant, 60);
  assert.equal(aguacate.sinCantidad, false);
  const limon = nec.find(x => x.id === 113);             // siempre «al gusto»
  assert.equal(limon.sinCantidad, true);
});

test('SEGURIDAD: los pasos y la foto se limpian al importar', () => {
  const pasos = R.sanearPasos([{ texto: '  ' }, 'Corta', { texto: 'x'.repeat(900), min: 5, tipo: 'espera', recurso: 'horno' },
    { texto: 'Mal', min: -3, tipo: 'raro', recurso: 'r'.repeat(80) }, null]);
  assert.equal(pasos.length, 3);
  assert.equal(pasos[1].texto.length, 400);
  assert.deepEqual([pasos[1].min, pasos[1].tipo, pasos[1].recurso], [5, 'espera', 'horno']);
  assert.equal(pasos[2].min, undefined);
  assert.equal(pasos[2].tipo, undefined);
  assert.equal(pasos[2].recurso.length, 30);
  assert.equal(R.sanearPasos('no es lista').length, 0);
  assert.equal(R.sanearFoto('../../etc/passwd.jpg'), 'etcpasswd');          // sin rutas
  assert.equal(R.sanearFoto('Salmón al horno!.PNG'), 'salmon-al-horno');
  assert.equal(R.sanearFoto('   '), '');
  assert.equal(R.sanearFoto('tacos-de-pescado.jpg'), 'tacos-de-pescado');
  assert.equal(R.sanearFoto('<img onerror=1>'), 'img-onerror1');
});

for (const [nombre, fn] of cola) {
  try { await fn(); n++; console.log('  ok  ', nombre); }
  catch (e) { console.error('  FALLA', nombre, '\n ', e.message); process.exitCode = 1; }
}
console.log(`\n${n} pruebas${process.exitCode ? ' (hay fallos)' : ' correctas'}`);
