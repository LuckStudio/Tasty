/* ============================================================
   CATÁLOGO DE PRODUCTOS
   ------------------------------------------------------------
   REGLAS QUE NO SE ROMPEN NUNCA:

   1. El `id` de un producto no cambia jamás. Los enlaces
      compartidos antiguos dependen de él.
   2. Para quitar un producto NO lo borres: pon `a: true`
      (archivado). Desaparece del grid pero su id sigue
      reservado.
   3. Un producto nuevo siempre coge un id libre por encima
      del último de su bloque. Nunca reutilices ids.

   Los ids van por bloques de 100 según categoría, así queda
   sitio de sobra para crecer:
     100 frutas · 200 verduras · 300 carne · 400 pescado
     500 lácteos · 600 panadería · 700 despensa
     800 congelados · 900 bebidas · 1000 snacks
     1100 higiene · 1200 hogar · 1300 farmacia · 1400 gym

   CAMPOS
     id  número permanente
     n   nombre visible
     c   categoría (ver categorias.js)
     f   frecuencia: 3 usual · 2 puntual · 1 rara vez
     u   unidad base para comparar precios: 'kg' | 'l' | 'ud'
     e   emoji de reserva si no existe el SVG
     t   tienda preferida (opcional, ver tiendas.js)
     a   archivado (opcional, por defecto false)
     p   precios conocidos por tienda (opcional):
           { mercadona: { f: 1.60,   precio del formato, en €
                          b: 1.60,   precio por unidad base
                          q: 1,      cantidad del formato
                          u: 'kg',   unidad del formato
                          d: '2026-08-03' } }   fecha del dato

     Los campos t y p se consolidan aquí desde el export de la
     app: lo que estaba solo en un móvil pasa a verlo todo el
     mundo que abra el enlace.

   ICONOS
     El icono se busca en  /iconos/<categoria>/<slug>.svg
     El slug se genera del nombre: minúsculas, sin acentos,
     espacios convertidos en guion bajo.
       "Tomate"          -> iconos/verduras/tomate.svg
       "Patatas fritas"  -> iconos/snacks/patatas_fritas.svg
       "Plátanos"        -> iconos/frutas/platanos.svg
     Si el archivo no existe, se usa el emoji `e`.
     Si tampoco hay emoji, se usa la inicial del nombre.
   ============================================================ */

