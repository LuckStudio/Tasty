# Brief del proyecto: Despensa, Menús y Compra

Nov 16, 2026 · @Lucks · Versión 1, pendiente de revisar con la app base

## 1. Resumen ejecutivo

El proyecto amplía y rediseña una app existente de **inventario de alimentos y listas de la compra** para que también funcione como **planificador de menús y guía de cocina**. Lo que pasa en la cocina (lo que se gasta, lo que falta) alimenta la lista de la compra, y la lista se ordena según el recorrido real del supermercado elegido.

**Idea central:** conectar *qué se come y cuándo* con *qué hay en la despensa y qué hay que comprar*, ahorrando tiempo en la cocina y en el súper.

**Regla de oro:** todo lo que ya hace la app base se mantiene. Este proyecto añade y mejora; no sustituye.

### Punto de partida: la app base

La app actual ya incluye:

- Inventario de alimentos con una base de productos amplia.
- Listas de la compra.
- Recetario básico, con alta de recetas nuevas.
- Alta de productos nuevos y sistema de adición de ingredientes.
- Escáner de tickets por foto, con identificación de productos mediante la API gratuita de Gemini.
- Estética de ticket de compra ya aplicada en las pantallas de compras.

> **Pendiente:** el código y el diseño de la app base se compartirán más adelante. Al recibirlos se completará este apartado con el stack, el modelo de datos actual, el inventario de pantallas y las restricciones técnicas.

## 2. Objetivos, usuarios y contexto de uso

### Objetivos

1. Planificar menús a mano y ver, para cada tarde de cocina, todo lo que hay que preparar.
2. Cocinar varias recetas a la vez con una guía optimizada y muy visual.
3. Marcar al momento lo que se acaba y que pase directo a la lista de la compra.
4. Ordenar la lista de la compra según el recorrido de cada supermercado.
5. Mejorar la lectura de tickets para no duplicar productos y tener precios fiables.
6. Dar a cada ingrediente una ficha con imagen, histórico de precios y unidades bien resueltas.
7. Eliminar el mantenimiento manual del modelo de Gemini.

### Usuarios

Un hogar (una o varias personas) que comparte despensa y lista de la compra. Una persona puede planificar y cocinar y otra ir a comprar: la lista tiene que ser clara para quien no la escribió.

### Momentos de uso clave

- **Al planificar** (fin de semana, por ejemplo): se asignan recetas a cada comida de la semana.
- **Al llegar del trabajo** (la tarde del lunes, por ejemplo): se abre la app y aparece qué toca hoy, con ingredientes y paso a paso. Móvil o tablet en la encimera, manos ocupadas.
- **Mientras se cocina:** se marca lo que se está acabando con un toque.
- **En el supermercado:** se elige la tienda y la lista aparece ordenada por su recorrido.
- **Al volver de comprar:** foto al ticket, revisión y enlace de productos, actualización de inventario y precios.

### Principios

- **El usuario decide.** Nada se planifica de forma automática sin que el usuario lo elija.
- **Visual primero.** Recetas e ingredientes se reconocen por su imagen.
- **Pocos toques.** Las acciones durante la cocina y la compra deben poder hacerse con una mano.

## 3. Identidad visual

Para el usuario es **lo más importante** del proyecto: diseño moderno y muy legible.

### Estética de ticket (obligatoria)

La app base ya usa visuales inspirados en tickets de compra en las pantallas de compras. **Se mantiene sí o sí** y se extiende con criterio: tipografía monoespaciada en datos (precios, cantidades, totales), separadores tipo recibo (líneas discontinuas, bordes dentados), fondos claros. Encaja especialmente en: lista de la compra, resumen de compra, ingredientes consolidados del bloque de cocina e histórico de precios.

### Modernidad y legibilidad

- Tipografía de lectura muy clara para textos y pasos; la monoespaciada solo como acento.
- Mucho espacio en blanco, jerarquía evidente, tamaños de texto grandes en la vista de cocina (se lee a distancia, desde la encimera).
- Botones grandes en las vistas de cocina y supermercado (uso con una mano o con las manos sucias).
- Contraste suficiente (objetivo WCAG AA).

### Fichas visuales

