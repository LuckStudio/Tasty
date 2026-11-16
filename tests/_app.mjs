/* Importa módulos de la app con LA MISMA url que usa la app (?v=N).
   Sin esto, Node carga dos copias del mismo módulo (con y sin ?v=) y
   cada una tiene sus propios datos: una prueba podría modificar una
   copia y comprobar la otra sin enterarse. La versión se lee de sw.js. */
import { readFileSync } from 'node:fs';

const sw = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');
export const VERSION = /compra-v(\d+)/.exec(sw)[1];

export const app = ruta => import(`../app/${ruta}?v=${VERSION}`);
