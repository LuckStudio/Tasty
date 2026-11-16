/* ============================================================
   CANTIDAD A PESO FRACCIONADO  (lógica de la pantalla 19)
   ------------------------------------------------------------
   Distingue CÓMO SE VENDE un producto (por kg, por litro, por
   unidad) de CUÁNTO SE COMPRA: 500 g a 3,49 €/kg son 1,75 €.

   El estado guarda un número entero en la unidad mínima (gramos,
   mililitros o unidades) y el modo («peso» o «unidades»). Teclear
   dígitos lo va construyendo; los atajos lo fijan de golpe.
   Sin DOM: se prueba aparte.
   ============================================================ */

import { precioDeCantidad, convertir, formatearCantidad, atajos } from './unidades.js?v=36';

const TOPE = 99999;

/* Modos posibles según cómo se vende el producto */
export function modosDe(producto) {
  if (producto?.u === 'ud') return ['unidades'];
  /* Por unidades solo tiene sentido si se sabe lo que pesa una */
  return producto?.pu > 0 ? ['peso', 'unidades'] : ['peso'];
}

export function nombreModo(modo, producto) {
  if (modo === 'unidades') return 'Por unidades';
  return producto?.u === 'l' ? 'Por volumen' : 'Por peso';
}

const unidadMinima = producto => (producto?.u === 'l' ? 'ml' : 'g');

export function estadoInicial(producto, inicial = null) {
  const modos = modosDe(producto);
  if (inicial?.v > 0) {
    if (inicial.u === 'ud') return { modo: 'unidades', valor: Math.round(inicial.v) };
    const enMinima = convertir(inicial.v, inicial.u, unidadMinima(producto));
    if (enMinima != null && modos.includes('peso')) return { modo: 'peso', valor: Math.round(enMinima) };
  }
  return { modo: modos[0], valor: 0 };
}

export function cambiarModo(est, modo, producto) {
  if (!modosDe(producto).includes(modo) || modo === est.modo) return est;
  /* Al cambiar de modo se conserva lo equivalente si se puede */
  const q = leer(est, producto);
  if (q) {
    const destino = modo === 'unidades' ? 'ud' : unidadMinima(producto);
    const v = convertir(q.v, q.u, destino, producto);
    if (v != null) return { modo, valor: Math.max(0, Math.round(v)) };
  }
  return { modo, valor: 0 };
}

export function teclear(est, tecla) {
  if (tecla === 'C') return { ...est, valor: 0 };
  if (tecla === '<') return { ...est, valor: Math.floor(est.valor / 10) };
  if (/^\d$/.test(tecla)) {
    const nuevo = est.valor * 10 + Number(tecla);
    return nuevo > TOPE ? est : { ...est, valor: nuevo };
  }
  return est;
}

/* Un atajo es de peso/volumen (250 g, 1 kg) o de unidades (6 ud) */
export function aplicarAtajo(est, atajo, producto) {
  if (atajo.u === 'ud') return { modo: 'unidades', valor: atajo.v };
  const v = convertir(atajo.v, atajo.u, unidadMinima(producto));
  return v == null ? est : { modo: 'peso', valor: Math.round(v) };
}

/* Los atajos que se ofrecen: según cómo se vende el producto y el modo */
export function atajosDe(est, producto) {
  if (est.modo === 'unidades') return [1, 2, 4, 6].map(v => ({ v, u: 'ud' }));
  return atajos(producto?.u === 'l' ? 'l' : 'kg');
}

/* La cantidad en una unidad «normal» para guardarla: 1500 g -> 1,5 kg */
export function leer(est, producto) {
  if (!(est.valor > 0)) return null;
  if (est.modo === 'unidades') return { v: est.valor, u: 'ud' };
  const grande = producto?.u === 'l' ? 'l' : 'kg';
  return est.valor >= 1000
    ? { v: Math.round(est.valor) / 1000, u: grande }
    : { v: est.valor, u: unidadMinima(producto) };
}

/* Texto grande de la pantalla */
export function mostrar(est, producto) {
  const q = leer(est, producto);
  if (!q) return est.modo === 'unidades' ? '0 ud' : `0 ${unidadMinima(producto)}`;
  return q.u === 'ud' ? `${q.v} ud` : formatearCantidad(q.v, q.u);
}

/* «≈ 6 kiwis · 1,75 €»: equivalencia y precio, solo lo que se sabe */
export function aproximacion(est, producto, precioBase) {
  const q = leer(est, producto);
  if (!q) return { texto: '', precio: null };
  const partes = [];

  if (producto?.pu > 0 && producto.u !== 'ud') {
    if (est.modo === 'peso') {
      const uds = convertir(q.v, q.u, 'ud', producto);
      if (uds != null && uds >= 0.5) partes.push(`≈ ${Math.round(uds)} ${Math.round(uds) === 1 ? 'unidad' : 'unidades'}`);
    } else {
      const g = convertir(q.v, 'ud', 'g', producto);
      if (g != null) partes.push('≈ ' + formatearCantidad(g >= 1000 ? g / 1000 : g, g >= 1000 ? 'kg' : 'g'));
    }
  }

  const precio = precioBase != null ? precioDeCantidad(precioBase, q.v, q.u, producto) : null;
  if (precio != null) partes.push(precio.toFixed(2).replace('.', ',') + ' €');
  return { texto: partes.join(' · '), precio };
}
