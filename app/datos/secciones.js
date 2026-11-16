/* ============================================================
   SECCIONES — los pasillos de un supermercado
   ------------------------------------------------------------
   Catálogo común. Cada producto pertenece a una sección y cada
   tienda ordena esas secciones según su recorrido real (ver
   js/secciones.js). Una cadena puede tener recorridos distintos
   en tiendas distintas.

   `id`     corto, sin acentos. No cambia nunca.
   `orden`  posición por defecto cuando una tienda aún no tiene
            ruta propia.
   ============================================================ */

export const SECCIONES = [
  { id: 'fruta-verdura',      nombre: 'Fruta y verdura',   orden: 1  },
  { id: 'carnes',             nombre: 'Carnes',            orden: 2  },
  { id: 'pescaderia',         nombre: 'Pescadería',        orden: 3  },
  { id: 'platos-preparados',  nombre: 'Platos preparados', orden: 4  },
  { id: 'lacteos-huevos',     nombre: 'Lácteos y huevos',  orden: 5  },
  { id: 'panaderia',          nombre: 'Panadería',         orden: 6  },
  { id: 'despensa',           nombre: 'Despensa',          orden: 7  },
  { id: 'aceites',            nombre: 'Aceites',           orden: 8  },
  { id: 'congelados',         nombre: 'Congelados',        orden: 9  },
  { id: 'bebidas',            nombre: 'Bebidas',           orden: 10 },
  { id: 'dulces-snacks',      nombre: 'Dulces y snacks',   orden: 11 },
  { id: 'drogueria',          nombre: 'Droguería e higiene', orden: 12 },
  { id: 'hogar',              nombre: 'Hogar',             orden: 13 },
  { id: 'farmacia',           nombre: 'Farmacia',          orden: 14 },
  { id: 'gym',                nombre: 'Suplementos y gym', orden: 15 }
];

/* Sección que se asigna por defecto según la categoría del
   producto, mientras el usuario no la cambie a mano. */
export const SECCION_DE_CATEGORIA = {
  frutas: 'fruta-verdura',
  verduras: 'fruta-verdura',
  carne: 'carnes',
  pescado: 'pescaderia',
  lacteos: 'lacteos-huevos',
  panaderia: 'panaderia',
  despensa: 'despensa',
  congelados: 'congelados',
  bebidas: 'bebidas',
  snacks: 'dulces-snacks',
  higiene: 'drogueria',
  hogar: 'hogar',
  farmacia: 'farmacia',
  gym: 'gym'
};

export const SECCION_POR_ID = Object.fromEntries(SECCIONES.map(s => [s.id, s]));

/* Grupo para los productos que no tienen sección */
export const SIN_SECCION = 'sin-seccion';
