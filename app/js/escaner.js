/* ============================================================
   ESCÁNER DE TICKETS
   ------------------------------------------------------------
   Foto(s) del ticket  ->  Gemini  ->  borrador de compra

   El resultado NO se guarda solo: se entrega como borrador al
   editor de compras, donde el usuario revisa línea a línea
   antes de guardar. Nada entra en precios ni en el histórico
   sin que lo haya visto.

   Separado en piezas para poder probarlas sin navegador:
     normalizarLectura()   limpia lo que devuelve Gemini
     proponerProducto()    enlaza un texto de ticket con el catálogo
     prepararImagen()      reduce la foto (solo navegador)
     escanear()            todo el recorrido
   ============================================================ */

import { generar } from './gemini.js?v=35';
import { normalizar } from './util.js?v=35';

/* ---------- lo que se le pide a Gemini ---------- */

export const ESQUEMA = {
  type: 'OBJECT',
  properties: {
    tienda:  { type: 'STRING',  nullable: true },
    fecha:   { type: 'STRING',  nullable: true },
    total:   { type: 'NUMBER',  nullable: true },
    lineas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          texto:     { type: 'STRING' },
          cant:      { type: 'NUMBER' },
          importe:   { type: 'NUMBER' },
          peso_kg:   { type: 'NUMBER', nullable: true },
          precio_kg: { type: 'NUMBER', nullable: true }
        },
        required: ['texto', 'importe']
      }
    }
  },
  required: ['lineas']
};

export const INSTRUCCIONES = `Eres un lector de tickets de supermercado españoles.
Te paso una o varias fotos del MISMO ticket, en orden. Extrae:

- tienda: la cadena y, si aparece, la tienda o ciudad (por ejemplo "Mercadona Aragonia"). null si no se lee.
- fecha: en formato AAAA-MM-DD. null si no se lee.
- total: el total pagado en euros. null si no se lee.
- lineas: UNA entrada por cada artículo comprado, en el orden del ticket.
  · texto: el nombre EXACTAMENTE como está impreso, sin corregirlo ni expandirlo.
  · cant: número de unidades (1 si no pone otra cosa o es un producto a peso).
  · importe: lo que cuesta la línea entera en euros, con punto decimal. Si hay varias unidades, el importe total de la línea, no el unitario.
  · peso_kg y precio_kg: SOLO si la línea es de un producto a peso (por ejemplo "0,612 kg x 3,49 €/kg"). En otro caso null.

Reglas:
- No inventes artículos ni precios. Si una línea no se lee, sáltala.
- Ignora IVA, desglose de impuestos, forma de pago, puntos, cambio, número de ticket y publicidad.
- Si una línea de descuento rebaja el artículo anterior, resta el descuento al importe de ese artículo y no la incluyas aparte.
- Los números van con punto decimal (3.45), no con coma.`;

/* ---------- limpiar la respuesta ---------- */

