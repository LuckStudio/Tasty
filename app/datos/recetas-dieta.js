/* ============================================================
   DIETA ESTRICTA
   ------------------------------------------------------------
   El plan completo, listo para cargarlo de un botón desde la
   pestaña Dieta.

   Cada ingrediente lleva su id del catálogo Y su nombre. El id
   es lo que enlaza; el nombre sirve por si algún día los ids
   cambian, para poder reconectarlo igualmente.

   LAS CANTIDADES SON LAS DEL PLAN, no las de la compra: "150 g
   de pollo cocinado" es lo que te comes, no lo que compras. La
   app las usa para saber qué hace falta, no para calcular
   cuánto pesa la bolsa.

   Las tres opciones de cada comida vienen ACTIVAS, porque son
   las que rotan. Lo que no forme parte del plan estricto viene
   en "Recetas varias".
   ============================================================ */

export const DIETA = {
  formato: 'lista-compra-recetas',
  version: 1,
  nombre: 'Dieta estricta',

  recetas: [

    /* ---------------- DESAYUNO ---------------- */
    {
      nombre: 'Tostadas con huevo y tomate',
      comida: 'desayuno', plan: 'dieta', activa: true, raciones: 1,
      notas: '2 tostadas integrales (70 g) + 2 huevos y 2 claras revueltos '
           + '+ tomate rallado por encima.',
      ingredientes: [
        { id: 612, nombre: 'Tostadas integrales', cant: 70, unidad: 'g' },
        { id: 501, nombre: 'Huevos', cant: 2, unidad: 'ud' },
        { id: 519, nombre: 'Claras de huevo', cant: 2, unidad: 'ud' },
        { id: 201, nombre: 'Tomate', cant: 1, unidad: 'ud' }
      ]
    },
    {
      nombre: 'Kéfir con frutos rojos y nueces',
      comida: 'desayuno', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Kéfir sin lactosa (200 ml) + frutos rojos (100 g) + 20 g de '
           + 'nueces + 2 tortitas de maíz.',
      ingredientes: [
        { id: 520, nombre: 'Kéfir sin lactosa', cant: 200, unidad: 'ml' },
        { id: 121, nombre: 'Frutos rojos', cant: 100, unidad: 'g' },
        { id: 735, nombre: 'Nueces', cant: 20, unidad: 'g' },
        { id: 738, nombre: 'Tortitas de maíz', cant: 2, unidad: 'ud' }
      ]
    },
    {
      nombre: 'Tortilla francesa con jamón',
      comida: 'desayuno', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Tortilla francesa (2 huevos + 2 claras) + jamón cocido extra '
           + '(60 g) + 1 pieza de fruta.',
      ingredientes: [
        { id: 501, nombre: 'Huevos', cant: 2, unidad: 'ud' },
        { id: 519, nombre: 'Claras de huevo', cant: 2, unidad: 'ud' },
        { id: 310, nombre: 'Jamón cocido', cant: 60, unidad: 'g' },
        { id: 122, nombre: 'Pieza de fruta', cant: 1, unidad: 'ud' }
      ]
    },
    {
      nombre: 'Suplementos de la mañana',
      comida: 'desayuno', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Con el desayuno: 1 cápsula de vitamina D3 + K2 (energía, hueso '
           + 'e inmunidad), 1 de multivitamínico (cubre carencias del déficit) '
           + 'y 1 de aceite de onagra. El probiótico va EN AYUNAS, antes de '
           + 'desayunar, para la salud digestiva y urinaria.',
      ingredientes: [
        { id: 1409, nombre: 'Vitamina D3 + K2', cant: 1, unidad: 'ud' },
        { id: 1404, nombre: 'Multivitamínico', cant: 1, unidad: 'ud' },
        { id: 1407, nombre: 'Super probiótico', cant: 1, unidad: 'ud' },
        { id: 1403, nombre: 'Aceite de onagra', cant: 1, unidad: 'ud' }
      ]
    },

    /* ---------------- ALMUERZO ---------------- */
    {
      nombre: 'Piña con pavo',
      comida: 'almuerzo', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Piña natural (150 g) + pechuga de pavo (80 g).',
      ingredientes: [
        { id: 111, nombre: 'Piña', cant: 150, unidad: 'g' },
        { id: 319, nombre: 'Pechuga de pavo', cant: 80, unidad: 'g' }
      ]
    },
    {
      nombre: 'Tortitas con hummus y zanahoria',
      comida: 'almuerzo', plan: 'dieta', activa: true, raciones: 1,
      notas: '2 tortitas de maíz + hummus (40 g) + zanahoria en bastones.',
      ingredientes: [
        { id: 738, nombre: 'Tortitas de maíz', cant: 2, unidad: 'ud' },
        { id: 739, nombre: 'Hummus', cant: 40, unidad: 'g' },
        { id: 205, nombre: 'Zanahoria', cant: 100, unidad: 'g' }
      ]
    },
    {
      nombre: 'Kéfir con almendras y kiwi',
      comida: 'almuerzo', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Kéfir sin lactosa (150 ml) + 15 g de almendras + 1 kiwi.',
      ingredientes: [
        { id: 520, nombre: 'Kéfir sin lactosa', cant: 150, unidad: 'ml' },
        { id: 736, nombre: 'Almendras', cant: 15, unidad: 'g' },
        { id: 110, nombre: 'Kiwi', cant: 1, unidad: 'ud' }
      ]
    },

    /* ---------------- COMIDA ---------------- */
    {
      nombre: 'Pollo con basmati y ensalada',
      comida: 'comida', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Pollo a la plancha (150 g ya cocinado) + arroz basmati (120 g '
           + 'cocinado) + ensalada grande.\n\n'
           + 'Si trabajas: cocina dos o tres días por semana y deja varios '
           + 'tuppers hechos. Lleva siempre la comida y la merienda.',
      ingredientes: [
        { id: 302, nombre: 'Pechuga de pollo', cant: 150, unidad: 'g' },
        { id: 740, nombre: 'Arroz basmati', cant: 120, unidad: 'g' },
        { id: 206, nombre: 'Lechuga', cant: 1, unidad: 'ud' },
        { id: 201, nombre: 'Tomate', cant: 1, unidad: 'ud' }
      ]
    },
    {
      nombre: 'Merluza con patata y verduras',
      comida: 'comida', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Merluza o bacalao (160 g) + patata cocida (180 g) + verduras '
           + 'salteadas.',
      ingredientes: [
        { id: 402, nombre: 'Merluza', cant: 160, unidad: 'g' },
        { id: 204, nombre: 'Patatas', cant: 180, unidad: 'g' },
        { id: 801, nombre: 'Verdura congelada', cant: 200, unidad: 'g' }
      ]
    },
    {
      nombre: 'Ternera con boniato y ensalada',
      comida: 'comida', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Ternera magra (150 g) + boniato asado (180 g) + ensalada de '
           + 'tomate, pepino y zanahoria.',
      ingredientes: [
        { id: 305, nombre: 'Ternera', cant: 150, unidad: 'g' },
        { id: 225, nombre: 'Boniato', cant: 180, unidad: 'g' },
        { id: 201, nombre: 'Tomate', cant: 1, unidad: 'ud' },
        { id: 211, nombre: 'Pepino', cant: 1, unidad: 'ud' },
        { id: 205, nombre: 'Zanahoria', cant: 1, unidad: 'ud' }
      ]
    },
    {
      nombre: 'Suplementos de la comida',
      comida: 'comida', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Omega 3: 2 cápsulas con la comida. Reduce la inflamación, '
           + 'mejora el colesterol y protege el sistema cardiovascular.',
      ingredientes: [
        { id: 1405, nombre: 'Omega 3', cant: 2, unidad: 'ud' }
      ]
    },

    /* ---------------- MERIENDA ---------------- */
    {
      nombre: 'Batido de proteína con plátano',
      comida: 'merienda', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Batido de proteína + 1 plátano pequeño.',
      ingredientes: [
        { id: 1401, nombre: 'Proteína ISO CFM', cant: 30, unidad: 'g' },
        { id: 101, nombre: 'Plátanos', cant: 1, unidad: 'ud' }
      ]
    },
    {
      nombre: 'Tortitas con pavo',
      comida: 'merienda', plan: 'dieta', activa: true, raciones: 1,
      notas: '2 tortitas de maíz + 60 g de pechuga de pavo.',
      ingredientes: [
        { id: 738, nombre: 'Tortitas de maíz', cant: 2, unidad: 'ud' },
        { id: 319, nombre: 'Pechuga de pavo', cant: 60, unidad: 'g' }
      ]
    },
    {
      nombre: 'Kéfir con melocotón',
      comida: 'merienda', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Kéfir sin lactosa (150 ml) + 1 melocotón o nectarina.',
      ingredientes: [
        { id: 520, nombre: 'Kéfir sin lactosa', cant: 150, unidad: 'ml' },
        { id: 114, nombre: 'Melocotón', cant: 1, unidad: 'ud' }
      ]
    },
    {
      nombre: 'Picoteo saludable',
      comida: 'merienda', plan: 'varias', activa: false, raciones: 1,
      notas: 'Para cuando aprieta el hambre entre horas: pepino, zanahoria, '
           + 'pepinillos, gelatina 0%, fruta, infusiones, tortitas de maíz o '
           + '2 onzas de chocolate negro 85%.\n\n'
           + 'Viene desactivada a propósito: es una despensa de recambio, no '
           + 'una comida del plan. Actívala si quieres que entre en la compra.',
      ingredientes: [
        { id: 211, nombre: 'Pepino', cant: 1, unidad: 'ud' },
        { id: 205, nombre: 'Zanahoria', cant: 1, unidad: 'ud' },
        { id: 741, nombre: 'Pepinillos', cant: 1, unidad: 'ud' },
        { id: 742, nombre: 'Gelatina 0%', cant: 1, unidad: 'ud' },
        { id: 718, nombre: 'Té', cant: 1, unidad: 'ud' },
        { id: 738, nombre: 'Tortitas de maíz', cant: 1, unidad: 'ud' },
        { id: 1012, nombre: 'Chocolate negro 85%', cant: 2, unidad: 'ud' }
      ]
    },

    /* ---------------- CENA ---------------- */
    {
      nombre: 'Tortilla de calabacín y champiñones',
      comida: 'cena', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Tortilla (2 huevos + 3 claras) con calabacín y champiñones '
           + '+ ensalada.',
      ingredientes: [
        { id: 501, nombre: 'Huevos', cant: 2, unidad: 'ud' },
        { id: 519, nombre: 'Claras de huevo', cant: 3, unidad: 'ud' },
        { id: 209, nombre: 'Calabacín', cant: 1, unidad: 'ud' },
        { id: 213, nombre: 'Champiñones', cant: 100, unidad: 'g' },
        { id: 206, nombre: 'Lechuga', cant: 1, unidad: 'ud' }
      ]
    },
    {
      nombre: 'Gambas con puré de calabacín y puerro',
      comida: 'cena', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Gambas (150 g) + puré de calabacín y puerro (300 g).\n\n'
           + 'Solo verduras cocidas, trituradas con el agua de cocción y '
           + '1 cucharadita de aceite de oliva virgen extra. Sin mantequilla, '
           + 'sin nata, sin quesitos y sin leche.',
      ingredientes: [
        { id: 407, nombre: 'Gambas', cant: 150, unidad: 'g' },
        { id: 209, nombre: 'Calabacín', cant: 200, unidad: 'g' },
        { id: 215, nombre: 'Puerro', cant: 1, unidad: 'ud' },
        { id: 701, nombre: 'Aceite de oliva', cant: 1, unidad: 'cdta' }
      ]
    },
    {
      nombre: 'Salmón con espárragos',
      comida: 'cena', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Salmón (150 g) o atún fresco + espárragos + ensalada variada.',
      ingredientes: [
        { id: 401, nombre: 'Salmón', cant: 150, unidad: 'g' },
        { id: 226, nombre: 'Espárragos', cant: 150, unidad: 'g' },
        { id: 206, nombre: 'Lechuga', cant: 1, unidad: 'ud' },
        { id: 201, nombre: 'Tomate', cant: 1, unidad: 'ud' }
      ]
    },
    {
      nombre: 'Suplementos de la noche',
      comida: 'cena', plan: 'dieta', activa: true, raciones: 1,
      notas: 'Bisglicinato de magnesio: 1 cápsula antes de dormir. Mejora el '
           + 'descanso, la recuperación y la tensión muscular.\n'
           + 'Aceite de onagra: 1 cápsula en la cena.\n\n'
           + 'Agua: entre 2,5 y 3 litros al día. Un vaso al levantarte, otro '
           + 'antes de cada comida, y lleva siempre botella al trabajo y al '
           + 'entrenamiento.',
      ingredientes: [
        { id: 1406, nombre: 'Bisglicinato de magnesio', cant: 1, unidad: 'ud' },
        { id: 1403, nombre: 'Aceite de onagra', cant: 1, unidad: 'ud' },
        { id: 901, nombre: 'Agua', cant: 3, unidad: 'l' }
      ]
    },

    /* ---------------- FUERA DE CASA ---------------- */
    {
      nombre: 'Si comes fuera',
      comida: 'comida', plan: 'varias', activa: false, raciones: 1,
      notas: 'Prioriza carnes o pescados a la plancha, arroz, patata, '
           + 'ensaladas completas o verduras.\n\n'
           + 'Evita fritos, salsas, rebozados y comidas muy grasas, sobre '
           + 'todo por la vesícula.\n\n'
           + 'No lleva ingredientes porque no se compra nada: es una pauta '
           + 'para tenerla a mano.',
      ingredientes: []
    }
  ]
};
