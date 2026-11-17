# Tasty · Plan de desarrollo por fases

> **Estado (17 nov 2026):** Hechas también la despensa visible («En casa» y «He terminado de cocinar»), el resumen de compra con cambios de precio, básicos, hogar («Somos N»), merienda, coste semanal, última vez cocinada, aviso de copia de seguridad, recordatorio de cocinar, configuración de primera vez y pruebas automáticas en cada PR. Quedan fuera: compartir en tiempo real (necesita servidor) y la cocina simultánea (necesita duración de pasos).
>
> **Estado anterior (16 nov 2026):** Fase 0 hecha. Fase 1 en curso: hecho M9 (Gemini automático) y la primera versión del escáner de tickets. Hecho el sistema de diseño (tokens, tipografías, componentes, claro/oscuro y acento por tienda). Hecho el modelo de datos ampliado (esquema 9: secciones, rutas, unidades, memoria de textos de ticket). La navegación nueva llegará con sus módulos (Hoy y Menú en la fase 4). **Fase 1 completa.** Fase 2 casi completa: hecha la revisión y enlace de tickets, el histórico de precios, la ficha de ingrediente, el teclado de cantidad, la búsqueda de productos y la fusión de duplicados. Falta el resumen de compra con cambios de precio. **Fase 3 completa** (elegir tienda, lista por ruta, modo pasillo y configurar rutas). **Fase 4 completa** salvo la duración de los pasos (necesaria para la fase 5): recetas de noviembre, despensa, menú semanal, qué toca hoy, ingredientes consolidados, ficha de receta y «se acaba». Ver `docs/app-base.md`.

16 nov 2026 · Versión 1 · Basado en `docs/brief.md` y `docs/diseno/propuesta-pantallas-v1.pdf`

> Estado: **propuesta pendiente de aprobar**. Algunas decisiones técnicas dependen de ver el código de la app base («Lista de compra»); están marcadas como **[Confirmar con la app base]**.

---

## 0. Cómo vamos a trabajar

### Repositorio
- `main`: siempre la versión estable y desplegada de Tasty.
- Cada fase (o bloque grande dentro de una fase) se desarrolla en una rama propia y entra en `main` mediante un Pull Request que revisas tú. Cuando me lo indiques, también puedo fusionarlo yo.
- Cada PR incluye: qué cambia, capturas de las pantallas tocadas y cómo probarlo.
- Despliegue automático de `main` (y una vista previa por PR) para que pruebes en el móvil sin instalar nada.

### Estructura del repositorio (propuesta)
```
/app            código de la aplicación (lo que hoy es «Lista de compra»)
/docs           brief, este plan, decisiones técnicas, diseño
/docs/diseno    PDF de pantallas y futuras versiones
/assets/icono   icono de la app (SVG maestro y exportaciones)
/assets/recetas fotos de recetas (originales, antes de optimizar)
/data/recetas   recetas en formato estructurado (ver plantilla al final)
```

### Definición de «hecho» para cada fase
1. Funciona en móvil y tablet (vertical) y en escritorio.
2. Las funciones de la app base siguen funcionando (regla de oro del brief).
3. Contraste AA y botones de al menos 48 px en vistas de cocina y tienda.
4. Pruebas automáticas de la lógica crítica (unidades, consolidación, enlaces de ticket, rutas).
5. Desplegado y probado por ti antes de fusionar.

---

## 1. Arquitectura (decisión actualizada: sin servidor ni cuentas por ahora)

Se mantiene la tecnología de la app base: **PWA estática en JavaScript puro, sin compilación, con los datos en el propio dispositivo**. Servidor, cuentas y sincronización entre personas quedan **aplazados** a una fase futura.

| Necesidad del brief | Solución ahora | Cuando haya servidor |
| --- | --- | --- |
| Móvil y tablet en la encimera | PWA instalable (ya existe) | — |
| Lista compartida | Enlaces y exportar/importar por fusión (ya existe) | Sincronización en tiempo real |
| Mala cobertura en el súper | Todo es local; funciona sin conexión (ya existe) | Cola de cambios |
| Clave de Gemini | La pone el usuario en Ajustes y vive **solo en el dispositivo** (nunca en el repositorio ni en las copias). Llamada directa a Google | Pasar la llamada a una función de servidor |
| Pantalla encendida en cocina | API Wake Lock | — |
| Imágenes | Archivos en `app/` optimizados | Almacenamiento propio |