function numero(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const redondear = n => Math.round(n * 100) / 100;

/* Convierte lo que diga Gemini en datos de confianza o falla con
   un mensaje claro. Nunca se fía del tipo ni del formato. */
export function normalizarLectura(textoJson) {
  let bruto;
  try {
    /* A veces el JSON viene envuelto en ```json ... ``` */
    const limpio = String(textoJson).trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    bruto = JSON.parse(limpio);
  } catch {
    return { ok: false, error: 'No he podido entender la respuesta de Gemini. Prueba con otra foto.' };
  }
  if (!bruto || !Array.isArray(bruto.lineas)) {
    return { ok: false, error: 'Gemini no ha encontrado artículos en la foto.' };
  }

  const lineas = [];
  for (const l of bruto.lineas) {
    /* El texto sale de una foto: no es de fiar. Un ticket nunca
       necesita < > ni comillas, así que se quitan en origen. */
    const texto = typeof l?.texto === 'string'
      ? l.texto.replace(/[<>"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) : '';
    const importe = numero(l?.importe);
    if (!texto || importe == null) continue;
    lineas.push({
      texto,
      cant: Math.max(1, Math.min(99, Math.round(numero(l.cant) || 1))),
      importe: redondear(importe),
      pesoKg: numero(l.peso_kg) > 0 ? numero(l.peso_kg) : null,
      precioKg: numero(l.precio_kg) > 0 ? numero(l.precio_kg) : null
    });
  }
  if (!lineas.length) {
    return { ok: false, error: 'No he leído ningún artículo. Encuadra el ticket entero y con buena luz.' };
  }

  let fecha = null;
  if (typeof bruto.fecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(bruto.fecha)) {
    const d = new Date(bruto.fecha.slice(0, 10) + 'T12:00:00');
    /* Una fecha futura o absurda casi seguro es una mala lectura */
    if (!isNaN(d) && d.getTime() <= Date.now() + 86400000 && d.getFullYear() >= 2015) {
      fecha = bruto.fecha.slice(0, 10);
    }
  }

  const suma = redondear(lineas.reduce((a, l) => a + l.importe, 0));
  const totalLeido = numero(bruto.total);

  return {
    ok: true,
    tiendaTexto: typeof bruto.tienda === 'string'
      ? bruto.tienda.replace(/[<>"'`]/g, '').trim().slice(0, 60) : '',
    fecha,
    totalLeido: totalLeido != null ? redondear(totalLeido) : null,
    suma,
    /* Si suma y total no cuadran, falta o sobra alguna línea */
    cuadra: totalLeido == null ? null : Math.abs(suma - totalLeido) < 0.02,
    lineas
  };
}

/* ---------- enlazar con el catálogo ---------- */

/* Se comparan palabras sueltas, sin tildes, sin números (pesos y
   formatos) y con el plural simple recortado. */
function palabras(txt) {
  return normalizar(txt)
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w && !/^\d+([.,]\d+)?$/.test(w))
    .map(w => w.replace(/(es|s)$/, ''))          // plural simple
    .filter(w => w.length > 1);
}

/* Devuelve { id, nombre, c, seguridad } o null.
   "alta" solo si el nombre del producto aparece entero en el texto
   y es el único candidato claro: ante la duda no se enlaza solo. */
export function proponerProducto(texto, productos) {
  const tk = new Set(palabras(texto));
  if (!tk.size) return null;

  const candidatos = [];
  for (const p of productos) {
    const pw = palabras(p.n);
    if (!pw.length) continue;
    if (pw.every(w => tk.has(w))) {
      candidatos.push({ p, peso: pw.join('').length, exacto: pw.length === tk.size });
    }
  }
  if (!candidatos.length) return null;

  candidatos.sort((a, b) => (b.exacto - a.exacto) || b.peso - a.peso);
  const [mejor, segundo] = candidatos;
  const claro = !segundo || mejor.peso > segundo.peso;

  return {
    id: mejor.p.id, nombre: mejor.p.n, c: mejor.p.c,
    seguridad: claro ? 'alta' : 'media'
  };
}

/* Productos PARECIDOS (no exactos) para ofrecer en la revisión.
   Cuenta palabras en común, también por comienzo de palabra (el
   ticket abrevia: «BATID» ~ «batido»). Ordenados de más a menos
   parecido. excluir: ids que no se quieren repetir. */
export function buscarCandidatos(texto, productos, { excluir = [], max = 3 } = {}) {
  const tk = [...new Set(palabras(texto))];
  if (!tk.length) return [];
  const fuera = new Set(excluir);

  /* 1 punto: misma palabra o comienzo de 3+ letras. Medio punto: una
     abreviatura de 2 letras («FR» ~ «fresco»): útil pero poco fiable. */
  const valor = (a, b) => {
    if (a === b) return 1;
    if (a.length >= 3 && b.startsWith(a)) return 1;
    if (b.length >= 3 && a.startsWith(b)) return 1;
    if (a.length === 2 && b.length > 3 && b.startsWith(a)) return 0.5;
    return 0;
  };

  const puntuados = [];
  for (const p of productos) {
    if (fuera.has(p.id)) continue;
    const pw = palabras(p.n);
    if (!pw.length) continue;
    let comunes = 0, fuertes = 0;
    for (const w of pw) {
      const v = Math.max(0, ...tk.map(t => valor(t, w)));
      comunes += v;
      if (v === 1) fuertes++;
    }
    if (!comunes) continue;
    /* Más importante cubrir el nombre entero que tener muchas en común */
    puntuados.push({ p, fuertes, puntos: comunes / pw.length + comunes * 0.15 });
  }
  /* Una abreviatura de 2 letras solo sirve cuando no hay nada mejor:
     si existe algún parecido fuerte, los débiles son ruido. */
  if (puntuados.some(x => x.fuertes > 0)) {
    for (let i = puntuados.length - 1; i >= 0; i--) if (!puntuados[i].fuertes) puntuados.splice(i, 1);
  }
  puntuados.sort((a, b) => b.puntos - a.puntos || a.p.n.length - b.p.n.length);
  return puntuados.slice(0, max).map(x => x.p);
}

export function proponerTienda(texto, tiendas) {
  const t = normalizar(texto || '');
  if (!t) return null;
  const encontrada = tiendas
    .filter(x => t.includes(normalizar(x.nombre)))
    .sort((a, b) => b.nombre.length - a.nombre.length)[0];
  return encontrada ? encontrada.id : null;
}

/* Del resultado limpio al borrador que entiende el editor.
   contexto.buscarAlias(tienda, texto) -> id | null es la memoria de
   equivalencias: lo que el usuario ya enlazó en esa cadena. */
export function aBorrador(lectura, { productos, tiendas, buscarAlias: memoria }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const tienda = proponerTienda(lectura.tiendaTexto, tiendas);
  const porId = new Map(productos.map(p => [p.id, p]));

  return {
    id: null,
    tienda,
    fecha: lectura.fecha || hoy,
    pago: 'tarjeta',
    escaneado: {
      tiendaTexto: lectura.tiendaTexto,
      totalLeido: lectura.totalLeido,
      suma: lectura.suma,
      cuadra: lectura.cuadra,
      fechaLeida: !!lectura.fecha
    },
    lineas: lectura.lineas.map(l => {
      /* 1º la memoria: es lo que el usuario ya decidió. Si apunta a un
         producto que ya no existe (archivado), se ignora. */
      const idMemoria = tienda && memoria ? memoria(tienda, l.texto) : null;
      const deMemoria = idMemoria != null ? porId.get(idMemoria) : null;

      const m = deMemoria
        ? { id: deMemoria.id, nombre: deMemoria.n, c: deMemoria.c, seguridad: 'alta' }
        : proponerProducto(l.texto, productos);

      /* Solo se enlaza solo con seguridad alta; si no, queda como
         texto del ticket para que lo decida el usuario. */
      const enlazado = m && m.seguridad === 'alta' ? m : null;
      return {
        id: enlazado ? enlazado.id : null,
        n: enlazado ? enlazado.nombre : l.texto,
        c: enlazado ? enlazado.c : null,
        cant: l.cant,
        precio: l.importe,
        textoTicket: l.texto,
        porMemoria: !!deMemoria,
        autoEnlazada: !!enlazado && !deMemoria,
        sugerido: m && !enlazado ? { id: m.id, nombre: m.nombre } : null,
        pesoKg: l.pesoKg,
        precioKg: l.precioKg,
        /* Producto a peso: se guarda cuánto pesó y a cuánto el kilo */
        ...(l.pesoKg ? { q: { v: l.pesoKg, u: 'kg' } } : {}),
        ...(l.precioKg ? { pb: l.precioKg } : {})
      };
    })
  };
}

/* ---------- imagen (solo navegador) ---------- */

/* Reduce a 1600 px de lado largo y JPEG 85 %: más no mejora la
   lectura y gasta cuota y datos móviles. */
export async function prepararImagen(archivo, ladoMax = 1600) {
  const bmp = await createImageBitmap(archivo);
  const escala = Math.min(1, ladoMax / Math.max(bmp.width, bmp.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(bmp.width * escala);
  lienzo.height = Math.round(bmp.height * escala);
  lienzo.getContext('2d').drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
  bmp.close?.();

  const blob = await new Promise(r => lienzo.toBlob(r, 'image/jpeg', 0.85));
  if (!blob) throw new Error('No he podido preparar la foto.');
  const data = await new Promise((ok, mal) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result).split(',')[1]);
    fr.onerror = mal;
    fr.readAsDataURL(blob);
  });
  return { mimeType: 'image/jpeg', data };
}

/* ---------- recorrido completo ---------- */

/* archivos: File[] (1 a 4 fotos del mismo ticket) */
export async function escanear(archivos, contexto) {
  if (!archivos?.length) return { ok: false, error: 'No hay ninguna foto.' };
  if (archivos.length > 4) return { ok: false, error: 'Como mucho 4 fotos por ticket.' };

  let imagenes;
  try {
    imagenes = await Promise.all([...archivos].map(a => prepararImagen(a)));
  } catch {
    return { ok: false, error: 'No he podido abrir la foto. Prueba con otra.' };
  }

  const { texto, modelo } = await generar({
    partes: [
      { text: INSTRUCCIONES },
      ...imagenes.map(inlineData => ({ inlineData }))
    ],
    esquema: ESQUEMA
  });

  const lectura = normalizarLectura(texto);
  if (!lectura.ok) return lectura;

  return { ok: true, modelo, lectura, borrador: aBorrador(lectura, contexto) };
}
