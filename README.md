# Tasty
Herramienta para hacer lista de compra, inventario, recetas y más.

Tasty amplía la app «Lista de compra» con planificador de menús, bloque de cocina, cocina simultánea, rutas por supermercado, lectura de tickets sin duplicados y control de precios.

## Abrir la app

La app está en la carpeta `app/`. Al publicar el repositorio con GitHub Pages
(Settings → Pages → «Deploy from a branch» → `main` y carpeta `/ (root)`), la
dirección `https://luckstudio.github.io/Tasty/` abre la app directamente
(`index.html` de la raíz lleva a `app/`).

Ojo: la página del repositorio en github.com (`github.com/LuckStudio/Tasty`)
siempre enseña este README; eso es normal y no es la app.

## Recetas incluidas

Las 14 recetas de noviembre vienen dentro de la app (`app/datos/recetas-noviembre.js`) y se
cargan solas la primera vez que se abre. Sus ingredientes están en el catálogo de productos.

## Estructura
- `app/`: la aplicación (PWA estática, se sirve tal cual; ver `app/LEEME.md`).
- `docs/`: brief, plan, informe técnico y diseño.
- `assets/`: icono y futuras imágenes.

## Probar en local
```bash
cd app && python3 -m http.server 8000
```
Y abrir http://localhost:8000

## Pruebas
```bash
for t in tests/*.test.mjs; do node "$t" || break; done
```

## Documentación
- [Plan de desarrollo por fases](docs/PLAN-DE-DESARROLLO.md)
- [Informe técnico de la app base](docs/app-base.md)
- [Brief del proyecto](docs/brief.md)
- [Propuesta visual de pantallas (PDF)](docs/diseno/propuesta-pantallas-v1.pdf)
- [Icono de la app](assets/icono/tasty-icono-v1.svg)