**Riesgo asumido:** una clave en el dispositivo es aceptable para uso privado del hogar, pero no si la app se hiciera pública. Es el primer motivo para añadir servidor más adelante.

---

## 2. Fases

Resumen (cada fase se apoya en la anterior; al final de la fase 6 está el MVP completo con todos los módulos del brief):

| Fase | Nombre | Módulos del brief | Pantallas del PDF |
| --- | --- | --- | --- |
| 0 | Traslado de la app base y renombrado a Tasty | App base | — |
| 1 | Cimientos: diseño, datos, sincronización y Gemini | Identidad visual, M9, base de M8 | 00 |
| 2 | Productos, unidades, precios y tickets | M8, M6, M7 | 13–20 |
| 3 | Supermercados y compra en tienda | M5 | 09–12 |
| 4 | Recetas, planificador, «Qué toca hoy» y avisos | M1, M2, M4 | 01–05, 08 |
| 5 | Cocina simultánea | M3 | 06–07 |
| 6 | Pulido, carga de recetas y lanzamiento del MVP | Transversal | Todas |

El orden sigue la lógica del brief: primero datos fiables (productos sin duplicados y unidades bien resueltas), porque el planificador, las rutas y la cocina dependen de ellos.

---

### Fase 0 · Traslado de la app base y renombrado a Tasty

**Objetivo:** tener la app actual funcionando dentro de este repositorio, sin cambios de comportamiento.

- Subir el código de «Lista de compra» a `/app` (ver sección 5: cómo subirlo).
- Auditoría: stack, dónde guarda los datos, modelo de datos, inventario de pantallas, cómo llama a Gemini, dependencias.
- Completar los apartados «Pendiente» del brief en `docs/app-base.md`.
- Quitar del código cualquier clave o secreto y moverlo a configuración segura.
- Renombrar a **Tasty**: nombre, manifest, icono (a partir de `assets/icono/tasty-icono-v1.svg`: favicon, iconos PWA 192/512, icono enmascarable, apple-touch).
- Despliegue automático y vista previa por PR.
- Copia de seguridad / exportación de los datos actuales antes de tocar nada.

**Entregable:** Tasty = la app base, renombrada, desplegada y con su informe técnico.

---

### Fase 1 · Cimientos

**1.1 Design system (pantalla 00)**
- Tokens de color: Papel `#F3F2EE`, Ticket `#FFFFFF`, Tinta `#15171C`, Tinta suave `#5F6573`, Hay stock `#1F7A4D`, Se acaba `#B45309`, Agotado `#B42318`, Perforado `#C9C6BE`.
- Acento por tienda: Base `#2B59C3`, Mercadona `#00774A`, Dia `#C8102E`, otra cadena `#C24400`. Regla automática: si el color de la cadena no da 4,5:1 con texto blanco, se oscurece.
- Tipografías: Space Grotesk (títulos), Inter (lectura y pasos), JetBrains Mono (datos: precios, cantidades, totales).
- Componentes: ticket (líneas de recibo, separador discontinuo, borde dentado), botones principal/secundario, chips de estado (Hay / Se acaba / Agotado / Falta), color por receta, tarjetas de receta y producto, hoja inferior, teclado numérico, barra de navegación inferior.
- Navegación de 5 pestañas: **Hoy · Menú · Compra · Despensa · Ticket**, más el botón flotante «Se acaba».
- Se reestilan las pantallas existentes de la app base con el nuevo sistema (manteniendo la estética de ticket).

**1.2 Modelo de datos ampliado** (migración sin perder datos)
- Producto: sección, formato de venta (kg / l / unidad / pack), peso medio por unidad, imágenes por cadena, stock.
- Cadena y tienda; catálogo de secciones; ruta (orden de secciones) por tienda.
- Alias de ticket (texto + cadena → producto).
- Compra y línea de compra con precio normalizado.
- Receta con pasos estructurados; plan de menú; bloque de cocina; elementos de lista con origen.

