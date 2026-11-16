/* Pruebas del sistema visual: contraste AA real y acento por tienda.
   Ejecutar:  node tests/diseno.test.mjs */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contraste, acentoAccesible, aRGB } from '../app/js/color.js';

const css = readFileSync(new URL('../app/css/base.css', import.meta.url), 'utf8');
const bloque = (inicio) => {
  const i = css.indexOf(inicio); const f = css.indexOf('}', i);
  const out = {};
  for (const m of css.slice(i, f).matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)) out[m[1]] = m[2];
  return out;
};
const claro = bloque(':root {');
const oscuro = bloque(':root[data-tema="oscuro"] {');
const oscuroAuto = bloque(':root:not([data-tema="claro"]) {');
const completo = (t) => ({ ...claro, ...t });

let n = 0;
const test = (nombre, fn) => { try { fn(); n++; console.log('  ok  ', nombre); } catch (e) { console.error('  FALLA', nombre, '\n ', e.message); process.exitCode = 1; } };

test('la utilidad de contraste da los valores de referencia WCAG', () => {
  assert.equal(Math.round(contraste('#000000', '#FFFFFF')), 21);
  assert.equal(contraste('#777777', '#777777'), 1);
});
test('el tema oscuro del sistema y el forzado definen los mismos colores', () => {
  assert.deepEqual(oscuro, oscuroAuto);
});

for (const [tema, t] of [['claro', completo({})], ['oscuro', completo(oscuro)]]) {
  const pares = [
    ['texto sobre papel',            t.tinta,          t.papel,  4.5],
    ['texto sobre ticket',           t.tinta,          t.ticket, 4.5],
    ['texto suave sobre papel',      t['tinta-suave'], t.papel,  4.5],
    ['texto suave sobre ticket',     t['tinta-suave'], t.ticket, 4.5],
    ['texto secundario sobre papel', t['muted-2'] || '#454B58', t.papel, 4.5],
    ['botón principal',              t['sobre-acento'], t.acento, 4.5],
    ['enlace/acento sobre papel',    t.acento,         t.papel,  4.5],
    ['«Hay stock» sobre ticket',     t.hay,            t.ticket, 4.5],
    ['«Se acaba» sobre ticket',      t.acaba,          t.ticket, 4.5],
    ['«Agotado» sobre ticket',       t.agotado,        t.ticket, 4.5],
    ['«Se acaba» sobre papel',       t.acaba,          t.papel,  4.5],
  ];
  for (const [nombre, a, b, min] of pares) {
    test(`AA ${tema}: ${nombre} (${a} / ${b})`, () => {
      const c = contraste(a, b);
      assert.ok(c >= min, `contraste ${c.toFixed(2)} < ${min}`);
    });
  }
}

/* colores de las tiendas, tal como están en datos/tiendas.js */
const tiendas = [...readFileSync(new URL('../app/datos/tiendas.js', import.meta.url), 'utf8')
  .matchAll(/nombre: '([^']+)'.*?color: '(#[0-9A-Fa-f]{6})'/g)].map(m => ({ nombre: m[1], color: m[2] }));
tiendas.push({ nombre: 'Mercadona (PDF)', color: '#00774A' }, { nombre: 'Dia (PDF)', color: '#C8102E' },
             { nombre: 'Otra cadena (PDF)', color: '#C24400' }, { nombre: 'Amarillo extremo', color: '#FFD400' },
             { nombre: 'Blanco', color: '#FFFFFF' }, { nombre: 'Negro', color: '#000000' });

test(`se han leído las tiendas del catálogo (${tiendas.length})`, () => assert.ok(tiendas.length >= 12));
for (const oscuroTema of [false, true]) {
  for (const t of tiendas) {
    test(`acento ${oscuroTema ? 'oscuro' : 'claro'} accesible: ${t.nombre} ${t.color}`, () => {
      const r = acentoAccesible(t.color, oscuroTema);
      assert.ok(r, 'sin resultado');
      assert.ok(contraste(r.acento, r.texto) >= 4.5, `contraste ${contraste(r.acento, r.texto).toFixed(2)}`);
    });
  }
}
test('un color que ya cumple se respeta tal cual', () => {
  assert.equal(acentoAccesible('#2B59C3').acento, '#2B59C3');
  assert.equal(acentoAccesible('#00774A').acento, '#00774A');
});
test('un color que no cumple se oscurece conservando el matiz', () => {
  const r = acentoAccesible('#FFD400');
  const [rr, gg, bb] = aRGB(r.acento);
  assert.ok(rr > bb && gg > bb, 'sigue siendo amarillo');
});
test('un color inválido no rompe nada', () => assert.equal(acentoAccesible('rojo'), null));

console.log(`\n${n} pruebas${process.exitCode ? ' (hay fallos)' : ' correctas'}`);
