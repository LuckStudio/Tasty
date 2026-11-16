/* ============================================================
   UNIDADES — cómo se vende, cuánto se compra
   ------------------------------------------------------------
   Distingue:
     CÓMO SE VENDE   por kg, por litro, por unidad (campo `u`
                     del producto) y su precio base: 3,20 €/kg
     CUÁNTO SE COMPRA  500 g, 2 unidades, 1,5 L

   Y convierte entre unidades de receta y de compra. Para pasar
   de unidades a peso hace falta el PESO MEDIO POR UNIDAD
   (campo `pu`, en gramos, editable por producto): 6 kiwis de
   85 g son ≈ 510 g.

   Funciones puras, sin DOM: se prueban aparte.
   ============================================================ */

/* Todo se normaliza a: gramos (masa), mililitros (volumen) o
   unidades (cuenta). */
const UNIDADES = {
  g:   { tipo: 'masa',    f: 1 },
  kg:  { tipo: 'masa',    f: 1000 },
  ml:  { tipo: 'volumen', f: 1 },
  cl:  { tipo: 'volumen', f: 10 },
  l:   { tipo: 'volumen', f: 1000 },
  ud:  { tipo: 'cuenta',  f: 1 }
};

const ALIAS = {
  gr: 'g', gramo: 'g', gramos: 'g', kilo: 'kg', kilos: 'kg', kilogramo: 'kg',
  litro: 'l', litros: 'l', lt: 'l', mililitros: 'ml',
  u: 'ud', uds: 'ud', unidad: 'ud', unidades: 'ud', pieza: 'ud', piezas: 'ud'
};

export function unidadNormal(u) {
  const k = String(u || '').toLowerCase().trim().replace('.', '');
  const n = ALIAS[k] || k;
  return UNIDADES[n] ? n : null;
}

export function tipoDe(u) { return UNIDADES[unidadNormal(u)]?.tipo || null; }

/* Unidad base de comparación del producto: 'kg' | 'l' | 'ud' */
export function tipoDeBase(base) {
  return { kg: 'masa', l: 'volumen', ud: 'cuenta' }[base] || null;
}

/* Lee "500 g", "1,5 kg", "2 ud", "250ml", "x12". null si no se entiende */
export function leerCantidad(texto) {
  const m = /^\s*(?:x\s*)?(\d+(?:[.,]\d+)?)\s*([a-zA-Zñ.]*)\s*$/.exec(String(texto ?? ''));
  if (!m) return null;
  const valor = parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(valor) || valor <= 0) return null;
  const unidad = m[2] ? unidadNormal(m[2]) : 'ud';
  return unidad ? { valor, unidad } : null;
}

/* Cantidad -> cantidad en la unidad base del producto ('kg', 'l', 'ud').
   producto: { u: 'kg'|'l'|'ud', pu?: gramos por unidad }
   Devuelve null si no se puede convertir (falta el peso medio). */
export function aBase(cantidad, unidad, producto) {
  const u = unidadNormal(unidad);
  const base = producto?.u || 'ud';
  if (!u) return null;
  const { tipo, f } = UNIDADES[u];

  if (tipo === tipoDeBase(base)) {
    const enMinima = cantidad * f;                 // g, ml o ud
    return base === 'ud' ? enMinima : enMinima / 1000;
  }
  /* Unidades -> masa, con el peso medio */
  if (tipo === 'cuenta' && base === 'kg' && producto?.pu > 0) {
    return (cantidad * producto.pu) / 1000;
  }
  /* Masa -> unidades */
  if (tipo === 'masa' && base === 'ud' && producto?.pu > 0) {
    return (cantidad * f) / producto.pu;
  }
  return null;
}

/* De una cantidad en una unidad a otra, para el mismo producto.
   6 ud de kiwi (85 g) -> 'g' = 510. null si no hay forma. */
export function convertir(cantidad, de, a, producto) {
  const origen = unidadNormal(de), destino = unidadNormal(a);
  if (!origen || !destino) return null;
  const to = UNIDADES[origen], td = UNIDADES[destino];

  if (to.tipo === td.tipo) return (cantidad * to.f) / td.f;

  const pu = producto?.pu;
  if (!(pu > 0)) return null;
  if (to.tipo === 'cuenta' && td.tipo === 'masa') return (cantidad * pu) / td.f;
  if (to.tipo === 'masa' && td.tipo === 'cuenta') return (cantidad * to.f) / pu;
  return null;
}

/* Cuánto cuesta una cantidad concreta a un precio base.
   500 g a 3,20 €/kg = 1,60 € */
export function precioDeCantidad(precioBase, cantidad, unidad, producto) {
  if (!(precioBase >= 0)) return null;
  const q = aBase(cantidad, unidad, producto);
  return q == null ? null : Math.round(precioBase * q * 100) / 100;
}

/* Precio por unidad base a partir de lo que se pagó.
   Ticket a granel: 0,612 kg por 2,14 € -> 3,50 €/kg */
export function precioBaseDeCompra(importe, cantidad, unidad, producto) {
  const q = aBase(cantidad, unidad, producto);
  if (!(q > 0) || !(importe >= 0)) return null;
  return Math.round((importe / q) * 100) / 100;
}

/* Cuánto comprar para cubrir lo que pide una receta, redondeando al
   formato en que se vende (bandeja de 500 g, etc.). Devuelve
   { cantidad, unidad } en la unidad del formato. */
export function cantidadACompra(necesario, unidadNec, formato, producto) {
  const f = unidadNormal(formato.unidad);
  const enFormato = convertir(necesario, unidadNec, f, producto);
  if (enFormato == null) return null;
  const paquetes = Math.max(1, Math.ceil(enFormato / formato.cantidad - 1e-9));
  return { paquetes, cantidad: paquetes * formato.cantidad, unidad: f };
}

/* Atajos para el teclado de cantidad según cómo se vende */
export function atajos(base) {
  if (base === 'kg') return [{ v: 250, u: 'g' }, { v: 500, u: 'g' }, { v: 750, u: 'g' }, { v: 1, u: 'kg' }];
  if (base === 'l')  return [{ v: 250, u: 'ml' }, { v: 500, u: 'ml' }, { v: 1, u: 'l' }, { v: 2, u: 'l' }];
  return [{ v: 1, u: 'ud' }, { v: 2, u: 'ud' }, { v: 6, u: 'ud' }, { v: 12, u: 'ud' }];
}

/* Formato legible: 0.5 kg -> "500 g"; 1.25 l -> "1,25 L" */
export function formatearCantidad(valor, unidad) {
  const u = unidadNormal(unidad) || unidad;
  let v = valor, s = u;
  if (u === 'kg' && valor < 1) { v = valor * 1000; s = 'g'; }
  if (u === 'l' && valor < 1)  { v = valor * 1000; s = 'ml'; }
  const txt = String(Math.round(v * 100) / 100).replace('.', ',');
  return `${txt} ${s === 'l' ? 'L' : s}`;
}