**1.3 Hogar y sincronización** — *aplazado*: sin cuentas ni servidor por ahora. Se sigue compartiendo con enlaces y exportar/importar.

**1.4 M9 · Gemini siempre en el modelo más reciente** — *hecho (ver estado)*
- La app consulta el listado de modelos, filtra los que admiten imagen y están en la capa gratuita, elige el más reciente y lo guarda 24 h.
- Plan B automático: si falla por disponibilidad o cuota, prueba el siguiente.
- En Ajustes: modelo en uso y opción de forzar uno a mano.

**Entregable:** la app base con el nuevo diseño, datos migrados, uso compartido y escáner sin mantenimiento.

---

### Fase 2 · Productos, unidades, precios y tickets

- **M8 · Unidades y pesos (pantalla 19):** «cómo se vende» vs «cuánto se compra»; atajos 250 g / 500 g / 750 g / 1 kg, teclado numérico, selector +/− para unidades; conversión receta ↔ compra con peso medio editable.
- **M6 · Tickets sin duplicados (pantallas 14, 15, 16, 13):**
  - Escáner con indicador del modelo de Gemini y unión de varias fotos para tickets largos.
  - Revisión línea a línea: «Sí, es este» / «Cambiar» / «Enlazar» / «Crear nuevo» (nunca por defecto si hay parecidos).
  - Memoria de equivalencias por cadena; varios textos de ticket por producto.
  - Lectura de líneas a granel (peso × €/kg).
  - Resumen de compra con estilo ticket, comparación con la estimación y cambios de precio.
  - Fusionar productos duplicados.
- **M7 · Ficha de ingrediente (pantalla 17):** imagen por cadena, sección, formato, stock, precio, tendencia, recetas en que aparece y textos de ticket.
- **Histórico de precios (pantalla 18):** precio normalizado, gráfico 3M/6M/1A por cadena, indicador ha bajado / estable / ha subido frente a la media de 3 meses, tabla de compras.
- **Búsqueda de productos (pantalla 20):** resultados con imagen, formato, precio y €/kg; filtros por cadena y sección; estado en casa.

**Entregable:** cada compra escaneada actualiza despensa y precios sin crear duplicados.

---

### Fase 3 · Supermercados y compra en tienda

- **Elegir tienda (pantalla 09):** el tema cambia al color de la cadena; se recuerda la última tienda; estimado de la compra.
- **Lista por ruta (pantalla 10):** agrupada y ordenada por el recorrido de la tienda; tachado con un toque (baja al final de la sección); grupo «Sin sección» con asignación en el momento; total estimado con precios de esa cadena.
- **Modo compra (pantalla 11):** una sección cada vez, botones grandes, «Siguiente sección», importe que llevas.
- **Configurar ruta (pantalla 12):** arrastrar secciones, ocultar las que la tienda no tiene, varias tiendas de la misma cadena.
- Funciona sin cobertura y sincroniza al salir.

**Entregable:** la persona que compra ve la lista ordenada por su tienda y lo que se acaba de marcar en casa.

---

### Fase 4 · Recetas, planificador, «Qué toca hoy» y avisos

- **Recetario ampliado:** imagen protagonista, color por receta, raciones, ingredientes vinculados a productos, pasos estructurados (duración, activo/espera, recurso: horno, fuego…). Importación de tus recetas (plantilla en sección 6).
- **Ficha de receta (pantalla 04)** e **Elegir receta para una franja (pantalla 03):** filtros «Con lo que tengo», «< 30 min», «Favoritas»; disponibilidad (Tienes todo / Falta 1); raciones.
- **M1 · Planificador semanal (pantalla 02):** desayuno, comida y cena; varias recetas por franja; «Cena fuera»; copiar día o semana; generar lista.
- **M2 · Bloque de cocina:** por defecto cena de D + desayuno y comida de D+1, configurable.
  - **Inicio «Qué toca hoy» (pantalla 01).**
  - **Ingredientes consolidados (pantalla 05):** total por ingrediente con desglose por receta, comparación con la despensa, faltas a la lista con un toque.
