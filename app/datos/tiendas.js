/* ============================================================
   TIENDAS — supermercados base
   ------------------------------------------------------------
   Esta lista es la que viene horneada. Desde la app se pueden
   añadir más (fruterías, carnicerías, la panadería de la
   esquina…) y quedan guardadas en el dispositivo.

   CAMPOS
     id      corto, sin espacios ni acentos. No cambia nunca.
     nombre  como se lee
     corto   tres letras para el ticket
     color   color de marca, para los tickets y las etiquetas
     orden   posición en las listas agrupadas
     activa  si false, deja de ofrecerse sin perder sus datos

   Los colores son aproximaciones del color corporativo, usados
   solo como código visual dentro de la app.
   ============================================================ */

export const TIENDAS_BASE = [
  { id: 'mercadona', nombre: 'Mercadona', corto: 'MRC', color: '#00833E', orden: 1, activa: true },
  { id: 'alcampo',   nombre: 'Alcampo',   corto: 'ALC', color: '#E2001A', orden: 2, activa: true },
  { id: 'bonarea',   nombre: 'Bonàrea',   corto: 'BON', color: '#D6001C', orden: 3, activa: true },
  { id: 'lidl',      nombre: 'Lidl',      corto: 'LDL', color: '#0050AA', orden: 4, activa: true },
  { id: 'dia',       nombre: 'Dia',       corto: 'DIA', color: '#D52B1E', orden: 5, activa: true },
  { id: 'carrefour', nombre: 'Carrefour', corto: 'CRF', color: '#004E9F', orden: 6, activa: true },
  { id: 'eroski',    nombre: 'Eroski',    corto: 'ERO', color: '#E30613', orden: 7, activa: true },
  { id: 'primaprix', nombre: 'Primaprix', corto: 'PRX', color: '#E4002B', orden: 8, activa: true },
  { id: 'mercado',   nombre: 'Mercado',   corto: 'MCD', color: '#6B4F2A', orden: 9, activa: true },
  { id: 'vitobest',  nombre: 'Vitobest',  corto: 'VTB', color: '#8CC63F', orden: 10, activa: true },
  { id: 'amazon',    nombre: 'Amazon',    corto: 'AMZ', color: '#FF9900', orden: 11, activa: true }
];

/* Bloque para productos sin preferencia asignada.
   Siempre va el último. No lo borres. */
export const TIENDA_LIBRE = {
  id: 'libre', nombre: 'Cualquier sitio', corto: '—',
  color: '#8A8A8A', orden: 999, activa: true
};

/* Paleta que se ofrece al crear una tienda nueva */
export const COLORES_TIENDA = [
  '#00833E', '#E2001A', '#0050AA', '#F5A623', '#6B4F2A',
  '#7B2D8E', '#00838F', '#C2185B', '#455A64', '#2E7D32'
];