- **Recetas:** imagen protagonista para reconocer el plato de un vistazo.
- **Ingredientes:** imagen representativa del producto real (ver Módulo 7).
- Las imágenes son también la forma de orientarse durante la cocina simultánea.

### Mejora visual de la búsqueda de productos

Rediseñar la pantalla de búsqueda de productos de tienda: resultados con imagen, nombre, formato (kg, unidad, pack) y precio de referencia; filtros por sección y supermercado.

> **Pendiente:** revisar el diseño base cuando se comparta para documentar colores, tipografías y componentes actuales y definir el design system a partir de ellos.

## 4. Módulos de cocina y planificación

### M1. Planificador de menús (calendario)

- Calendario semanal con tres franjas por día: desayuno, comida y cena.
- El usuario asigna recetas a cada franja de forma **manual**. Sin sugerencias automáticas que se apliquen solas.
- Una franja puede tener varias recetas (plato y acompañamiento, por ejemplo) y un número de raciones.
- Copiar o repetir un día o una semana para ahorrar tiempo.
- Pantalla de inicio: «**Qué toca hoy**» con el bloque de cocina del día.

### M2. Bloque de cocina

El bloque reúne lo que se prepara en una misma sesión. Por defecto, la tarde del día D incluye:

- la **cena** de D,
- el **desayuno** de D+1,
- la **comida** de D+1.

Requisitos:

- La composición del bloque debe ser configurable (por ejemplo, excluir un desayuno que no necesita preparación, o añadir una comida extra en fin de semana).
- **Ingredientes consolidados:** lista única con el **total** de cada ingrediente para todo el bloque y, debajo, el desglose por receta. Ejemplo: tomate 450 g en total = 300 g para la cena + 150 g para la comida.
- Cada ingrediente indica si hay suficiente en el inventario; si falta, se puede añadir a la lista de la compra con un toque.
- Las cantidades se recalculan según las raciones planificadas.

### M3. Guía de cocina simultánea

- Paso a paso que combina las recetas del bloque en **un solo flujo optimizado**: primero lo que tarda más (hornos, cocciones largas, marinados), aprovechando esperas para otras tareas, y agrupando tareas iguales (lavar y cortar todas las verduras juntas, por ejemplo).
- Cada paso muestra la **imagen y el color de la receta** a la que pertenece y la cantidad exacta del ingrediente para esa receta.
- Temporizadores integrados por paso; varios temporizadores en paralelo.
- Modo cocina: pantalla siempre encendida, texto grande, avanzar paso con un toque.
- Para optimizar, las recetas necesitan pasos estructurados con duración estimada, si es tiempo activo o de espera, y recursos (horno, fuego, etc.). **A decidir:** si la combinación la hace un algoritmo con reglas o la propone Gemini y el usuario la revisa.

### M4. Avisos de faltas («se está acabando»)

- Acceso rápido siempre visible (botón flotante o pestaña), también dentro del modo cocina.
- Marcar un producto como «**se está acabando**» o «**se ha acabado**» con uno o dos toques, buscando por nombre o desde los ingredientes del bloque.
- Lo marcado pasa **al momento** a la lista de la compra de la app base, sin duplicar si ya estaba.
- Al terminar el bloque, opción de descontar del inventario lo usado en las recetas.

## 5. Módulos de compra, productos y precios

### M5. Supermercados y rutas de compra

Cada tienda tiene un recorrido distinto, incluso dentro de la misma cadena. Ejemplo real:

| Tienda | Orden de secciones (ejemplo) |
| --- | --- |
| Mercadona Aragónia | Carnes → Platos preparados → Congelados → Bebidas |
| Mercadona Los Pinos | Platos preparados → Carnes → Congelados → Aceites |

Requisitos:

- Dar de alta tiendas concretas (cadena + nombre o ubicación).
- Catálogo común de **secciones** (carnes, fruta y verdura, congelados, bebidas…) y cada producto asignado a una sección.
- Por tienda, ordenar las secciones arrastrando y soltando; ocultar las que esa tienda no tiene.
- Al ir a comprar, se **elige la tienda** y la lista se agrupa y ordena por su recorrido. Se recuerda la última tienda usada.
- En la tienda: tachar productos con un toque, con lo tachado bajando al final de la sección; total estimado de la compra con los precios de esa cadena.
- Productos sin sección asignada aparecen en un grupo «Sin sección» para asignarlos en el momento.