- **M4 · Se está acabando (pantalla 08):** botón flotante siempre visible (también en modo cocina), «se está acabando» / «se ha acabado», sugerencias del bloque y habituales, pasa al momento a la lista sin duplicar.

**Entregable:** planificar la semana, abrir la app el lunes y ver qué cocinar, qué sacar y qué falta.

---

### Fase 5 · Cocina simultánea

- **Plan para cocinar a la vez (pantalla 06):** cronograma por receta (manos ocupadas / espera) y lista de pasos combinados.
- **Algoritmo de optimización** (propuesta: **reglas propias**, deterministas y sin coste de cuota):
  1. Empieza por lo que más tarda y por las esperas largas (horno, cocciones, marinados).
  2. Rellena las esperas con tareas activas de otras recetas.
  3. Agrupa tareas iguales («lava y corta todo de una vez») sumando cantidades.
  4. Respeta recursos (un horno, número de fuegos) y dependencias entre pasos.
  - Opcional más adelante: que Gemini proponga una mejora y tú la revises.
- **Modo cocina (pantalla 07):** fondo oscuro, texto muy grande, imagen y color de la receta en cada paso, cantidades exactas por receta, varios temporizadores en paralelo, pantalla fija, avanzar con un toque, botón «Se acaba».
- **Al terminar:** opción de descontar del inventario lo usado.

**Entregable:** cocinar las 3 recetas del bloque siguiendo un único paso a paso.

---

### Fase 6 · Pulido, carga de recetas y lanzamiento del MVP

- Carga de todas tus recetas y sus fotos (optimizadas).
- Imágenes de ingredientes según la decisión tomada (ver decisiones).
- Revisión de accesibilidad AA, tamaños de texto escalables, rendimiento en móvil.
- Pruebas de extremo a extremo de los flujos clave: planificar → cocinar → marcar faltas → comprar → escanear ticket.
- Estados vacíos, errores y carga en todas las pantallas.
- Guía rápida de uso y lanzamiento (instalar la PWA en los móviles del hogar).

**Entregable: MVP completo de Tasty.**

---

## 3. Decisiones que necesito antes de empezar

| # | Pregunta | Mi recomendación |
| --- | --- | --- |
| 1 | ¿Tecnología de la app base y dónde guarda los datos? | Lo veré al subir el código |
| 2 | ¿Varias personas a la vez? | **Decidido: no por ahora.** Sin cuentas ni servidor |
| 3 | ¿Bloque siempre cena + desayuno + comida? | Ese por defecto, editable por día y con plantillas para fin de semana |
| 4 | ¿Cocina simultánea con reglas o con Gemini? | Reglas propias; Gemini como mejora opcional |
| 5 | ¿Imágenes de Mercadona? | Empezar con fotos propias + Open Food Facts; la ficha admite imagen por cadena, así que se puede añadir después |
| 6 | ¿Descontar del inventario al cocinar? | Preguntar al terminar el bloque, con la cantidad propuesta editable |
| 7 | ¿Cadenas desde el principio? | Mercadona y Dia (las del diseño); añadir más desde la app |
| 8 | ¿Dónde se publica? | Vercel o Netlify (gratis), con vista previa por PR |

---

## 4. Imágenes que vamos a necesitar

| Qué | Cantidad | Formato recomendado | Notas |
| --- | --- | --- | --- |
| **Foto de cada receta** | 1 por receta (opcional 1 extra del emplatado) | JPG o PNG, mínimo 1600 × 1200 px (4:3), plato centrado | Se usa en ficha (cabecera), tarjetas y modo cocina. Fondo sencillo, luz natural, plato reconocible desde lejos |
| **Fotos de pasos** (opcional) | Solo en pasos difíciles | 1200 × 900 px | No imprescindible para el MVP |
| **Ingredientes / productos** | Los más usados (≈ 50–100) | Cuadradas, 800 × 800 px, fondo claro | Según decisión 5: fotos propias, Open Food Facts o web del súper |
| **Icono de la app** | Ya lo tenemos (SVG) | — | Yo genero favicon, 192/512, enmascarable y apple-touch. Si cambias colores, solo necesito el nuevo SVG |
| **Logos de supermercados** | Ninguna | — | El diseño usa iniciales (MA, MP, DC) sobre el color de la cadena; evitamos logos de marca |
| **Ilustraciones de estados vacíos** (opcional) | 4–5 | SVG | Puedo hacerlas yo en el estilo del sistema |

