# Informe técnico de la app base («Lista de compra» → Tasty)

16 nov 2026 · Auditoría de `app/` tal como se recibió en `listacompra_app.zip` (versión 17 de la app, subida a 18 al renombrar).

## Resumen

| Aspecto | Estado |
| --- | --- |
| Tipo | PWA estática: HTML + CSS + JavaScript puro con módulos ES. **Sin framework, sin compilación, sin servidor propio** |
| Tamaño | ≈ 14.900 líneas, 77 archivos, 792 KB |
| Datos | Solo en el navegador (`localStorage`, clave `luckstudio_compra`, esquema 8 con migraciones) |
| Funciona sin conexión | Sí (service worker `sw.js`, caché `compra-vN`) |
| Despliegue actual | Hostinger, subiendo la carpeta (ver `app/LEEME.md`). `.htaccess` imprescindible |
| Cuentas / varios usuarios | No. Compartir = enlaces con la lista codificada en la URL y exportar/importar por fusión |
| Fuentes | Host Grotesk desde Google Fonts (única petición externa) |
| Llamadas de red de la app | Ninguna a APIs. Solo `fetch HEAD` local para comprobar si existe un icono |

## Auditoría de claves y secretos

- Búsqueda de patrones de claves (`AIza…`, `sk-…`, `ghp_…`, `AKIA…`, `Bearer …`) en todo el código: **0 resultados**.
- Búsqueda de `gemini`, `generativelanguage`, `api_key`, `apikey`, `secret`, `token`, `password`, `x-goog`: **0 resultados** (solo coincide la palabra «token» en el nombre de «tokens del sistema visual» de CSS).
- Sin archivos `.env`, `.pem`, `.key` ni carpeta `.git` dentro del zip.
- El repositorio no tiene historial previo con el código, así que no hay claves en commits antiguos.

**Conclusión: no había ninguna clave que eliminar.** Se añade `.gitignore` que bloquea `.env`, claves y secretos a partir de ahora.

## Actualización: el escáner se desarrolla desde cero

Confirmado con el autor: el escáner debía existir pero no estaba en el código recibido, así que se construye aquí. Sin servidor ni cuentas (decisión actual), la clave de Gemini la introduce el usuario en **Ajustes → Escáner de tickets** y se guarda solo en ese dispositivo.

## Diferencia importante con el brief

El brief describe un **escáner de tickets por foto con Gemini**, pero **ese código no está en este zip**: la app no tiene ninguna llamada a Gemini ni a ningún servidor. Lo que sí existe es la importación de tickets pegando texto, el alta manual y el registro al terminar una compra.

Hay que aclarar con el autor dónde está el escáner (otra carpeta, otra versión o un backend aparte). Hasta entonces, M9 y M6 se construyen desde cero en la Fase 1 y 2 respectivamente, con la clave siempre en el servidor.

## Pantallas actuales (`index.html`, vistas `data-vista`)

`grid` (lista) · `resumen` · `gastos` · `ajustes` · `admin` (catálogo) · `precios` · `tiendas` · `importar` · `recordatorios` · `listas` · `cesta` (dónde comprar) · `dieta` (recetas) · `comprador` (modo supermercado) · `ticket`.

Navegación inferior: Lista · Dieta · Resumen · Gastos · Ajustes.

## Lo que ya existe y se mantiene (regla de oro)

- Catálogo de **183 productos** con ids inmutables, archivado en vez de borrado, catálogo editable y por catalogar.
- Listas múltiples, compartir por enlace (compra / editable), modo comprador con checklist y ticket.
- Precios por supermercado, €/kg calculado, comparativa sobre cesta común, presupuesto, tienda preferida.
- Tickets guardados, histórico de compras, estadísticas y evolución de precio (SVG propio).
- Reposición inteligente, urgencias y recordatorios.
- Recetas/dieta: `datos/recetas-dieta.js` con ≈ 89 entradas (plan estricto cargable desde un botón); ingredientes enlazados por id de catálogo y cantidad del plan.
- 10 supermercados base (`datos/tiendas.js`) con color, y altas propias.
- Estética de ticket (`js/ui/ticket.js`, `css/comprador.css`).
- Tema claro / oscuro / automático.

## Modelo de datos actual (`js/almacen.js`, esquema 8)

`listas`, `listaActiva`, `compra`, `preciosLocal`, `prefTienda`, `catalogoLocal`, `tiendasLocal`, `tickets`, `pendientes`, `periodicidad`, `sustitutos`, `marcas`, `recetas`, `urgencia`, `sugerenciasFuera`, `recordatorios`, `ajustes`.

