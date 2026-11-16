/* ============================================================
   RECETAS DE NOVIEMBRE
   ------------------------------------------------------------
   14 recetas: 3 desayunos, 4 comidas, 3 meriendas y 4 cenas.
   Cada ingrediente lleva el id de su producto del catálogo.

   NOTAS DE LECTURA
   · Las cantidades de carnes, pescados, patata, garbanzos y
     pollo están en PESO COCINADO (parte comestible), salvo que
     se diga otra cosa. Se indica en `notas` de cada receta.
   · `sinCantidad: true` marca los ingredientes que la receta no
     cuantifica («tomate», «pimiento», «especias»): cuentan para
     saber si hay que comprarlos, pero no suman cantidades.
   · Los pasos salen de la preparación de cada receta. No llevan
     duración porque la receta no la indica; se podrá añadir
     (estimada) para la cocina simultánea.
   · `alternativa` recoge «X o Y» de la receta original.
   ============================================================ */

const paso = texto => ({ texto });

export const RECETAS_NOVIEMBRE = {
  formato: 'lista-compra-recetas',
  version: 1,
  nombre: 'Recetas de noviembre',

  recetas: [

    /* ---------------- DESAYUNOS ---------------- */
    {
      nombre: 'Tostadas de pollo y aguacate',
      comida: 'desayuno', plan: 'dieta', activa: true, raciones: 1,
      notas: 'El pollo va cocinado.',
      ingredientes: [
        { id: 610, nombre: 'Pan de molde integral', cant: 80, unidad: 'g' },
        { id: 302, nombre: 'Pechuga de pollo', cant: 100, unidad: 'g' },
        { id: 112, nombre: 'Aguacate', cant: 30, unidad: 'g' },
        { id: 201, nombre: 'Tomate', sinCantidad: true },
        { id: 113, nombre: 'Limones', sinCantidad: true, nota: 'unas gotas' }
      ],
      pasos: [paso('Corta el pollo en tiras.'),
              paso('Monta las tostadas con el aguacate machacado y el tomate.')]
    },
    {
      nombre: 'Bol de yogur con fruta y chocolate',
      comida: 'desayuno', plan: 'dieta', activa: true, raciones: 1,
      notas: '25-30 g de proteína. Fresas o frutos rojos.',
      ingredientes: [
        { id: 517, nombre: 'Yogur griego natural 0%', cant: 250, unidad: 'g' },
        { id: 1401, nombre: 'Proteína ISO CFM', cant: 30, unidad: 'g' },
        { id: 106, nombre: 'Fresas', cant: 100, unidad: 'g', alternativa: 'Frutos rojos' },
        { id: 1012, nombre: 'Chocolate negro 85%', cant: 10, unidad: 'g' }
      ],
      pasos: [paso('Mezcla el yogur con la proteína.'),
              paso('Añade la fruta.'),
              paso('Termina con el chocolate rallado.')]
    },
    {
      nombre: 'Tortitas de plátano',
      comida: 'desayuno', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Acompañar con café o infusión.',
      ingredientes: [
        { id: 501, nombre: 'Huevos', cant: 1, unidad: 'ud' },
        { id: 519, nombre: 'Claras de huevo', cant: 100, unidad: 'ml' },
        { id: 101, nombre: 'Plátanos', cant: 60, unidad: 'g' },
        { id: 743, nombre: 'Harina de arroz', cant: 35, unidad: 'g' },
        { id: 744, nombre: 'Canela', sinCantidad: true }
      ],
      pasos: [paso('Tritura todo.'),
              paso('Cocina pequeñas tortitas en una sartén antiadherente.')]
    },

    /* ---------------- COMIDAS ---------------- */
    {
      nombre: 'Albóndigas caseras con patata',
      comida: 'comida', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Carne magra de ternera o pavo, en peso cocinado. Patata cocinada. Se pueden preparar varias raciones y congelarlas.',
      ingredientes: [
        { id: 304, nombre: 'Carne picada', cant: 150, unidad: 'g', alternativa: 'Ternera o pavo' },
        { id: 204, nombre: 'Patatas', cant: 220, unidad: 'g' },
        { id: 708, nombre: 'Tomate triturado', cant: 100, unidad: 'g' },
        { id: 202, nombre: 'Cebolla', sinCantidad: true },
        { id: 203, nombre: 'Ajo', sinCantidad: true },
        { id: 715, nombre: 'Especias', sinCantidad: true },
        { id: 701, nombre: 'Aceite de oliva', cant: 5, unidad: 'ml' }
      ],
      pasos: [paso('Forma las albóndigas.'),
              paso('Cocínalas al horno o en sartén.'),
              paso('Termina con salsa de tomate casera.'),
              paso('Acompaña con patata asada.')]
    },
    {
      nombre: 'Fajitas de pollo con verduras',
      comida: 'comida', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Dos tortillas integrales pequeñas, unos 80 g en total. Pollo cocinado. Muy cómoda para llevar al trabajo.',
      ingredientes: [
        { id: 613, nombre: 'Tortillas integrales', cant: 80, unidad: 'g' },
        { id: 302, nombre: 'Pechuga de pollo', cant: 140, unidad: 'g' },
        { id: 207, nombre: 'Pimiento rojo', sinCantidad: true },
        { id: 208, nombre: 'Pimiento verde', sinCantidad: true },
        { id: 202, nombre: 'Cebolla', sinCantidad: true },
        { id: 112, nombre: 'Aguacate', cant: 30, unidad: 'g' }
      ],
      pasos: [paso('Saltea el pollo con las verduras y especias suaves.'),
              paso('Rellena las tortillas.'),
              paso('Añade el aguacate.')]
    },
    {
      nombre: 'Ensalada templada de garbanzos y langostinos',
      comida: 'comida', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Garbanzos cocidos y escurridos. Langostinos pelados y cocinados. Una alternativa a las ensaladas de legumbres habituales.',
      ingredientes: [
        { id: 712, nombre: 'Garbanzos', cant: 170, unidad: 'g' },
        { id: 414, nombre: 'Langostinos', cant: 140, unidad: 'g' },
        { id: 227, nombre: 'Tomate cherry', sinCantidad: true },
        { id: 211, nombre: 'Pepino', sinCantidad: true },
        { id: 205, nombre: 'Zanahoria', sinCantidad: true },
        { id: 701, nombre: 'Aceite de oliva', cant: 5, unidad: 'ml' },
        { id: 113, nombre: 'Limones', sinCantidad: true }
      ],
      pasos: [paso('Saltea brevemente los langostinos.'),
              paso('Mézclalos con los garbanzos y las verduras.')]
    },
    {
      nombre: 'Berenjena rellena de ternera',
      comida: 'comida', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Una berenjena mediana. Ternera picada magra cocinada. Patata asada como acompañamiento.',
      ingredientes: [
        { id: 210, nombre: 'Berenjena', cant: 1, unidad: 'ud' },
        { id: 304, nombre: 'Carne picada', cant: 150, unidad: 'g', alternativa: 'Ternera picada magra' },
        { id: 708, nombre: 'Tomate triturado', cant: 100, unidad: 'g' },
        { id: 514, nombre: 'Mozzarella', cant: 30, unidad: 'g', nota: 'ligera' },
        { id: 204, nombre: 'Patatas', cant: 120, unidad: 'g', nota: 'asada, de acompañamiento' }
      ],
      pasos: [paso('Asa la berenjena.'),
              paso('Vacía parte de la pulpa y mézclala con la carne y el tomate.'),
              paso('Rellena la berenjena y termina gratinando con la mozzarella.')]
    },

    /* ---------------- MERIENDAS ---------------- */
    {
      nombre: 'Bol de cottage con fruta',
      comida: 'merienda', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Fresas o kiwi.',
      ingredientes: [
        { id: 515, nombre: 'Queso cottage', cant: 150, unidad: 'g' },
        { id: 106, nombre: 'Fresas', cant: 100, unidad: 'g', alternativa: 'Kiwi' },
        { id: 744, nombre: 'Canela', sinCantidad: true }
      ],
      pasos: [paso('Pon el queso cottage en un bol con la fruta y la canela.')]
    },
    {
      nombre: 'Batido rápido',
      comida: 'merienda', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Bebida de avena sin azúcares añadidos. Una pieza de fruta aparte.',
      ingredientes: [
        { id: 1401, nombre: 'Proteína ISO CFM', cant: 30, unidad: 'g' },
        { id: 511, nombre: 'Bebida de avena', cant: 200, unidad: 'ml' },
        { id: 122, nombre: 'Pieza de fruta', cant: 1, unidad: 'ud' }
      ],
      pasos: [paso('Bate la proteína con la bebida de avena.'),
              paso('Toma la pieza de fruta aparte.')]
    },
    {
      nombre: 'Yogur con chocolate',
      comida: 'merienda', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Yogur alto en proteína.',
      ingredientes: [
        { id: 518, nombre: 'Yogur alto en proteína', cant: 200, unidad: 'g' },
        { id: 1012, nombre: 'Chocolate negro 85%', cant: 10, unidad: 'g' },
        { id: 744, nombre: 'Canela', sinCantidad: true }
      ],
      pasos: [paso('Ralla el chocolate sobre el yogur y añade la canela.')]
    },

    /* ---------------- CENAS ---------------- */
    {
      nombre: 'Hamburguesa casera con patatas gajo',
      comida: 'cena', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Hamburguesa de pollo o pavo, en peso cocinado. Patata cocinada.',
      ingredientes: [
        { id: 304, nombre: 'Carne picada', cant: 150, unidad: 'g', alternativa: 'Pollo o pavo' },
        { id: 204, nombre: 'Patatas', cant: 150, unidad: 'g' },
        { id: 201, nombre: 'Tomate', sinCantidad: true },
        { id: 206, nombre: 'Lechuga', sinCantidad: true, nota: 'hojas verdes' },
        { id: 701, nombre: 'Aceite de oliva', cant: 5, unidad: 'ml' }
      ],
      pasos: [paso('Cocina la hamburguesa a la plancha.'),
              paso('Acompaña con patatas al horno con pimentón y especias.')]
    },
    {
      nombre: 'Tacos de pescado',
      comida: 'cena', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Dos tortillas pequeñas integrales, unos 60 g en total. Merluza o bacalao cocinado. El yogur natural hace de salsa, con limón.',
      ingredientes: [
        { id: 613, nombre: 'Tortillas integrales', cant: 60, unidad: 'g' },
        { id: 402, nombre: 'Merluza', cant: 150, unidad: 'g', alternativa: 'Bacalao' },
        { id: 206, nombre: 'Lechuga', sinCantidad: true },
        { id: 201, nombre: 'Tomate', sinCantidad: true },
        { id: 503, nombre: 'Yogur natural', cant: 40, unidad: 'g' },
        { id: 113, nombre: 'Limones', sinCantidad: true }
      ],
      pasos: [paso('Cocina el pescado con especias suaves.'),
              paso('Monta los tacos con las verduras y la salsa de yogur.')]
    },
    {
      nombre: 'Pizza casera con base de tortilla',
      comida: 'cena', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Una tortilla integral grande, unos 60 g. Pollo cocinado. Mozzarella ligera.',
      ingredientes: [
        { id: 613, nombre: 'Tortillas integrales', cant: 60, unidad: 'g' },
        { id: 302, nombre: 'Pechuga de pollo', cant: 100, unidad: 'g' },
        { id: 708, nombre: 'Tomate triturado', cant: 60, unidad: 'g' },
        { id: 514, nombre: 'Mozzarella', cant: 30, unidad: 'g' },
        { id: 213, nombre: 'Champiñones', sinCantidad: true },
        { id: 745, nombre: 'Orégano', sinCantidad: true }
      ],
      pasos: [paso('Utiliza la tortilla como base.'),
              paso('Añade los ingredientes.'),
              paso('Hornea hasta que el queso se funda.')]
    },
    {
      nombre: 'Ensalada templada de patata y atún',
      comida: 'cena', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Patata cocida. Atún al natural escurrido. Huevo cocido.',
      ingredientes: [
        { id: 204, nombre: 'Patatas', cant: 180, unidad: 'g' },
        { id: 737, nombre: 'Atún al natural', cant: 120, unidad: 'g' },
        { id: 501, nombre: 'Huevos', cant: 1, unidad: 'ud' },
        { id: 201, nombre: 'Tomate', sinCantidad: true },
        { id: 218, nombre: 'Judías verdes', sinCantidad: true },
        { id: 701, nombre: 'Aceite de oliva', cant: 5, unidad: 'ml' },
        { id: 113, nombre: 'Limones', sinCantidad: true }
      ],
      pasos: [paso('Mezcla los ingredientes con la patata templada.'),
              paso('Aliña con limón.')]
    }
  ]
};
