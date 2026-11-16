/* Pruebas del menú semanal y del bloque de cocina.
   Ejecutar:  node tests/menu.test.mjs */
import assert from 'node:assert/strict';
import { app } from './_app.mjs';

const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };

const { datos } = await app('js/almacen.js');
const E = await app('js/estado.js');
const R = await app('js/recetas.js');
const D = await app('js/despensa.js');
const M = await app('js/menu.js');
const { editarProducto } = await app('js/catalogo-edit.js');
E.reconstruirCatalogo();

let n = 0;
const cola = [];
const test = (nombre, fn) => cola.push([nombre, fn]);

/* Recetas del ejemplo del brief (el lunes 16 de noviembre de 2026 es lunes) */
R.importarRecetas({ recetas: [
  { id: 'salmon', nombre: 'Salmón al horno', comida: 'cena', plan: 'dieta', raciones: 2,
    ingredientes: [{ id: 201, cant: 300, unidad: 'g' }, { id: 402, cant: 300, unidad: 'g' }, { id: 701, cant: 10, unidad: 'ml' }] },
  { id: 'tostadas', nombre: 'Tostadas de aguacate y huevo', comida: 'desayuno', plan: 'dieta', raciones: 2,
    ingredientes: [{ id: 112, cant: 1, unidad: 'ud' }, { id: 501, cant: 2, unidad: 'ud' }, { id: 610, cant: 4, unidad: 'ud' }] },
  { id: 'lentejas', nombre: 'Lentejas estofadas', comida: 'comida', plan: 'dieta', raciones: 2,
    ingredientes: [{ id: 201, cant: 150, unidad: 'g' }, { id: 202, cant: 0.5, unidad: 'ud' }, { id: 701, cant: 10, unidad: 'ml' }, { id: 715, sinCantidad: true }] },
  { id: 'extra', nombre: 'Crema de calabaza', comida: 'cena', plan: 'dieta', raciones: 2, ingredientes: [{ id: 202, cant: 1, unidad: 'ud' }] }
] });

const LUN = '2026-11-16', MAR = '2026-11-17';

