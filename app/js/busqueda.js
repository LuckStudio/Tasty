/* ============================================================
   BÚSQUEDA DE PRODUCTOS  (lógica de la pantalla 20)
   Filtra por texto, supermercado y sección, y ordena por nombre
   o precio. Los productos sin precio nunca se esconden: van los
   últimos al ordenar por precio.
   ============================================================ */

import { normalizar } from './util.js?v=34';

/* filasDe(id) -> filas de precio (como preciosDe)
   seccionDe(p) -> id de sección
   enLista(id) -> cantidad en la lista */
export function buscarProductos(filtros, productos, { filasDe, seccionDe: laSeccion, enLista = () => 0 }) {
  const { texto = '', tienda = null, seccion = null, orden = 'nombre' } = filtros;
  const q = normalizar(String(texto).trim());

  const salida = [];
  for (const p of productos) {
    if (p.a) continue;
    if (q && !normalizar(p.n).includes(q)) continue;
    if (seccion && laSeccion(p) !== seccion) continue;

    const filas = filasDe(p.id) || [];
    const fila = tienda
      ? filas.find(f => f.tienda === tienda) || null
      : filas.find(f => f.base != null) || filas[0] || null;

    salida.push({ p, fila, enLista: enLista(p.id) || 0, sinPrecioEnTienda: !!tienda && !fila });
  }

  const precio = x => x.fila?.base ?? x.fila?.formato ?? null;
  const porNombre = (a, b) => a.p.n.localeCompare(b.p.n, 'es');
  salida.sort((a, b) => {
    if (orden === 'nombre') return porNombre(a, b);
    const pa = precio(a), pb = precio(b);
    if (pa == null && pb == null) return porNombre(a, b);
    if (pa == null) return 1;                       // sin precio, al final siempre
    if (pb == null) return -1;
    return (orden === 'precio-desc' ? pb - pa : pa - pb) || porNombre(a, b);
  });
  return salida;
}

/* «500 g», «Pack de 6»... lo que se sabe del formato de venta */
export function textoFormato(fila, producto) {
  if (fila?.cantidad && fila?.unidad) {
    const n = String(fila.cantidad).replace('.', ',');
    return `${n} ${fila.unidad === 'l' ? 'L' : fila.unidad}`;
  }
  return producto?.u === 'kg' ? 'Se vende por kg' : producto?.u === 'l' ? 'Se vende por litro' : 'Por unidad';
}
