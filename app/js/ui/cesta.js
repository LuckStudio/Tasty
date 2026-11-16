/* ============================================================
   VISTA CESTA · "¿dónde compro hoy?"
   ------------------------------------------------------------
   No da una respuesta única porque no hay una: depende de si
   tienes tiempo de hacer dos paradas o no. Lo que hace es poner
   las dos opciones al lado con su precio y su coste en viajes,
   y que decidas tú.
   ============================================================ */

import { estado, POR_ID } from '../estado.js?v=36';
import { cestaOptima } from '../precios.js?v=36';
import { TIENDA_POR_ID, hayFavoritas } from '../tiendas.js?v=36';
import { iconoHTML } from '../iconos.js?v=36';
import { euros, tap } from '../util.js?v=36';

let raiz;
let detalle = null;       // id de tienda cuyo desglose se ve

export function reiniciarCesta() { detalle = null; }

export function iniciarCesta(nodo) {
  raiz = nodo;

  raiz.addEventListener('click', e => {
    if (e.target.closest('#ce-volver')) {
      document.dispatchEvent(new CustomEvent('ir', { detail: 'resumen' }));
      return;
    }
    if (e.target.closest('#ce-favoritas')) {
      document.dispatchEvent(new CustomEvent('ir', { detail: 'tiendas' }));
      return;
    }
    const par = e.target.closest('[data-ce-parada]');
    if (par) {
      tap();
      const id = par.dataset.ceParada;
      detalle = detalle === id ? null : id;
      pintarCesta();
      return;
    }
  });
}