test('fechas: lunes de la semana, 7 días, cambio de mes y de año sin desfases', () => {
  assert.equal(M.lunesDe('2026-11-22'), LUN);                 // domingo
  assert.equal(M.lunesDe(LUN), LUN);
  assert.equal(M.lunesDe('2026-11-18'), LUN);
  assert.deepEqual(M.semana('2026-11-19').map(d => d.slice(8)), ['16', '17', '18', '19', '20', '21', '22']);
  assert.equal(M.sumarDias('2026-11-30', 1), '2026-12-01');
  assert.equal(M.sumarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(M.sumarDias('2026-03-28', 1), '2026-03-29');   // día del cambio de hora
  assert.equal(M.sumarDias('2026-03-28', 2), '2026-03-30');
  assert.equal(M.sumarDias('2026-10-24', 2), '2026-10-26');   // y el de octubre
});

test('añadir recetas a una franja; la misma receta no se repite, se actualizan las raciones', () => {
  assert.equal(M.anadirReceta(LUN, 'cena', 'salmon', 2).ok, true);
  assert.equal(M.anadirReceta(LUN, 'cena', 'salmon', 3).ok, true);
  assert.deepEqual(M.diaDe(LUN).cena, [{ r: 'salmon', n: 3 }]);
  M.anadirReceta(LUN, 'cena', 'extra', 2);
  assert.equal(M.diaDe(LUN).cena.length, 2);                  // plato y acompañamiento
});
test('cada receta solo cabe en su momento del día: desayuno en desayuno, comida en comida, cena en cena', () => {
  assert.equal(M.cabeEnFranja(R.recetaPorId('tostadas'), 'desayuno'), true);
  assert.equal(M.cabeEnFranja(R.recetaPorId('tostadas'), 'comida'), false);
  assert.equal(M.cabeEnFranja(R.recetaPorId('lentejas'), 'comida'), true);
  assert.equal(M.cabeEnFranja(R.recetaPorId('lentejas'), 'cena'), false);
  assert.equal(M.cabeEnFranja(R.recetaPorId('salmon'), 'cena'), true);
  assert.equal(M.cabeEnFranja(R.recetaPorId('salmon'), 'desayuno'), false);
  assert.equal(M.cabeEnFranja(null, 'cena'), false);
});
test('el menú rechaza una receta en el momento equivocado, con un mensaje claro, y no la guarda', () => {
  const dia = '2026-12-07';
  const r = M.anadirReceta(dia, 'desayuno', 'salmon', 2);
  assert.equal(r.ok, false);
  assert.equal(r.error, '«Salmón al horno» es una cena: no se puede poner en el desayuno.');
  assert.equal(M.anadirReceta(dia, 'cena', 'tostadas').error, '«Tostadas de aguacate y huevo» es un desayuno: no se puede poner en la cena.');
  assert.equal(M.anadirReceta(dia, 'comida', 'extra').ok, false);
  assert.equal(datos.menu[dia], undefined);                       // y no deja un día vacío a medias
  assert.equal(M.anadirReceta(dia, 'cena', 'salmon', 2).ok, true); // en su sitio, sí
  M.vaciarDia(dia);
});
test('las meriendas y los almuerzos no tienen franja: no se pueden asignar, y se explica por qué', () => {
  R.importarRecetas({ recetas: [
    { id: 'merienda-x', nombre: 'Yogur con fruta', comida: 'merienda', plan: 'dieta', raciones: 1, ingredientes: [{ id: 503, cant: 1, unidad: 'ud' }] },
    { id: 'almuerzo-x', nombre: 'Bocadillo', comida: 'almuerzo', plan: 'dieta', raciones: 1, ingredientes: [{ id: 601, cant: 1, unidad: 'ud' }] }] });
  assert.equal(M.franjaDeReceta('merienda'), null);
  assert.equal(M.franjaDeReceta('almuerzo'), null);
  for (const f of ['desayuno', 'comida', 'cena']) {
    assert.equal(M.cabeEnFranja(R.recetaPorId('merienda-x'), f), false);
    assert.equal(M.anadirReceta('2026-12-07', f, 'almuerzo-x').ok, false);
  }
  assert.equal(M.anadirReceta('2026-12-07', 'comida', 'merienda-x').error,
    '«Yogur con fruta» es una merienda, y el menú solo tiene desayuno, comida y cena.');
});
test('datos no válidos se rechazan sin romper nada', () => {
  assert.equal(M.anadirReceta('mañana', 'cena', 'salmon').ok, false);
  assert.equal(M.anadirReceta(LUN, 'merienda', 'salmon').ok, false);
  assert.equal(M.anadirReceta(LUN, 'cena', 'no-existe').ok, false);
  assert.equal(M.anadirReceta(LUN, 'cena', 'salmon', 9999).ok, true);
  assert.equal(M.diaDe(LUN).cena[0].n, 20);                   // tope de raciones
  M.fijarRaciones(LUN, 'cena', 'salmon', 2);
  assert.equal(M.diaDe(LUN).cena[0].n, 2);
});
test('«cena fuera» vacía la franja y se quita al volver a añadir una receta', () => {
  M.marcarFuera('2026-11-20', 'cena');
  assert.equal(M.diaDe('2026-11-20').fuera.cena, true);
  assert.equal(M.bloqueDe('2026-11-20')[0].fuera, true);
  M.anadirReceta('2026-11-20', 'cena', 'extra', 2);
  assert.equal(M.diaDe('2026-11-20').fuera.cena, undefined);
  M.quitarReceta('2026-11-20', 'cena', 'extra');
  assert.equal(datos.menu['2026-11-20'], undefined);          // un día vacío no deja basura
});
test('recetas borradas no rompen el menú', () => {
  M.anadirReceta('2026-11-21', 'comida', 'lentejas', 1);
  const i = datos.recetas.findIndex(r => r.id === 'lentejas');
  const guardada = datos.recetas.splice(i, 1)[0];
  assert.deepEqual(M.recetasDeFranja('2026-11-21', 'comida'), []);
  datos.recetas.push(guardada);
  M.vaciarDia('2026-11-21');
});

test('el bloque por defecto: cena de hoy + desayuno y comida de mañana', () => {
  M.anadirReceta(MAR, 'desayuno', 'tostadas', 2);
  M.anadirReceta(MAR, 'comida', 'lentejas', 2);
  const b = M.bloqueDe(LUN);
  assert.deepEqual(b.map(x => `${x.fecha}/${x.franja}`), [`${LUN}/cena`, `${MAR}/desayuno`, `${MAR}/comida`]);
  assert.deepEqual(M.recetasDeBloque(LUN).map(x => x.receta.id), ['salmon', 'extra', 'tostadas', 'lentejas']);
});
test('el bloque se puede configurar (quitar un desayuno, añadir una comida extra) y restablecer', () => {
  M.configurarBloque(LUN, [{ f: LUN, s: 'cena' }, { f: MAR, s: 'comida' }, { f: 'mal', s: 'cena' }, { f: MAR, s: 'merienda' }]);
  assert.deepEqual(M.recetasDeBloque(LUN).map(x => x.receta.id), ['salmon', 'extra', 'lentejas']);
  M.restablecerBloque(LUN);
  assert.equal(M.recetasDeBloque(LUN).length, 4);
});

test('copiar un día y copiar una semana entera', () => {
  assert.equal(M.copiarDia(LUN, '2026-11-18'), true);
  assert.equal(M.diaDe('2026-11-18').cena[0].r, 'salmon');
  assert.equal(M.copiarDia('2026-11-19', '2026-11-18'), false);   // un día vacío no se copia
  assert.equal(M.copiarDia(LUN, LUN), false);
  const copiados = M.copiarSemana(LUN, '2026-11-23');
  assert.equal(copiados, 3);                                       // lunes, martes y miércoles tienen algo
  assert.equal(M.diaDe('2026-11-24').comida[0].r, 'lentejas');
  /* una copia sustituye: si el origen está vacío un día, el destino también */
  M.anadirReceta('2026-11-27', 'cena', 'extra', 1);
  M.copiarSemana(LUN, '2026-11-23');
  assert.equal(datos.menu['2026-11-27'], undefined);
  /* y es independiente del original */
  M.fijarRaciones('2026-11-23', 'cena', 'salmon', 5);
  assert.equal(M.diaDe(LUN).cena[0].n, 2);
});

test('EL EJEMPLO DEL BRIEF: tomate 450 g en total = 300 g para la cena + 150 g para la comida', () => {
  /* la cena es para 2 raciones y la receta es de 2; la comida igual */
  const lista = M.consolidar(M.recetasDeBloque(LUN).filter(x => ['salmon', 'lentejas'].includes(x.receta.id)));
  const tomate = lista.find(x => x.id === 201);
  assert.equal(tomate.total, 450);
  assert.equal(tomate.unidad, 'g');
  assert.deepEqual(tomate.desglose.map(d => [d.receta.id, d.cant]), [['salmon', 300], ['lentejas', 150]]);
});
test('las cantidades se recalculan según las raciones planificadas', () => {
  const salmon = R.recetaPorId('salmon');
  const t = M.consolidar([{ receta: salmon, raciones: 4 }]).find(x => x.id === 201);   // receta de 2, se cocina para 4
  assert.equal(t.total, 600);
  const m = M.consolidar([{ receta: salmon, raciones: 1 }]).find(x => x.id === 201);
  assert.equal(m.total, 150);
  assert.equal(M.cantidadEscalada({ sinCantidad: true }, salmon, 4), null);
});
test('lo que la receta no cuantifica cuenta como ingrediente pero no suma', () => {
  const l = M.consolidar([{ receta: R.recetaPorId('lentejas'), raciones: 2 }]);
  const esp = l.find(x => x.id === 715);
  assert.equal(esp.sinCantidad, true);
  assert.equal(esp.total, 0);
});
test('unidades distintas del mismo producto: se suman si hay peso medio y si no se avisa «mezcla»', () => {
  const dos = [
    { receta: { id: 'a', raciones: 1, ingredientes: [{ id: 110, cant: 170, unidad: 'g' }] }, raciones: 1 },
    { receta: { id: 'b', raciones: 1, ingredientes: [{ id: 110, cant: 2, unidad: 'ud' }] }, raciones: 1 }
  ];
  assert.equal(M.consolidar(dos)[0].mezcla, true);             // sin peso medio no se inventa
  editarProducto(110, { pu: 85 });
  const l = M.consolidar(dos)[0];
  assert.equal(l.mezcla, false);
  assert.equal(l.total, 340);                                  // 170 g + 2 × 85 g
});

test('comparado con la despensa: hay, falta, se acaba y desconocido', () => {
  D.fijarStock(201, 650, 'g');                  // tomate: 650 g, hacen falta 450
  D.fijarStock(402, 100, 'g');                  // merluza: 100 g, hacen falta 300
  D.marcar(701, 'agotado');                     // aceite
  D.confirmarHay(202); D.marcar(202, 'acaba');  // cebolla se acaba
  const l = M.consolidar(M.recetasDeBloque(LUN).filter(x => ['salmon', 'lentejas'].includes(x.receta.id)));
  const est = id => l.find(x => x.id === id).estado;
  assert.equal(est(201), 'hay');
  assert.equal(est(402), 'falta');
  assert.equal(est(701), 'agotado');
  assert.equal(est(202), 'acaba');
  assert.equal(est(715), 'desconocido');
  assert.deepEqual(l.find(x => x.id === 201).tengo, { cant: 650, unidad: 'g' });
  const r = M.resumenConsolidado(l);
  assert.equal(r.faltan, 2);                    // merluza y aceite
  assert.equal(r.acaban, 1);
  assert.equal(r.ingredientes, l.length);
});
test('lo que falta pasa a la lista de la compra una sola vez', () => {
  for (const k of Object.keys(datos.lista)) delete datos.lista[k];
  const l = M.consolidar(M.recetasDeBloque(LUN).filter(x => ['salmon', 'lentejas'].includes(x.receta.id)));
  assert.deepEqual(M.faltasDe(l).sort(), [402, 701]);
  assert.deepEqual(M.faltasALaLista(l), { anadidos: 2, yaEstaban: 0, sinSaber: 0 });
  assert.deepEqual(M.faltasALaLista(l), { anadidos: 0, yaEstaban: 2, sinSaber: 0 });
  assert.equal(datos.lista[402], 1);
});
test('al generar la lista entra también lo que no se sabe si hay, pero no lo que se sabe que hay', () => {
  for (const k of Object.keys(datos.lista)) delete datos.lista[k];
  const l = M.consolidar(M.recetasDeBloque(LUN).filter(x => ['salmon', 'lentejas'].includes(x.receta.id)));
  const estrictas = M.faltasDe(l);
  const todas = M.faltasDe(l, { incluirDesconocidos: true });
  assert.ok(todas.length > estrictas.length);
  assert.equal(todas.includes(201), false);                // el tomate: se sabe que hay de sobra
  assert.equal(todas.includes(202), false);                // la cebolla «se acaba»: se sabe, no se repite
  assert.ok(todas.includes(715));                          // especias: no se sabe
  const r = M.faltasALaLista(l, { incluirDesconocidos: true });
  assert.equal(r.anadidos, todas.length);
  assert.ok(r.sinSaber >= 1);
  assert.deepEqual(M.faltasALaLista(l, { incluirDesconocidos: true }).anadidos, 0);   // sin duplicar
  for (const k of Object.keys(datos.lista)) delete datos.lista[k];
});
test('«Tienes todo» o «Falta N» para el selector de recetas', () => {
  const sal = M.disponibilidadReceta(R.recetaPorId('salmon'));
  assert.equal(sal.faltan, 2);
  assert.equal(sal.todo, false);
  D.fijarStock(402, 500, 'g'); D.fijarStock(701, 500, 'ml');
  const ok = M.disponibilidadReceta(R.recetaPorId('salmon'));
  assert.deepEqual([ok.faltan, ok.todo], [0, true]);
  /* con algo sin comprobar no se dice «tienes todo» */
  const sin = M.disponibilidadReceta(R.recetaPorId('tostadas'));
  assert.equal(sin.todo, false);
  assert.ok(sin.sinComprobar > 0);
});

test('«qué toca hoy»: el bloque, los platos, lo que falta y lo de mañana', () => {
  const h = M.tocaHoy(LUN);
  assert.equal(h.recetas.length, 4);
  assert.deepEqual(h.recetas.map(x => x.franja), ['cena', 'cena', 'desayuno', 'comida']);
  assert.ok(h.resumen.ingredientes > 5);
  /* el miércoles es una copia del lunes (cena: salmón y crema), así que mañana, el martes, ya hay platos */
  assert.deepEqual(M.tocaHoy(MAR).mananaNombres, ['Salmón al horno', 'Crema de calabaza']);
  M.anadirReceta('2026-11-19', 'desayuno', 'tostadas', 2);       // el bloque del miércoles incluye el desayuno del JUEVES
  assert.ok(M.tocaHoy(MAR).mananaNombres.includes('Tostadas de aguacate y huevo'));
});
test('«generar lista» de la semana: todo lo planificado', () => {
  const l = M.consolidarSemana(M.semana(LUN));
  const tomate = l.find(x => x.id === 201);
  assert.equal(tomate.total, 750);             // lunes 300 g (salmón) + martes 150 g (lentejas) + miércoles 300 g (copia del lunes)
  assert.equal(tomate.desglose.length, 3);
});

test('cada receta tiene siempre el mismo color, de la paleta', () => {
  const r = R.recetaPorId('salmon');
  assert.equal(M.colorDeReceta(r), M.colorDeReceta({ ...r }));
  assert.ok(M.PALETA_RECETAS.includes(M.colorDeReceta(r)));
  const colores = new Set(datos.recetas.map(M.colorDeReceta));
  assert.ok(colores.size >= 2);
});

for (const [nombre, fn] of cola) {
  try { await fn(); n++; console.log('  ok  ', nombre); }
  catch (e) { console.error('  FALLA', nombre, '\n ', e.message); process.exitCode = 1; }
}
console.log(`\n${n} pruebas${process.exitCode ? ' (hay fallos)' : ' correctas'}`);
