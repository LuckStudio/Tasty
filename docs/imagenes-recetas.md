# Imágenes de las recetas: textos para la IA

Cada receta necesita **una foto** (JPG horizontal 4:3, mínimo 1600 × 1200 px) con el nombre de archivo indicado,
que se guarda en `app/recetas/`. Después hay que apuntar el nombre (sin `.jpg`) en `app/datos/fotos-recetas.js`.

## Cómo pedirlo

1. Pega primero el **estilo común** y después el **plato** de cada receta, en el mismo mensaje.
2. Pide siempre formato **horizontal 4:3**. Si la IA lo permite, usa la misma semilla/estilo para las 14.
3. Revisa que sean **una ración** (las cantidades de las recetas son de una persona) y que no salgan manos, texto ni marcas.

### Estilo común (pégalo siempre al principio)

> Fotografía de comida estilo revista de cocina. Vista cenital (desde arriba, ligeramente inclinada). Luz natural suave
> de ventana, sombras delicadas. Mesa de lino o piedra beige claro, fondo limpio y neutro. Plato o bol de cerámica
> blanca o crudo, sencillo, sin decoración. Colores naturales y apetecibles, enfoque nítido, sensación fresca y casera.
> Una sola ración. Sin personas, sin manos, sin texto, sin logotipos, sin marcas, sin cubiertos de adorno. Formato horizontal 4:3.

Para evitar errores, si la IA tiene campo de «negativo»: *texto, letras, logotipos, manos, personas, envases, marcas, exceso de comida, platos múltiples*.

## Las 14 recetas

### Desayunos

| Archivo | Plato (pégalo después del estilo común) |
| --- | --- |
| `tostadas-de-pollo-y-aguacate.jpg` | Dos tostadas de pan integral con tiras de pechuga de pollo cocinada, aguacate machacado y rodajas de tomate, con unas gotas de limón; medio limón al lado. |
| `bol-de-yogur-con-fruta-y-chocolate.jpg` | Bol de yogur griego natural espeso y cremoso, con fresas laminadas (o frutos rojos) por encima y chocolate negro rallado. |
| `tortitas-de-platano.jpg` | Pila pequeña de tortitas finas y pequeñas, doradas, de plátano y harina de arroz, con rodajas de plátano y un toque de canela; una taza de café al lado. |

### Comidas

| Archivo | Plato |
| --- | --- |
| `albondigas-caseras-con-patata.jpg` | Plato hondo con albóndigas caseras de ternera o pavo en salsa de tomate casera, con patata asada en trozos al lado. |
| `fajitas-de-pollo-con-verduras.jpg` | Dos fajitas pequeñas de tortilla integral abiertas, rellenas de pollo salteado en tiras, pimiento rojo y verde, cebolla y láminas de aguacate. |
| `ensalada-templada-de-garbanzos-y-langostinos.jpg` | Ensalada templada de garbanzos cocidos con langostinos pelados y cocinados, tomates cherry partidos, pepino en rodajas y zanahoria, aliñada con aceite de oliva y limón. |
| `berenjena-rellena-de-ternera.jpg` | Media berenjena asada rellena de carne picada de ternera con tomate, gratinada con mozzarella dorada; patata asada de acompañamiento. |

### Meriendas

| Archivo | Plato |
| --- | --- |
| `bol-de-cottage-con-fruta.jpg` | Bol de queso cottage con fresas laminadas (o kiwi en rodajas) y un espolvoreado de canela. |
| `batido-rapido.jpg` | Vaso alto con batido cremoso de color crema (proteína y bebida de avena) y una pieza de fruta entera junto al vaso. |
| `yogur-con-chocolate.jpg` | Bol de yogur espeso alto en proteína con chocolate negro rallado por encima y un toque de canela. |

### Cenas

| Archivo | Plato |
| --- | --- |
| `hamburguesa-casera-con-patatas-gajo.jpg` | Hamburguesa casera de pollo o pavo hecha a la plancha, sin pan, con rodajas de tomate y hojas verdes, y patatas gajo al horno con pimentón. |
| `tacos-de-pescado.jpg` | Dos tacos pequeños de tortilla integral con merluza o bacalao cocinado, lechuga, tomate y salsa de yogur natural con limón; una cuña de limón al lado. |
| `pizza-casera-con-base-de-tortilla.jpg` | Pizza redonda y fina hecha con una tortilla integral grande de base: salsa de tomate, pollo desmenuzado, mozzarella fundida, champiñones laminados y orégano. |
| `ensalada-templada-de-patata-y-atun.jpg` | Ensalada templada de patata cocida en trozos con atún al natural desmenuzado, huevo cocido partido, tomate y judías verdes, con aceite de oliva y limón. |

## Después de generarlas

1. Renombra cada imagen con el nombre de archivo de la tabla.
2. Envíamelas y yo las coloco en `app/recetas/`, las optimizo (tamaños para móvil) y las activo.
3. Si una no convence, pide solo esa de nuevo con la misma frase del plato y un detalle más (por ejemplo, «más cantidad de aguacate»).