Nombre de archivo de cada foto de receta: el mismo identificador que la receta, por ejemplo `salmon-al-horno-con-verduras.jpg`.

---

## 5. Cómo subir la app base («Lista de compra») al repositorio

La sesión de trabajo corre en la nube y no puede leer `D:\Claude Proyects\Lista de compra`. Opciones (de más a menos recomendable):

**A. Desde tu PC con Git**
1. Clona el repositorio en una carpeta nueva.
2. Copia el contenido de «Lista de compra» dentro de una subcarpeta `app/` del repositorio clonado (sin `node_modules`, `dist`, `build` ni archivos `.env`).
3. Haz commit y push a `main`.

**B. Comprimir en .zip y adjuntarlo en este chat** (sin `node_modules` ni `.env`). Yo lo coloco en `/app` y lo subo.

**C. GitHub web:** «Add file → Upload files» y arrastrar la carpeta (máx. 100 archivos por subida).

**Importante:** si la app tiene la clave de Gemini en un archivo (`.env`, config…), **no la subas**. Nos la pasaremos de forma segura como secreto del entorno.

---

## 6. Plantilla para enviar recetas

Para que la cocina simultánea funcione, cada paso necesita duración, si es tiempo activo o de espera y qué recurso usa. Puedes enviarlas en texto libre y yo las estructuro, pero esta es la información ideal:

```
Nombre: Salmón al horno con verduras
Categoría: Pescado · Horno
Raciones: 2
Tiempo total: 35 min · Tiempo activo: 10 min
Franja habitual: Cena
Foto: salmon-al-horno-con-verduras.jpg

Ingredientes:
- Salmón en lomos · 300 g
- Tomate pera · 300 g
- Calabacín · 1 ud
- Limón · 1 ud
- Aceite de oliva · 2 cucharadas
- Sal · al gusto

Pasos:
1. Precalentar el horno a 200 °C · 10 min · espera · horno
2. Cortar el tomate en rodajas y el calabacín en medias lunas · 5 min · activo · tabla
3. Colocar verduras y salmón en la bandeja, aliñar · 5 min · activo
4. Hornear · 20 min · espera · horno
```


---

## 7. Qué falta (revisión del 16 nov 2026)

Hechas: fases 0, 1, 2 (menos un detalle), 3 y 4. La fase 5 (cocina simultánea) queda **aplazada a petición del usuario**.

| Fase | Qué es | Por qué hace falta | Prioridad |
| --- | --- | --- | --- |
| **4b · Despensa visible** | Pantalla «En casa» (ver y corregir existencias), tarjeta «En casa» en la ficha y en Productos, y el botón «He terminado de cocinar» que descuenta del inventario | Hoy la despensa se llena sola (compras, «se acaba») pero **no se puede ver ni corregir**; el descuento al cocinar existe pero no tiene botón (M4 del brief) | **Alta** |
| **2b · Resumen de compra** | Pantalla 13: el ticket tras comprar con «cambios de precio» frente a la última vez y la estimación de la lista | Es lo que cierra el círculo compra → precios | Media |
| **5 · Cocina simultánea** | Guía paso a paso combinada, temporizadores, modo cocina | Aplazada. Necesita duración, tipo (activo/espera) y recurso en cada paso | Aplazada |
| **6 · Lanzamiento** | Probar el escáner con tickets reales de Mercadona y Dia y afinar el prompt, fotos de recetas, guía de instalación en el móvil, publicar y fusionar en `main` | Sin esto no está en uso real | **Alta (final)** |

Decisiones pequeñas pendientes: pestañas de la navegación (el PDF propone Hoy · Menú · Compra · Despensa · Ticket; ahora hay Hoy · Menú · Lista · Resumen · Gastos · Ajustes), una cuarta franja de merienda en el calendario, y estimar las duraciones de los pasos de las recetas.