export const CATALOGO = [

  /* ---------- FRUTAS ---------- */
  { id: 101, n: 'Plátanos',       c: 'frutas', f: 3, u: 'kg', e: '🍌' },
  { id: 102, n: 'Manzanas',       c: 'frutas', f: 3, u: 'kg', e: '🍎' },
  { id: 103, n: 'Naranjas',       c: 'frutas', f: 3, u: 'kg', e: '🍊' },
  { id: 104, n: 'Mandarinas',     c: 'frutas', f: 2, u: 'kg', e: '🍊' },
  { id: 105, n: 'Peras',          c: 'frutas', f: 2, u: 'kg', e: '🍐' },
  { id: 106, n: 'Fresas',         c: 'frutas', f: 2, u: 'kg', e: '🍓' },
  { id: 107, n: 'Uvas',           c: 'frutas', f: 2, u: 'kg', e: '🍇' },
  { id: 108, n: 'Sandía',         c: 'frutas', f: 2, u: 'ud', e: '🍉' },
  { id: 109, n: 'Melón',          c: 'frutas', f: 2, u: 'ud', e: '🍈' },
  { id: 110, n: 'Kiwi',           c: 'frutas', f: 2, u: 'kg', e: '🥝' },
  { id: 111, n: 'Piña',           c: 'frutas', f: 2, u: 'ud', e: '🍍' },
  { id: 112, n: 'Aguacate',       c: 'frutas', f: 3, u: 'ud', e: '🥑' },
  { id: 113, n: 'Limones',        c: 'frutas', f: 3, u: 'kg', e: '🍋' },
  { id: 114, n: 'Melocotón',      c: 'frutas', f: 1, u: 'kg', e: '🍑' },
  { id: 115, n: 'Cerezas',        c: 'frutas', f: 1, u: 'kg', e: '🍒' },
  { id: 116, n: 'Arándanos',      c: 'frutas', f: 1, u: 'kg', e: '🫐' },
  { id: 117, n: 'Mango',          c: 'frutas', f: 1, u: 'ud', e: '🥭' },
  { id: 118, n: 'Granada',        c: 'frutas', f: 1, u: 'ud', e: '🍎' },
  { id: 119, n: 'Ciruelas',       c: 'frutas', f: 1, u: 'kg', e: '🍑' },
  { id: 120, n: 'Frutos secos',   c: 'frutas', f: 2, u: 'kg', e: '🥜' },
  { id: 121, n: 'Frutos rojos',    c: 'frutas', f: 2, u: 'kg', e: '🫐' },
  { id: 122, n: 'Pieza de fruta',  c: 'frutas', f: 3, u: 'ud', e: '🍏' },
  { id: 123, n: 'Nectarina',       c: 'frutas', f: 2, u: 'kg', e: '🍑' },

  /* ---------- VERDURAS ---------- */
  { id: 201, n: 'Tomate',         c: 'verduras', f: 3, u: 'kg', e: '🍅' },
  { id: 202, n: 'Cebolla',        c: 'verduras', f: 3, u: 'kg', e: '🧅' },
  { id: 203, n: 'Ajo',            c: 'verduras', f: 3, u: 'ud', e: '🧄' },
  { id: 204, n: 'Patatas',        c: 'verduras', f: 3, u: 'kg', e: '🥔' },
  { id: 205, n: 'Zanahoria',      c: 'verduras', f: 3, u: 'kg', e: '🥕' },
  { id: 206, n: 'Lechuga',        c: 'verduras', f: 3, u: 'ud', e: '🥬' },
  { id: 207, n: 'Pimiento rojo',  c: 'verduras', f: 3, u: 'kg', e: '🫑' },
  { id: 208, n: 'Pimiento verde', c: 'verduras', f: 3, u: 'kg', e: '🫑' },
  { id: 209, n: 'Calabacín',      c: 'verduras', f: 3, u: 'kg', e: '🥒', t: 'mercadona',
    p: { mercadona: { f: 1.60, b: 1.60, q: 1, u: 'kg', d: '2026-08-03' } } },
  { id: 210, n: 'Berenjena',      c: 'verduras', f: 2, u: 'kg', e: '🍆' },
  { id: 211, n: 'Pepino',         c: 'verduras', f: 2, u: 'ud', e: '🥒' },
  { id: 212, n: 'Brócoli',        c: 'verduras', f: 2, u: 'kg', e: '🥦' },
  { id: 213, n: 'Champiñones',    c: 'verduras', f: 2, u: 'kg', e: '🍄' },
  { id: 214, n: 'Espinacas',      c: 'verduras', f: 2, u: 'kg', e: '🥬' },
  { id: 215, n: 'Puerro',         c: 'verduras', f: 2, u: 'ud', e: '🥬',
    p: { mercadona: { f: 2.05, b: 2.05, q: 1, u: 'ud', d: '2026-08-03' } } },
  { id: 216, n: 'Calabaza',       c: 'verduras', f: 1, u: 'kg', e: '🎃' },
  { id: 217, n: 'Coliflor',       c: 'verduras', f: 1, u: 'ud', e: '🥦' },
  { id: 218, n: 'Judías verdes',  c: 'verduras', f: 2, u: 'kg', e: '🫛' },
  { id: 219, n: 'Apio',           c: 'verduras', f: 1, u: 'ud', e: '🥬' },
  { id: 220, n: 'Maíz',           c: 'verduras', f: 1, u: 'ud', e: '🌽' },
  { id: 221, n: 'Jengibre',       c: 'verduras', f: 1, u: 'kg', e: '🫚' },
  { id: 222, n: 'Aguacate maduro',c: 'verduras', f: 1, u: 'ud', e: '🥑', a: true },
  { id: 223, n: 'Rúcula',         c: 'verduras', f: 2, u: 'ud', e: '🥬' },
  { id: 224, n: 'Perejil',        c: 'verduras', f: 1, u: 'ud', e: '🌿' },
  { id: 225, n: 'Boniato',        c: 'verduras', f: 2, u: 'kg', e: '🍠' },
  { id: 226, n: 'Espárragos',     c: 'verduras', f: 2, u: 'kg', e: '🌱' },

  /* ---------- CARNE ---------- */
  { id: 301, n: 'Pollo entero',    c: 'carne', f: 2, u: 'kg', e: '🍗' },
  { id: 302, n: 'Pechuga de pollo',c: 'carne', f: 3, u: 'kg', e: '🍗' },
  { id: 303, n: 'Muslos de pollo', c: 'carne', f: 2, u: 'kg', e: '🍗' },
  { id: 304, n: 'Carne picada',    c: 'carne', f: 3, u: 'kg', e: '🥩' },
  { id: 305, n: 'Ternera',         c: 'carne', f: 2, u: 'kg', e: '🥩' },
  { id: 306, n: 'Cerdo',           c: 'carne', f: 2, u: 'kg', e: '🥓' },
  { id: 307, n: 'Lomo',            c: 'carne', f: 2, u: 'kg', e: '🥩' },
  { id: 308, n: 'Bacon',           c: 'carne', f: 2, u: 'kg', e: '🥓' },
  { id: 309, n: 'Jamón serrano',   c: 'carne', f: 2, u: 'kg', e: '🍖' },
  { id: 310, n: 'Jamón cocido',    c: 'carne', f: 3, u: 'kg', e: '🍖' },
  { id: 311, n: 'Pavo',            c: 'carne', f: 2, u: 'kg', e: '🍗' },
  { id: 312, n: 'Chorizo',         c: 'carne', f: 2, u: 'kg', e: '🌭' },
  { id: 313, n: 'Salchichas',      c: 'carne', f: 2, u: 'kg', e: '🌭' },
  { id: 314, n: 'Costillas',       c: 'carne', f: 1, u: 'kg', e: '🍖' },
  { id: 315, n: 'Hamburguesas',    c: 'carne', f: 2, u: 'ud', e: '🍔' },
  { id: 316, n: 'Conejo',          c: 'carne', f: 1, u: 'kg', e: '🍖' },
  { id: 317, n: 'Cordero',         c: 'carne', f: 1, u: 'kg', e: '🍖' },
  { id: 318, n: 'Salchichón',      c: 'carne', f: 1, u: 'kg', e: '🌭' },
  { id: 319, n: 'Pechuga de pavo', c: 'carne', f: 3, u: 'kg', e: '🦃' },

  /* ---------- PESCADO ---------- */
  { id: 401, n: 'Salmón',         c: 'pescado', f: 2, u: 'kg', e: '🐟' },
  { id: 402, n: 'Merluza',        c: 'pescado', f: 2, u: 'kg', e: '🐟' },
  { id: 403, n: 'Atún fresco',    c: 'pescado', f: 1, u: 'kg', e: '🐟' },
  { id: 404, n: 'Dorada',         c: 'pescado', f: 1, u: 'kg', e: '🐟' },
  { id: 405, n: 'Lubina',         c: 'pescado', f: 1, u: 'kg', e: '🐟' },
  { id: 406, n: 'Bacalao',        c: 'pescado', f: 1, u: 'kg', e: '🐟' },
  { id: 407, n: 'Gambas',         c: 'pescado', f: 2, u: 'kg', e: '🦐',
    p: { mercadona: { f: 4.90, b: 9.80, q: 500, u: 'g', d: '2026-08-03' } } },
  { id: 408, n: 'Mejillones',     c: 'pescado', f: 1, u: 'kg', e: '🦪' },
  { id: 409, n: 'Calamares',      c: 'pescado', f: 1, u: 'kg', e: '🦑' },
  { id: 410, n: 'Boquerones',     c: 'pescado', f: 1, u: 'kg', e: '🐟' },
  { id: 411, n: 'Sardinas',       c: 'pescado', f: 1, u: 'kg', e: '🐟' },
  { id: 412, n: 'Pulpo',          c: 'pescado', f: 1, u: 'kg', e: '🐙' },
  { id: 413, n: 'Salmón ahumado', c: 'pescado', f: 2, u: 'kg', e: '🍣' },

  /* ---------- HUEVOS Y LÁCTEOS ---------- */
  { id: 501, n: 'Huevos',          c: 'lacteos', f: 3, u: 'ud', e: '🥚',
    p: { mercadona: { f: 1.80, b: 0.30, q: 6, u: 'ud', d: '2026-08-03' } } },
  { id: 502, n: 'Leche',           c: 'lacteos', f: 3, u: 'l',  e: '🥛' },
  { id: 503, n: 'Yogur natural',   c: 'lacteos', f: 3, u: 'ud', e: '🥛' },
  { id: 504, n: 'Queso rallado',   c: 'lacteos', f: 3, u: 'kg', e: '🧀' },
  { id: 505, n: 'Queso curado',    c: 'lacteos', f: 2, u: 'kg', e: '🧀' },
  { id: 506, n: 'Queso fresco',    c: 'lacteos', f: 2, u: 'kg', e: '🧀' },
  { id: 507, n: 'Mantequilla',     c: 'lacteos', f: 2, u: 'kg', e: '🧈' },
  { id: 508, n: 'Nata',            c: 'lacteos', f: 2, u: 'l',  e: '🥛' },
  { id: 509, n: 'Queso en lonchas',c: 'lacteos', f: 3, u: 'kg', e: '🧀' },
  { id: 510, n: 'Yogur griego',    c: 'lacteos', f: 2, u: 'ud', e: '🥛' },
  { id: 511, n: 'Bebida de avena', c: 'lacteos', f: 2, u: 'l',  e: '🥛' },
  { id: 512, n: 'Kéfir',           c: 'lacteos', f: 1, u: 'l',  e: '🥛' },
  { id: 513, n: 'Requesón',        c: 'lacteos', f: 1, u: 'kg', e: '🧀' },
  { id: 514, n: 'Mozzarella',      c: 'lacteos', f: 2, u: 'kg', e: '🧀' },
  { id: 515, n: 'Queso cottage',   c: 'lacteos', f: 3, u: 'kg', e: '🧀' },
  { id: 516, n: 'Queso fresco batido', c: 'lacteos', f: 3, u: 'kg', e: '🥣' },
  { id: 517, n: 'Yogur griego natural 0%', c: 'lacteos', f: 3, u: 'ud', e: '🥛' },
  { id: 518, n: 'Yogur alto en proteína',  c: 'lacteos', f: 3, u: 'ud', e: '🥛' },
  { id: 519, n: 'Claras de huevo',  c: 'lacteos', f: 3, u: 'l',  e: '🥚' },
  { id: 520, n: 'Kéfir sin lactosa',c: 'lacteos', f: 3, u: 'l',  e: '🥛' },

  /* ---------- PANADERÍA ---------- */
  { id: 601, n: 'Pan',             c: 'panaderia', f: 3, u: 'ud', e: '🥖' },
  { id: 602, n: 'Pan de molde',    c: 'panaderia', f: 3, u: 'ud', e: '🍞' },
  { id: 603, n: 'Pan de hamburguesa', c: 'panaderia', f: 2, u: 'ud', e: '🍔' },
  { id: 604, n: 'Tortillas de trigo', c: 'panaderia', f: 2, u: 'ud', e: '🌯' },
  { id: 605, n: 'Croissant',       c: 'panaderia', f: 1, u: 'ud', e: '🥐' },
  { id: 606, n: 'Magdalenas',      c: 'panaderia', f: 2, u: 'ud', e: '🧁' },
  { id: 607, n: 'Biscotes',        c: 'panaderia', f: 1, u: 'ud', e: '🍞' },
  { id: 608, n: 'Masa de pizza',   c: 'panaderia', f: 2, u: 'ud', e: '🍕' },
  { id: 609, n: 'Pan rallado',     c: 'panaderia', f: 1, u: 'kg', e: '🍞' },
  { id: 610, n: 'Pan de molde integral', c: 'panaderia', f: 3, u: 'ud', e: '🍞' },
  { id: 611, n: 'Tortillas de maíz',     c: 'panaderia', f: 2, u: 'ud', e: '🌮' },
  { id: 612, n: 'Tostadas integrales',   c: 'panaderia', f: 3, u: 'ud', e: '🍞' },

  /* ---------- DESPENSA ---------- */
  { id: 701, n: 'Aceite de oliva',  c: 'despensa', f: 3, u: 'l',  e: '🫒' },
  { id: 702, n: 'Sal',              c: 'despensa', f: 1, u: 'kg', e: '🧂' },
  { id: 703, n: 'Azúcar',           c: 'despensa', f: 1, u: 'kg', e: '🍬' },
  { id: 704, n: 'Arroz',            c: 'despensa', f: 3, u: 'kg', e: '🍚' },
  { id: 705, n: 'Pasta',            c: 'despensa', f: 3, u: 'kg', e: '🍝' },
  { id: 706, n: 'Harina',           c: 'despensa', f: 2, u: 'kg', e: '🌾' },
  { id: 707, n: 'Tomate frito',     c: 'despensa', f: 3, u: 'kg', e: '🥫' },
  { id: 708, n: 'Tomate triturado', c: 'despensa', f: 3, u: 'kg', e: '🥫' },
  { id: 709, n: 'Atún en lata',     c: 'despensa', f: 3, u: 'kg', e: '🥫' },
  { id: 710, n: 'Legumbres cocidas',c: 'despensa', f: 3, u: 'kg', e: '🫘' },
  { id: 711, n: 'Lentejas',         c: 'despensa', f: 2, u: 'kg', e: '🫘' },
  { id: 712, n: 'Garbanzos',        c: 'despensa', f: 2, u: 'kg', e: '🫘' },
  { id: 713, n: 'Vinagre',          c: 'despensa', f: 1, u: 'l',  e: '🍶' },
  { id: 714, n: 'Caldo',            c: 'despensa', f: 2, u: 'l',  e: '🍲' },
  { id: 715, n: 'Especias',         c: 'despensa', f: 2, u: 'ud', e: '🌿' },
  { id: 716, n: 'Pimentón',         c: 'despensa', f: 1, u: 'kg', e: '🌶️' },
  { id: 717, n: 'Café',             c: 'despensa', f: 3, u: 'kg', e: '☕' },
  { id: 718, n: 'Té',               c: 'despensa', f: 2, u: 'ud', e: '🍵' },
  { id: 719, n: 'Cacao',            c: 'despensa', f: 2, u: 'kg', e: '🍫' },
  { id: 720, n: 'Miel',             c: 'despensa', f: 1, u: 'kg', e: '🍯' },
  { id: 721, n: 'Mermelada',        c: 'despensa', f: 2, u: 'kg', e: '🍓' },
  { id: 722, n: 'Cereales',         c: 'despensa', f: 2, u: 'kg', e: '🥣' },
  { id: 723, n: 'Avena',            c: 'despensa', f: 2, u: 'kg', e: '🥣' },
  { id: 724, n: 'Mayonesa',         c: 'despensa', f: 2, u: 'kg', e: '🥫' },
  { id: 725, n: 'Ketchup',          c: 'despensa', f: 2, u: 'kg', e: '🍅' },
  { id: 726, n: 'Mostaza',          c: 'despensa', f: 1, u: 'kg', e: '🌭' },
  { id: 727, n: 'Salsa de soja',    c: 'despensa', f: 1, u: 'l',  e: '🍶' },
  { id: 728, n: 'Aceitunas',        c: 'despensa', f: 2, u: 'kg', e: '🫒' },
  { id: 729, n: 'Levadura',         c: 'despensa', f: 1, u: 'ud', e: '🌾' },
  { id: 730, n: 'Maíz dulce',       c: 'despensa', f: 2, u: 'kg', e: '🌽' },
  { id: 731, n: 'Leche condensada', c: 'despensa', f: 1, u: 'kg', e: '🥛' },
  { id: 732, n: 'Frutos secos crudos', c: 'despensa', f: 2, u: 'kg', e: '🥜' },
  { id: 733, n: 'Crema de cacahuete',  c: 'despensa', f: 1, u: 'kg', e: '🥜' },
  { id: 734, n: 'Pan tostado',      c: 'despensa', f: 2, u: 'ud', e: '🍞' },
  { id: 735, n: 'Nueces',           c: 'despensa', f: 3, u: 'kg', e: '🌰' },
  { id: 736, n: 'Almendras',        c: 'despensa', f: 3, u: 'kg', e: '🥜' },
  { id: 737, n: 'Atún al natural',  c: 'despensa', f: 3, u: 'kg', e: '🐟' },
  { id: 738, n: 'Tortitas de maíz', c: 'despensa', f: 3, u: 'ud', e: '🫓' },
  { id: 739, n: 'Hummus',           c: 'despensa', f: 2, u: 'kg', e: '🫘' },
  { id: 740, n: 'Arroz basmati',    c: 'despensa', f: 3, u: 'kg', e: '🍚' },
  { id: 741, n: 'Pepinillos',       c: 'despensa', f: 2, u: 'kg', e: '🥒' },
  { id: 742, n: 'Gelatina 0%',      c: 'despensa', f: 2, u: 'ud', e: '🍮' },

  /* ---------- CONGELADOS ---------- */
  { id: 801, n: 'Verdura congelada',  c: 'congelados', f: 2, u: 'kg', e: '🥦' },
  { id: 802, n: 'Patatas congeladas', c: 'congelados', f: 2, u: 'kg', e: '🍟' },
  { id: 803, n: 'Pescado congelado',  c: 'congelados', f: 2, u: 'kg', e: '🐟' },
  { id: 804, n: 'Pizza congelada',    c: 'congelados', f: 2, u: 'ud', e: '🍕' },
  { id: 805, n: 'Helado',             c: 'congelados', f: 2, u: 'l',  e: '🍦' },
  { id: 806, n: 'Croquetas',          c: 'congelados', f: 2, u: 'kg', e: '🥟' },
  { id: 807, n: 'Guisantes congelados', c: 'congelados', f: 1, u: 'kg', e: '🫛' },
  { id: 808, n: 'Hielo',              c: 'congelados', f: 1, u: 'kg', e: '🧊' },

  /* ---------- BEBIDAS ---------- */
  { id: 901, n: 'Agua',            c: 'bebidas', f: 3, u: 'l', e: '💧' },
  { id: 902, n: 'Cerveza',         c: 'bebidas', f: 2, u: 'l', e: '🍺' },
  { id: 903, n: 'Vino tinto',      c: 'bebidas', f: 2, u: 'l', e: '🍷' },
  { id: 904, n: 'Vino blanco',     c: 'bebidas', f: 1, u: 'l', e: '🍷' },
  { id: 905, n: 'Refrescos',       c: 'bebidas', f: 2, u: 'l', e: '🥤' },
  { id: 906, n: 'Zumo de naranja', c: 'bebidas', f: 2, u: 'l', e: '🧃' },
  { id: 907, n: 'Tónica',          c: 'bebidas', f: 1, u: 'l', e: '🥤' },
  { id: 908, n: 'Agua con gas',    c: 'bebidas', f: 1, u: 'l', e: '💧' },
  { id: 909, n: 'Cava',            c: 'bebidas', f: 1, u: 'l', e: '🍾' },

  /* ---------- DULCES Y SNACKS ---------- */
  { id: 1001, n: 'Patatas fritas',  c: 'snacks', f: 2, u: 'kg', e: '🍟' },
  { id: 1002, n: 'Chocolate',       c: 'snacks', f: 2, u: 'kg', e: '🍫' },
  { id: 1003, n: 'Galletas',        c: 'snacks', f: 2, u: 'kg', e: '🍪' },
  { id: 1004, n: 'Pipas',           c: 'snacks', f: 2, u: 'kg', e: '🌻' },
  { id: 1005, n: 'Frutos secos salados', c: 'snacks', f: 2, u: 'kg', e: '🥜' },
  { id: 1006, n: 'Chicles',         c: 'snacks', f: 1, u: 'ud', e: '🍬' },
  { id: 1007, n: 'Caramelos',       c: 'snacks', f: 1, u: 'kg', e: '🍬' },
  { id: 1008, n: 'Palomitas',       c: 'snacks', f: 1, u: 'kg', e: '🍿' },
  { id: 1009, n: 'Nachos',          c: 'snacks', f: 1, u: 'kg', e: '🌮' },
  { id: 1010, n: 'Turrón',          c: 'snacks', f: 1, u: 'kg', e: '🍬' },
  { id: 1011, n: 'Barritas energéticas', c: 'snacks', f: 1, u: 'ud', e: '⚡' },
  { id: 1012, n: 'Chocolate negro 85%',  c: 'snacks', f: 2, u: 'kg', e: '🍫' },

  /* ---------- HIGIENE ---------- */
  { id: 1101, n: 'Papel higiénico', c: 'higiene', f: 3, u: 'ud', e: '🧻' },
  { id: 1102, n: 'Gel de ducha',    c: 'higiene', f: 3, u: 'l',  e: '🧴', t: 'mercadona',
    p: { mercadona: { f: 1.60, b: 1.60, q: 1, u: 'l', d: '2026-08-03' } } },
  { id: 1103, n: 'Champú',          c: 'higiene', f: 3, u: 'l',  e: '🧴' },
  { id: 1104, n: 'Pasta de dientes',c: 'higiene', f: 2, u: 'ud', e: '🪥' },
  { id: 1105, n: 'Cepillo de dientes', c: 'higiene', f: 1, u: 'ud', e: '🪥' },
  { id: 1106, n: 'Desodorante',     c: 'higiene', f: 2, u: 'ud', e: '🧴' },
  { id: 1107, n: 'Cuchillas',       c: 'higiene', f: 1, u: 'ud', e: '🪒' },
  { id: 1108, n: 'Crema hidratante',c: 'higiene', f: 1, u: 'ud', e: '🧴' },
  { id: 1109, n: 'Acondicionador',  c: 'higiene', f: 2, u: 'l',  e: '🧴' },
  { id: 1110, n: 'Compresas',       c: 'higiene', f: 2, u: 'ud', e: '🧻' },
  { id: 1111, n: 'Pañuelos',        c: 'higiene', f: 2, u: 'ud', e: '🧻' },
  { id: 1112, n: 'Protector solar', c: 'higiene', f: 1, u: 'ud', e: '🧴' },
  { id: 1113, n: 'Discos limpiadores', c: 'higiene', f: 2, u: 'ud', e: '⚪' },

  /* ---------- HOGAR ---------- */
  { id: 1201, n: 'Detergente',       c: 'hogar', f: 3, u: 'l',  e: '🧼' },
  { id: 1202, n: 'Suavizante',       c: 'hogar', f: 2, u: 'l',  e: '🧴' },
  { id: 1203, n: 'Lavavajillas',     c: 'hogar', f: 3, u: 'l',  e: '🧽' },
  { id: 1204, n: 'Papel de cocina',  c: 'hogar', f: 3, u: 'ud', e: '🧻', t: 'mercadona',
    p: { mercadona: { f: 3.70, b: 3.70, q: 1, u: 'ud', d: '2026-08-03' } } },
  { id: 1205, n: 'Bolsas de basura', c: 'hogar', f: 3, u: 'ud', e: '🗑️' },
  { id: 1206, n: 'Estropajos',       c: 'hogar', f: 2, u: 'ud', e: '🧽' },
  { id: 1207, n: 'Limpiacristales',  c: 'hogar', f: 1, u: 'l',  e: '🧴' },
  { id: 1208, n: 'Lejía',            c: 'hogar', f: 1, u: 'l',  e: '🧴' },
  { id: 1209, n: 'Papel de aluminio',c: 'hogar', f: 1, u: 'ud', e: '📄' },
  { id: 1210, n: 'Film transparente',c: 'hogar', f: 1, u: 'ud', e: '📄' },
  { id: 1211, n: 'Pilas',            c: 'hogar', f: 1, u: 'ud', e: '🔋' },
  { id: 1212, n: 'Bombillas',        c: 'hogar', f: 1, u: 'ud', e: '💡' },
  { id: 1213, n: 'Ambientador',      c: 'hogar', f: 1, u: 'ud', e: '🌸' },
  { id: 1214, n: 'Servilletas',      c: 'hogar', f: 2, u: 'ud', e: '🧻' },

  /* ---------- FARMACIA ---------- */
  { id: 1301, n: 'Paracetamol',      c: 'farmacia', f: 2, u: 'ud', e: '💊' },
  { id: 1302, n: 'Ibuprofeno',       c: 'farmacia', f: 2, u: 'ud', e: '💊' },
  { id: 1303, n: 'Tiritas',          c: 'farmacia', f: 1, u: 'ud', e: '🩹' },
  { id: 1304, n: 'Suero fisiológico',c: 'farmacia', f: 1, u: 'ud', e: '💧' },
  { id: 1305, n: 'Antiséptico',      c: 'farmacia', f: 1, u: 'ud', e: '🧴' },
  { id: 1306, n: 'Ibuprofeno gel',   c: 'farmacia', f: 1, u: 'ud', e: '🧴' },

  /* ---------- GYM ----------
     Suplementación. Se compra en tiendas distintas al súper, así
     que suele tener su propia tienda preferida (Vitobest, Amazon). */
  { id: 1401, n: 'Proteína ISO CFM', c: 'gym', f: 2, u: 'kg', e: '🥤' },
  { id: 1402, n: 'Vitamina C',       c: 'gym', f: 2, u: 'ud', e: '🍊' },
  { id: 1403, n: 'Aceite de onagra', c: 'gym', f: 2, u: 'ud', e: '🌼' },
  { id: 1404, n: 'Multivitamínico',  c: 'gym', f: 2, u: 'ud', e: '💊' },
  { id: 1405, n: 'Omega 3',          c: 'gym', f: 2, u: 'ud', e: '🐟' },
  { id: 1406, n: 'Bisglicinato de magnesio', c: 'gym', f: 2, u: 'ud', e: '⚡' },
  { id: 1407, n: 'Super probiótico', c: 'gym', f: 2, u: 'ud', e: '🦠' },
  { id: 1408, n: 'Bisglicinato de hierro', c: 'gym', f: 2, u: 'ud', e: '🩸' },
  { id: 1409, n: 'Vitamina D3 + K2', c: 'gym', f: 2, u: 'ud', e: '☀️' },

  /* ---- añadidos para las recetas de noviembre ---- */
  { id: 227,  n: 'Tomate cherry',       c: 'verduras',  f: 2, u: 'kg', e: '🍅' },
  { id: 414,  n: 'Langostinos',         c: 'pescado',   f: 2, u: 'kg', e: '🦐' },
  { id: 613,  n: 'Tortillas integrales', c: 'panaderia', f: 2, u: 'ud', e: '🫓' },
  { id: 743,  n: 'Harina de arroz',     c: 'despensa',  f: 2, u: 'kg', e: '🌾' },
  { id: 744,  n: 'Canela',              c: 'despensa',  f: 2, u: 'ud', e: '🟤' },
  { id: 745,  n: 'Orégano',             c: 'despensa',  f: 2, u: 'ud', e: '🌿' }

];

/* Versión del catálogo. Súbela cada vez que lo regeneremos:
   sirve para que la app detecte que hay datos nuevos y para
   comparar la base anterior con la actual. */
export const CATALOGO_VERSION = 5;