export function pintarCesta() {
  if (!raiz) return;

  const c = cestaOptima(estado.lista);

  if (!c.hay) {
    raiz.innerHTML = `
      <div class="res-cab">
        <h1>Dónde comprar</h1>
        <p>Sin precios todavía</p>
      </div>
      <div class="aj-bloque">
        <p>Para decidir dónde comprar hacen falta precios. Ve metiéndolos
        desde la ficha de cada producto o desde Ajustes → Gestionar
        precios, y esta pantalla empezará a tener sentido.</p>
        ${c.sinPrecio.length ? `<p class="ga-nota">${c.sinPrecio.length}
          ${c.sinPrecio.length === 1 ? 'producto' : 'productos'} de la lista
          sin ningún precio guardado.</p>` : ''}
      </div>
      <div class="res-acciones">
        <button class="btn-secundario" id="ce-volver">Volver al resumen</button>
      </div>`;
    return;
  }

  const unica = c.mejorUnica;
  const merece = unica && c.ahorro > 1 && c.paradas.length > 1;

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Dónde comprar</h1>
      <p>${c.productos} ${c.productos === 1 ? 'producto' : 'productos'} con precio</p>
    </div>

    <div class="ce-opciones">
      <div class="ce-opcion" data-mejor="${unica && !merece}">
        <span class="ce-tag">Una sola parada</span>
        ${unica ? `
          <div class="ce-cifra" style="--marca:${unica.color}">
            <b>${euros(unica.total)}</b>
            <span>${unica.nombre}</span>
          </div>
          <p class="ce-nota">Tiene precio de todo lo de la lista.</p>`
        : `
          <div class="ce-cifra">
            <b>—</b>
            <span>Sin datos</span>
          </div>
          <p class="ce-nota">Ninguna tienda tiene precio de todo, así que no
          se puede decir cuánto costaría ir a una sola.</p>`}
      </div>

      <div class="ce-opcion" data-mejor="${merece}">
        <span class="ce-tag">Repartiendo</span>
        <div class="ce-cifra">
          <b>${euros(c.optimo)}</b>
          <span>${c.paradas.length} ${c.paradas.length === 1 ? 'parada' : 'paradas'}</span>
        </div>
        ${merece ? `
          <p class="ce-nota">Te ahorras <b>${euros(c.ahorro)}</b>, unos
          ${euros(c.ahorroPorParada)} por cada parada de más.</p>`
        : '<p class="ce-nota">No sale a cuenta repartir: la diferencia no compensa el viaje.</p>'}
      </div>
    </div>

    ${veredicto(c, merece)}

    ${c.completas.length ? `
      <div class="aj-bloque">
        <h2>Tienen precio de todo</h2>
        ${c.completas.map((f, i) => `
          <div class="ce-fila" data-mejor="${i === 0}" style="--marca:${f.color}">
            <span>${f.nombre}<em>La lista entera</em></span>
            <b>${euros(f.total)}</b>
          </div>`).join('')}
      </div>` : ''}

    ${c.parciales.length ? `
      <div class="aj-bloque">
        <h2>Les falta algún precio</h2>
        <p class="ga-nota" style="padding-top:0;padding-bottom:0.7rem">
        Su cifra es solo de lo que sí se sabe, así que no se puede comparar
        con las de arriba: saldría barata por lo que le falta, no por barata.</p>
        ${c.parciales.map(f => `
          <div class="ce-fila" data-mejor="false" style="--marca:${f.color}">
            <span>${f.nombre}
              <em>${f.propios} de ${c.productos} · faltan ${f.faltan}</em></span>
            <b>${euros(f.total)}</b>
          </div>`).join('')}
      </div>` : ''}

    <div class="aj-bloque">
      <h2>El reparto más barato</h2>
      ${c.paradas.map(p => `
        <button class="ce-parada" data-ce-parada="${p.tienda}"
                style="--marca:${p.color}"
                aria-expanded="${detalle === p.tienda}">
          <span>${p.nombre}
            <em>${p.items.length} ${p.items.length === 1 ? 'producto' : 'productos'}</em></span>
          <b>${euros(p.total)}</b>
          <i class="seccion-flecha" aria-hidden="true"></i>
        </button>
        ${detalle === p.tienda ? `
          <div class="ce-detalle">
            ${p.items.map(it => `
              <div class="ce-item">
                <span class="res-icono">${POR_ID[it.id]
                  ? iconoHTML(POR_ID[it.id]) : ''}</span>
                <span>${POR_ID[it.id]?.n || it.id}${it.cant > 1
                  ? ` ×${it.cant}` : ''}</span>
                <b>${euros(it.precio * it.cant)}</b>
              </div>`).join('')}
          </div>` : ''}
      `).join('')}
    </div>

    ${c.sinPrecio.length ? `
      <div class="aj-bloque">
        <h2>Fuera del cálculo</h2>
        <p>${c.sinPrecio.map(id => POR_ID[id]?.n).filter(Boolean).join(', ')}.
        No hay ningún precio guardado, así que no entran en ninguna de las
        dos cifras.</p>
      </div>` : ''}

    ${!hayFavoritas() ? `
      <div class="aj-bloque">
        <h2>Solo los sitios a los que vas</h2>
        <p>Ahora se están comparando todos los supermercados. Si marcas
        cuáles son tus favoritos, el cálculo dejará de tener en cuenta
        sitios a los que no piensas ir.</p>
        <button class="btn-secundario" id="ce-favoritas"
                style="margin-top:0.9rem">Elegir favoritos</button>
      </div>` : ''}

    <div class="res-acciones">
      <button class="btn-secundario" id="ce-volver">Volver al resumen</button>
    </div>`;
}

/* La recomendación en una frase, que es lo que se lee de verdad */
function veredicto(c, merece) {
  const unica = c.mejorUnica;

  if (!unica) {
    return `
      <div class="ce-veredicto" data-repartir="true">
        <b>${c.paradas.length === 1
          ? c.paradas[0].nombre
          : `Repartiendo: ${euros(c.optimo)}`}</b>
        <p>Ninguna tienda tiene precio de toda la lista, así que no hay con
        qué comparar una parada única. Mete más precios y esta pantalla
        podrá decidir de verdad.</p>
      </div>`;
  }

  if (!merece) {
    return `
      <div class="ce-veredicto">
        <b>Ve a ${unica.nombre}</b>
        <p>Repartir la compra solo te ahorraría ${euros(c.ahorro)}. No
        compensa la vuelta de más.</p>
      </div>`;
  }

  const dos = c.paradas.slice(0, 2).map(p => p.nombre).join(' y ');

  return `
    <div class="ce-veredicto" data-repartir="true">
      <b>${c.paradas.length === 2 ? `${dos}` : `${c.paradas.length} paradas`}</b>
      <p>Repartiendo te ahorras <b>${euros(c.ahorro)}</b> frente a hacerlo
      todo en ${unica.nombre}. Tú decides si vale el rato.</p>
    </div>`;
}
