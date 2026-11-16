# Tasty
Herramienta para hacer lista de compra, inventario, recetas y más.

Tasty amplía la app «Lista de compra» con planificador de menús, bloque de cocina, cocina simultánea, rutas por supermercado, lectura de tickets sin duplicados y control de precios.

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
for t in gemini-escaner diseno datos; do node tests/$t.test.mjs; done
```

## Documentación
- [Plan de desarrollo por fases](docs/PLAN-DE-DESARROLLO.md)
- [Informe técnico de la app base](docs/app-base.md)
- [Brief del proyecto](docs/brief.md)
- [Propuesta visual de pantallas (PDF)](docs/diseno/propuesta-pantallas-v1.pdf)
- [Icono de la app](assets/icono/tasty-icono-v1.svg)
