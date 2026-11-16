/* ============================================================
   COLOR — contraste WCAG y acento accesible por tienda
   ------------------------------------------------------------
   Regla del sistema visual: el acento de cada tienda tiene que
   dar al menos 4,5:1 con el texto que se pone encima. Si el
   color oficial de la cadena no llega, se usa un tono más
   oscuro (tema claro, texto blanco) o más claro (tema oscuro,
   texto casi negro) de su MISMO matiz.
   Funciones puras: se prueban sin navegador.
   ============================================================ */

export function aRGB(hex) {
  const h = String(hex).replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(n)) return null;
  return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16));
}

export function aHex([r, g, b]) {
  return '#' + [r, g, b].map(v =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function luminancia(hex) {
  const rgb = aRGB(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a, b) {
  const la = luminancia(a), lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* Mezcla con negro (t>0) o con blanco (t<0): conserva el matiz */
function mezclar(hex, destino, t) {
  const c = aRGB(hex), d = aRGB(destino);
  return aHex(c.map((v, i) => v + (d[i] - v) * t));
}

/* Devuelve { acento, texto } con contraste >= minimo.
   Si el color ya sirve, se respeta tal cual. */
export function acentoAccesible(hex, oscuro = false, minimo = 4.5) {
  if (!aRGB(hex)) return null;
  const texto = oscuro ? '#0E1013' : '#FFFFFF';
  const destino = oscuro ? '#FFFFFF' : '#000000';
  let acento = aHex(aRGB(hex));
  for (let t = 0; t <= 1 && contraste(acento, texto) < minimo; t += 0.02) {
    acento = mezclar(hex, destino, t);
  }
  return { acento, texto };
}
