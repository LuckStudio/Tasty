/* ============================================================
   VISTA ESTADÍSTICAS
   ============================================================ */

import { PERIODOS, resumen, porMes, porCategoria, porTienda,
         topProductos, historialPrecio, categoriasSinDatos,
         claveMes } from '../stats.js?v=23';
import { POR_ID } from '../estado.js?v=23';
import { TIENDA_POR_ID } from '../tiendas.js?v=23';
import { iconoHTML } from '../iconos.js?v=23';
import { euros } from '../util.js?v=23';

let periodo = 'tres';

export function periodoActual() { return periodo; }
export function fijarPeriodo(p) { periodo = p; }

/* ---------- piezas ---------- */

function barrasHorizontales(filas) {
  if (!filas.length) return '';
  return filas.map(f => `
    <div class="st-fila">
      <div class="st-fila-cab">
        <span>${f.nombre}<em>${f.pct}%</em></span>
        <b>${euros(f.total)}</b>
      </div>
      <div class="st-barra"><i style="width:${Math.max(f.pct, 1)}%"></i></div>
    </div>`).join('');
}

function graficoMeses() {
  const filas = porMes(6);
  const hayAlgo = filas.some(f => f.total > 0);
  if (!hayAlgo) return '';

  const mesActual = claveMes(new Date().toISOString());

  return `
    <div class="st-meses">
      ${filas.map(f => `
        <div class="st-mes" data-actual="${f.clave === mesActual}"
             data-cero="${f.total === 0}">
          <span class="st-mes-val">${f.total ? Math.round(f.total) : ''}</span>
          <i style="height:${Math.max(f.pct, 1.5)}%"
             title="${f.nombre}: ${euros(f.total)}"></i>
          <span class="st-mes-pie">${f.nombre}</span>
        </div>`).join('')}
    </div>`;
}

/* Línea de evolución dibujada a mano en SVG: sin librerías,
   sin peso extra y hereda los colores del tema */
export function graficoLinea(puntos) {
  if (puntos.length < 2) return '';

  const W = 300, H = 60, M = 6;
  const valores = puntos.map(p => p.unitario);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;

  const coords = puntos.map((p, i) => {
    const x = M + (i / (puntos.length - 1)) * (W - M * 2);
    const y = H - M - ((p.unitario - min) / rango) * (H - M * 2);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });

  const d = coords.map((c, i) => `${i ? 'L' : 'M'}${c[0]} ${c[1]}`).join(' ');

  return `
    <div class="st-linea">
      <svg viewBox="0 0 ${W} ${H}" role="img"
           aria-label="Evolución del precio en ${puntos.length} compras">
        <path d="${d}"/>
        ${coords.map(c => `<circle cx="${c[0]}" cy="${c[1]}" r="2.5"/>`).join('')}
      </svg>
    </div>
    <div class="st-extremos">
      <span>${euros(min)}</span>
      <span>${euros(max)}</span>
    </div>`;
}

function fechaCorta(iso) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ---------- pantalla completa ---------- */

export function pintarStats(raiz) {
  const res = resumen(periodo);
  const cats = porCategoria(periodo);
  const tiendas = porTienda(periodo);
  const top = topProductos(periodo, 8);
  const sinDatos = categoriasSinDatos(periodo);

  const nombrePeriodo = PERIODOS.find(p => p.id === periodo)?.nombre || '';

  if (!res.compras) {
    raiz.innerHTML = `
      <div class="res-cab">
        <h1>Estadísticas</h1>
        <p>${nombrePeriodo}</p>
      </div>
      ${selectorPeriodo()}
      <div class="st-bloque">
        <p class="st-vacio">No hay ninguna compra registrada en este periodo.
        Las estadísticas se calculan sobre los tickets, así que aparecerán
        solas en cuanto empieces a cerrar compras.</p>
      </div>
      <div class="res-acciones">
        <button class="btn-secundario" id="st-volver">Volver a gastos</button>
      </div>`;
    return;
  }

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Estadísticas</h1>
      <p>${nombrePeriodo}</p>
    </div>

    ${selectorPeriodo()}

    <div class="st-cifras">
      <div class="st-cifra"><b>${euros(res.total)}</b><span>Gastado</span></div>
      <div class="st-cifra"><b>${res.compras}</b><span>Compras</span></div>
      <div class="st-cifra"><b>${euros(res.media)}</b><span>Compra media</span></div>
      <div class="st-cifra"><b>${res.articulos}</b><span>Artículos</span></div>
    </div>

    ${graficoMeses() ? `
      <div class="st-bloque">
        <h2>Mes a mes</h2>
        ${graficoMeses()}
      </div>` : ''}

    <div class="st-bloque">
      <h2>Por categoría</h2>
      ${cats.filas.length
        ? barrasHorizontales(cats.filas)
        : '<p class="st-vacio">Sin precios registrados en este periodo.</p>'}
      ${sinDatos.length && sinDatos.length < 12 ? `
        <p class="st-vacio" style="margin-top:1rem;font-size:0.72rem">
        Sin gasto registrado en: ${sinDatos.join(', ').toLowerCase()}.</p>` : ''}
    </div>

    <div class="st-bloque">
      <h2>Por supermercado</h2>
      ${tiendas.filas.length
        ? barrasHorizontales(tiendas.filas)
        : '<p class="st-vacio">Sin datos.</p>'}
    </div>

    <div class="st-bloque">
      <h2>Dónde se va el dinero</h2>
      ${top.map(f => `
        <button class="st-prod" ${f.id ? `data-ver-prod="${f.id}"` : ''}>
          <span class="res-icono">${f.id && POR_ID[f.id]
            ? iconoHTML(POR_ID[f.id]) : '<span aria-hidden="true">✏️</span>'}</span>
          <span class="st-prod-n">${f.nombre}
            <em>${f.veces} ${f.veces === 1 ? 'compra' : 'compras'} ·
                ${f.unidades} ${f.unidades === 1 ? 'unidad' : 'unidades'}</em></span>
          <b>${euros(f.total)}</b>
        </button>`).join('')}
    </div>

    <div class="res-acciones">
      <button class="btn-secundario" id="st-volver">Volver a gastos</button>
    </div>`;
}

function selectorPeriodo() {
  return `
    <div class="st-periodos" role="group" aria-label="Periodo">
      ${PERIODOS.map(p => `
        <button data-periodo="${p.id}"
                aria-pressed="${periodo === p.id}">${p.nombre}</button>`).join('')}
    </div>`;
}

/* ---------- histórico para la ficha de producto ---------- */

export function historialHTML(id) {
  const puntos = historialPrecio(id);
  if (!puntos.length) return '';

  const ultimos = puntos.slice(-6);

  return `
    <div class="fi-historial">
      <p class="fi-label">Lo que has pagado</p>
      ${graficoLinea(ultimos)}
      ${ultimos.slice().reverse().map(p => `
        <div class="fi-punto">
          <span>${fechaCorta(p.fecha)}${p.tienda
            ? ' · ' + (TIENDA_POR_ID[p.tienda]?.nombre || p.tienda) : ''}</span>
          <b>${euros(p.unitario)}</b>
        </div>`).join('')}
      ${puntos.variacion != null && Math.abs(puntos.variacion) >= 3 ? `
        <p class="st-variacion" data-sube="${puntos.variacion > 0}">
          Desde la primera vez que lo compraste ha
          ${puntos.variacion > 0 ? 'subido' : 'bajado'} un
          <b>${Math.abs(puntos.variacion)}%</b>.</p>` : ''}
    </div>`;
}
