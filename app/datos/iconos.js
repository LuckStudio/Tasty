/* ============================================================
   ICONOS SVG PROPIOS  (opcional)
   ------------------------------------------------------------
   Por defecto la app usa el EMOJI de cada producto. Es lo que
   mejor funciona: se ve igual en todos los móviles, no pesa
   nada y no hay que dibujar doscientos archivos.

   Esta lista es para cuando quieras sustituir el emoji de algún
   producto concreto por un SVG tuyo. Solo se pedirán al servidor
   los que aparezcan aquí escritos, así que no hay peticiones
   fallidas ni errores 404 en la consola.

   CÓMO AÑADIR UNO
     1. Dibuja el SVG siguiendo iconos/LEEME.txt
     2. Súbelo a  iconos/<categoría>/<slug>.svg
     3. Escribe su slug en esta lista

   El slug es el nombre del producto en minúsculas, sin acentos
   y con guion bajo en los espacios. Es exactamente el nombre del
   archivo, sin el .svg

   Ejemplo:
     export const ICONOS = [
       'tomate',
       'patatas_fritas',
       'proteina_iso_cfm'
     ];
   ============================================================ */

export const ICONOS = [];

export const SET_ICONOS = new Set(ICONOS);
