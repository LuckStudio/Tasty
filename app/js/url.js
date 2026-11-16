/* ============================================================
   URL — enlaces compartibles
   ------------------------------------------------------------
   FORMATO
     #l=<productos>~<libres>     lista para editar
     #c=<productos>~<libres>     modo comprador (Fase 2)

   <productos>  ids en base36 separados por punto.
                Si la cantidad es mayor que 1 se añade *n.
                  5t.9a*3.1f   ->  tres unidades del id 9a
   <libres>     textos escritos a mano, separados por |
   <urgencias>  id:AAMMDD separados por coma
   <nombre>     nombre de la lista, para que quien la reciba sepa
                si es la de casa o la de la playa

   Las partes de la tercera en adelante son opcionales, así que
   los enlaces antiguos se siguen leyendo igual.

   Los ids en base36 acortan mucho: el id 1214 ocupa 2
   caracteres en vez de 4. Una lista de 25 productos cabe
   en unos 90 caracteres.
   ============================================================ */

export function codificar(lista, libres = [], urgencias = {}, nombre = '') {
  const productos = Object.entries(lista)
    .filter(([, cant]) => cant > 0)
    .map(([id, cant]) => {
      const base = Number(id).toString(36);
      return cant > 1 ? `${base}*${cant}` : base;
    })
    .join('.');

  /* La fecha se acorta a AAMMDD: seis caracteres en vez de diez */
  const urg = Object.entries(urgencias)
    .filter(([id]) => lista[id] > 0)
    .map(([id, f]) => `${Number(id).toString(36)}:${f.replace(/-/g, '').slice(2)}`)
    .join(',');

  const titulo = String(nombre || '').trim().slice(0, 40);

  let texto = productos;
  if (libres.length || urg || titulo) texto += '~' + libres.join('|');
  if (urg || titulo) texto += '~' + urg;
  if (titulo) texto += '~' + titulo;

  return encodeURIComponent(texto);
}

export function decodificar(fragmento) {
  const lista = {};
  const libres = [];
  const urgencias = {};
  if (!fragmento) return { lista, libres, urgencias, nombre: '' };

  const [productos = '', textos = '', urg = '', nombre = ''] =
    decodeURIComponent(fragmento).split('~');

  for (const trozo of productos.split('.')) {
    if (!trozo) continue;
    const [base, cant] = trozo.split('*');
    const id = parseInt(base, 36);
    if (!Number.isFinite(id)) continue;
    lista[id] = Math.max(1, parseInt(cant, 10) || 1);
  }

  for (const t of textos.split('|')) {
    const limpio = t.trim();
    if (limpio) libres.push(limpio);
  }

  for (const trozo of urg.split(',')) {
    if (!trozo) continue;
    const [base, fecha] = trozo.split(':');
    const id = parseInt(base, 36);
    if (!Number.isFinite(id) || !/^\d{6}$/.test(fecha || '')) continue;
    urgencias[id] = `20${fecha.slice(0, 2)}-${fecha.slice(2, 4)}-${fecha.slice(4, 6)}`;
  }

  return { lista, libres, urgencias, nombre: nombre.trim() };
}

/* Lee el hash actual y devuelve qué modo pide la URL.
   La `firma` es el texto codificado tal cual: sirve para saber
   si un enlace que llega es el mismo que ya se está comprando
   o si es una lista nueva. */
export function leerHash() {
  const hash = location.hash.slice(1);
  const vacio = { modo: 'editor', lista: {}, libres: [], urgencias: {},
                  nombre: '', firma: '' };
  if (!hash) return vacio;

  const params = new URLSearchParams(hash);

  if (params.has('c')) {
    const bruto = params.get('c');
    return { modo: 'comprador', ...decodificar(bruto), firma: bruto };
  }
  if (params.has('l')) {
    const bruto = params.get('l');
    return { modo: 'editor', ...decodificar(bruto), firma: bruto };
  }
  return vacio;
}

/* URL absoluta para compartir */
export function enlace(lista, libres, modo = 'c', urgencias = {}, nombre = '') {
  const base = location.origin + location.pathname;
  return `${base}#${modo}=${codificar(lista, libres, urgencias, nombre)}`;
}