### M6. Lectura de tickets y enlace de productos (sin duplicados)

Problema: el ticket usa nombres abreviados o comerciales que no coinciden con los productos de la app, y se crean duplicados. Ejemplo: en la app existe «Kiwis», pero el ticket pone un nombre de marca o un texto abreviado que no dice qué es.

Requisitos:

- Tras escanear, pantalla de **revisión línea a línea**: texto del ticket, cantidad, precio y producto propuesto.
- Para cada línea, opciones: aceptar la propuesta, **enlazar con un producto existente** (buscador con imagen) o crear uno nuevo. Crear nuevo nunca es la opción por defecto si hay candidatos parecidos.
- **Memoria de equivalencias:** al enlazar un texto de ticket con un producto (por cadena de supermercado), la app lo recuerda y la próxima vez lo enlaza sola.
- Un producto puede tener varios textos de ticket asociados (distintas marcas o tiendas).
- El precio de cada línea enlazada se guarda en el histórico del producto y mejora la **estimación de gasto** de la lista.
- Opción de fusionar dos productos duplicados que ya existan.

### M7. Fichas de ingrediente

- Cada ingrediente tiene ficha con nombre, **imagen representativa**, sección, formato de venta, stock actual, recetas en que aparece y precios.
- Imagen: idealmente la del producto en la web del supermercado habitual (Mercadona) y, en el futuro, la de otras cadenas (Dia, etc.) según dónde se compre. Varias imágenes por producto, una por cadena.
- Alternativas o complementos a valorar: foto propia desde la app, bases abiertas como Open Food Facts.
- **A validar:** Mercadona no ofrece una API pública oficial; usar sus imágenes exige revisar las condiciones de uso de su web, guardar copia local y no depender de que su estructura no cambie. Para uso privado del hogar el riesgo es menor, pero hay que decidirlo antes de desarrollar.

### M8. Precios y unidades

**Histórico e índice de precios**

- Cada compra registra precio, cantidad, unidad, tienda y fecha.
- Precio **normalizado** (€/kg, €/l o €/unidad) para comparar compras de distinto tamaño.
- Gráfico de evolución y un indicador simple: ha bajado, estable o ha subido (por ejemplo, frente a la media de los últimos 3 meses).

**Unidades y pesos fraccionados**

- Distinguir **cómo se vende** (por kg, por unidad, por pack) de **cuánto se compra** (por ejemplo, 500 g de un producto a 3,20 €/kg = 1,60 €).
- Introducción rápida de cantidades: atajos de peso (250 g, 500 g, 1 kg) y teclado numérico; para unidades, selector + / −.
- Conversión entre unidades de receta y de compra (por ejemplo, receta en unidades de tomate y compra en kg, con un peso medio por unidad editable).
- Los tickets de producto a granel suelen indicar peso y precio por kg: leerlos y guardarlos bien.

### M9. Gemini siempre en el modelo más reciente

Problema: el escáner necesita indicar a mano el nombre del modelo de Gemini, y hay que tocar el código cada vez que sale uno nuevo.

Requisitos:

- Resolver el modelo de forma automática. Opciones a evaluar: usar un **alias «-latest»** de Google si existe para la familia deseada, o consultar el **listado de modelos de la API** al arrancar, filtrar los que admiten generación con imágenes y están en la capa gratuita, y elegir el más reciente.
- Guardar en caché el modelo elegido (por ejemplo, 24 h) para no consultar en cada escaneo.
- **Plan B:** si el modelo elegido falla (no disponible, límite de cuota), probar automáticamente el siguiente de la lista.
- Ajuste manual opcional en la configuración para forzar un modelo si hiciera falta.
- Mostrar en ajustes qué modelo se está usando.

## 6. Prioridades y fases