## Implicaciones para el plan de desarrollo

1. **Mantener la tecnología actual** (JS puro, sin compilación) es posible y sencillo de desplegar, pero la sincronización entre miembros del hogar y la clave de Gemini en servidor exigen un backend. Decisión pendiente en Fase 1 (Supabase u otra opción). Los datos de `localStorage` se migrarán sin pérdida.
2. Las recetas existentes no tienen pasos estructurados (duración, activo/espera, recurso): hará falta ampliarlas para la cocina simultánea.
3. Los productos no tienen todavía sección de supermercado, formato de venta ni peso medio por unidad: migración en Fase 1.
4. La clave de `localStorage` y los ids del catálogo **no se cambian** para no romper datos ni enlaces compartidos.

## Cambios hechos en la Fase 0

- Código copiado a `app/` sin modificar su lógica.
- Renombrado visible a **Tasty** (título, manifest, barra superior, textos de compartir, página de reinicio).
- Iconos de la app regenerados desde `assets/icono/tasty-icono-v1.svg` (180, 192, 512 y 512 «maskable» con margen de seguridad) y favicon/SVG sustituidos.
- Versión subida a 18 con `versionar.py` (comprobación de módulos correcta).
- Comprobado en navegador: arranca sin errores de consola, 228 botones en el grid, manifest correcto.

## Modelo de datos ampliado (esquema 9)

Añadido en la fase 1, sin migración destructiva (los datos del esquema 8 se leen tal cual):

| Qué | Dónde | Notas |
| --- | --- | --- |
| Catálogo de secciones | `datos/secciones.js` | 15 secciones comunes; cada categoría tiene una sección por defecto |
| Sección de un producto | campo `s` en la capa editable | Si no existe, se deduce de la categoría |
| Peso medio por unidad | campo `pu` (gramos) | Opcional. Sin él no se convierte unidades ↔ peso |
| Ruta de cada tienda | `datos.rutas[tienda] = { orden, ocultas }` | Una sección nueva se añade al final; lo oculto va a «Sin sección», nunca desaparece |
| Textos de ticket | `datos.alias[cadena][texto] = idProducto` | Por cadena; varios textos por producto |

Módulos: `js/secciones.js` (rutas y agrupación), `js/unidades.js` (conversión, precios por cantidad, atajos), `js/alias.js` (memoria de equivalencias). Las copias exportadas y la fusión incluyen rutas y textos.

**Pendiente en interfaz** (fases 2 y 3): editar la sección y el peso medio de un producto, la pantalla de enlazar, el teclado de cantidad y la pantalla de ruta de tienda. El motor ya está probado.

## Pruebas

```bash
for t in tests/*.test.mjs; do node "$t" || break; done
```

| Archivo | Qué comprueba |
| --- | --- |
| `gemini-escaner` | Modelo automático, caché, plan B, lectura de tickets, enlace con el catálogo, candidatos |
| `diseno` | Contraste AA de todos los colores en claro y oscuro; acento por tienda |
| `datos` | Secciones y rutas, unidades, memoria de textos, migración 8→9, fusión de copias |
| `historial` | Precio normalizado, tendencia, periodos; tickets con cantidad y €/kg |
| `cantidad` | Teclado de cantidad, equivalencias y precio por cantidad |
| `fusion` | Fusión de productos duplicados en todos los datos |
| `busqueda` | Filtros y orden del buscador de productos |

Los tests importan los módulos con la misma URL que la app (`tests/_app.mjs`); sin eso Node carga dos copias y alguna prueba comprobaría una copia distinta de la que modifica.

## Fase 2: estado

Hecho: revisión del ticket línea a línea y enlace (pantallas 15 y 16), memoria de equivalencias, precios normalizados e histórico (18), ficha de ingrediente ampliada (17), teclado de cantidad (19), búsqueda de productos (20) y fusión de duplicados.

Pendiente de la fase 2: el resumen de compra con «cambios de precio» y comparación con la estimación (13), y la navegación nueva (Hoy · Menú · Compra · Despensa · Ticket) que llega con la fase 4.

**Aviso:** el brief habla de «stock actual» e «inventario», pero la app base no tiene control de stock (solo lista, precios y tickets). «En casa: n» (pantallas 5, 17 y 20) y los avisos de faltas necesitan un inventario nuevo. Se propone construirlo en la fase 4 junto a «Qué toca hoy».
