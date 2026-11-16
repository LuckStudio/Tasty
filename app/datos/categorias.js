/* ============================================================
   CATEGORÍAS — tipos de alimento
   ------------------------------------------------------------
   El `id` se usa en catalogo.js y como nombre de carpeta
   dentro de /iconos/. Si añades una categoría nueva, crea
   también su carpeta de iconos con el mismo id.

   `grupo`: "alimento" | "otros"
   Los de grupo "otros" se muestran al final del grid.
   ============================================================ */

/* `bloque` es el rango de ids de la categoría. Un producto nuevo
   coge el primer id libre por encima del último de su bloque, así
   los ids nunca se pisan entre categorías. */
export const CATEGORIAS = [
  { id: 'frutas',     nombre: 'Frutas',           grupo: 'alimento', bloque: 100  },
  { id: 'verduras',   nombre: 'Verduras',         grupo: 'alimento', bloque: 200  },
  { id: 'carne',      nombre: 'Carne',            grupo: 'alimento', bloque: 300  },
  { id: 'pescado',    nombre: 'Pescado',          grupo: 'alimento', bloque: 400  },
  { id: 'lacteos',    nombre: 'Huevos y lácteos', grupo: 'alimento', bloque: 500  },
  { id: 'panaderia',  nombre: 'Panadería',        grupo: 'alimento', bloque: 600  },
  { id: 'despensa',   nombre: 'Despensa',         grupo: 'alimento', bloque: 700  },
  { id: 'congelados', nombre: 'Congelados',       grupo: 'alimento', bloque: 800  },
  { id: 'bebidas',    nombre: 'Bebidas',          grupo: 'alimento', bloque: 900  },
  { id: 'snacks',     nombre: 'Dulces y snacks',  grupo: 'alimento', bloque: 1000 },
  { id: 'higiene',    nombre: 'Higiene',          grupo: 'otros',    bloque: 1100 },
  { id: 'hogar',      nombre: 'Hogar',            grupo: 'otros',    bloque: 1200 },
  { id: 'farmacia',   nombre: 'Farmacia',         grupo: 'otros',    bloque: 1300 },
  { id: 'gym',        nombre: 'GYM',              grupo: 'otros',    bloque: 1400 }
];

/* Frecuencia de compra — estructura primaria del grid.
   El número es el que se guarda en el campo `f` del producto. */
export const FRECUENCIAS = [
  { id: 3, slug: 'usual',    nombre: 'Compra usual',  abierto: true  },
  { id: 2, slug: 'puntual',  nombre: 'Puntuales',     abierto: true  },
  { id: 1, slug: 'raro',     nombre: 'Rara vez',      abierto: false }
];

export const CAT_POR_ID = Object.fromEntries(CATEGORIAS.map(c => [c.id, c]));
export const FREC_POR_ID = Object.fromEntries(FRECUENCIAS.map(f => [f.id, f]));