| Módulo | Qué aporta | Prioridad | Fase propuesta |
| --- | --- | --- | --- |
| Mantener la app base | Inventario, listas, recetario, escáner, estética de ticket | Imprescindible | 0 |
| M9. Gemini automático | Escáner sin mantenimiento manual | Alta (técnica) | 1 |
| Identidad visual | Diseño moderno, legible, estética de ticket | Alta | 1 (transversal) |
| M8. Unidades y pesos | Base para cantidades, precios y recetas correctas | Alta | 1 |
| M6. Enlace de tickets | Sin duplicados, precios fiables | Alta | 1 |
| M5. Rutas de supermercado | Lista ordenada por tienda | Alta | 2 |
| M4. Avisos de faltas | De la cocina a la lista en un toque | Alta | 2 |
| M1. Planificador | Calendario manual de menús | Alta | 2 |
| M2. Bloque de cocina | Qué toca hoy e ingredientes consolidados | Alta | 2 |
| M7. Fichas de ingrediente | Imagen, stock e histórico de precios | Media-alta | 3 |
| M3. Cocina simultánea | Paso a paso combinado y visual | Media-alta | 3 |

**Por qué este orden:** la fase 1 arregla los cimientos de datos (unidades, productos sin duplicados, escáner estable), porque el planificador, las rutas y las fichas dependen de que productos y cantidades estén bien definidos. La cocina simultánea va al final porque es la pieza más compleja y necesita recetas con pasos estructurados.

## 7. Modelo de datos y requisitos técnicos

### Entidades principales (conceptual)

- **Producto / ingrediente:** nombre, sección, formato de venta (kg, l, unidad, pack), peso medio por unidad, imágenes por cadena, stock.
- **Alias de ticket:** texto tal como aparece en el ticket + cadena → producto.
- **Compra y línea de compra:** fecha, tienda, total; por línea: producto, cantidad, unidad, precio, precio normalizado.
- **Supermercado (cadena) y tienda:** cadena, nombre o ubicación de la tienda.
- **Sección** y **ruta de tienda:** orden de secciones por tienda.
- **Receta:** raciones, imagen, ingredientes con cantidad y unidad, pasos estructurados (duración, activo o espera, recurso).
- **Plan de menú:** fecha, franja (desayuno, comida, cena), recetas, raciones.
- **Bloque de cocina:** fecha y franjas incluidas (derivado del plan, configurable).
- **Lista de la compra y elemento:** producto, cantidad, origen (manual, aviso de falta, bloque de cocina), estado.

> Este modelo se contrastará con el de la app base para ampliar lo existente en lugar de rehacerlo.

### Requisitos técnicos

- **Compatibilidad:** no romper datos ni funciones existentes; migración de datos para unidades y secciones si hace falta.
- **Sincronización:** lista de la compra compartida entre los miembros del hogar y actualizada en tiempo casi real (la persona que compra ve lo que se acaba de marcar en casa).
- **Uso en tienda:** la lista debe funcionar con mala cobertura (modo sin conexión y sincronización posterior).
- **Gemini:** resolución automática del modelo, caché, plan B y control de la cuota gratuita (M9). La clave de API nunca en el cliente si la app es pública.
- **Imágenes:** almacenamiento propio en caché, tamaños optimizados para móvil.
- **Accesibilidad:** contraste AA, tamaños de toque generosos, texto escalable.

## 8. Fuera de alcance, preguntas abiertas y próximos pasos

### Fuera de alcance (por ahora)

- Planificación automática de menús por IA sin supervisión del usuario.
- Compra online o pedidos a supermercados.
- Información nutricional y dietas (se puede valorar en el futuro).

### Preguntas abiertas

1. ¿Qué tecnología usa la app base (web, móvil nativa, PWA) y dónde guarda los datos?
2. ¿La usan varias personas a la vez? ¿Hay cuentas de usuario o es un solo dispositivo?
3. ¿El bloque de cocina es siempre cena + desayuno + comida, o cambia según el día (fines de semana, días sin cocinar)?
4. ¿La optimización de la cocina simultánea la hace un algoritmo con reglas o la propone Gemini?
5. ¿Se acepta usar imágenes de la web de Mercadona tras revisar sus condiciones, o se prefieren fotos propias y bases abiertas?
6. ¿Al terminar de cocinar se descuenta automáticamente del inventario, o solo se marcan las faltas a mano?
7. ¿Qué cadenas, además de Mercadona, deben estar desde el principio?

### Próximos pasos

1. Compartir la app base (código y diseño).
2. Revisarla y completar los apartados marcados como pendientes: stack, modelo de datos, pantallas y design system actual.
3. Responder las preguntas abiertas.
4. Cerrar el alcance de la fase 1 y pasar a diseño de pantallas.
