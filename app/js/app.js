/* ============================================================
   APP — arranque y navegación
   ------------------------------------------------------------
   Hay dos mundos que no se mezclan:

   EDITOR      grid, resumen, ajustes. Es tu app.
   COMPRADOR   checklist y ticket. Es la de quien va al súper.

   Se entra en comprador por un enlace #c=... o porque hay una
   compra a medias guardada. Se sale al cerrar el ticket.
   ============================================================ */

import { estado, suscribir, totalArticulos, cargarLista, vaciar,
         fijarVista, seleccionados } from './estado.js?v=22';
import { compraActual, crearCompra, descartarCompra,
         suscribirCompra } from './compra.js?v=22';
import { suscribirPrecios, cuantosPreciosHay, aprenderDeTicket }
  from './precios.js?v=22';
import { CATALOGO_VERSION } from '../datos/catalogo.js?v=22';
import { leerHash, enlace, codificar } from './url.js?v=22';
import { vigilarIconos } from './iconos.js?v=22';
import { iniciarTema, fijarTema, temaActual, TEMAS, fijarAcentoTienda } from './tema.js?v=22';
import { iniciarGrid, pintarGrid, fijarBusqueda } from './ui/grid.js?v=22';
import { iniciarResumen, pintarResumen } from './ui/resumen.js?v=22';
import { iniciarComprador, pintarComprador, pintarTicket,
         fijarTicketVisible } from './ui/comprador.js?v=22';
import { iniciarFicha, cerrarFicha } from './ui/ficha.js?v=22';
import { iniciarGastos, pintarGastos, reiniciarGastos } from './ui/gastos.js?v=22';
import { iniciarAdmin, pintarAdmin, reiniciarAdmin } from './ui/admin.js?v=22';
import { iniciarPanelPrecios, pintarPanel, reiniciarPanelPrecios }
  from './ui/precios-panel.js?v=22';
import { iniciarVistaTiendas, pintarTiendas, reiniciarTiendas }
  from './ui/tiendas.js?v=22';
import { suscribirTiendas, TIENDAS, TIENDA_POR_ID } from './tiendas.js?v=22';
import { abrirEdicionTicket } from './ui/gastos.js?v=22';
import { iniciarImportar, pintarImportar, reiniciarImportar }
  from './ui/importar.js?v=22';
import { iniciarRecordatorios, pintarRecordatorios, reiniciarRecordatorios }
  from './ui/recordatorios.js?v=22';
import { programar, avisosPerdidos, recordatorios, estadoPermiso }
  from './recordatorios.js?v=22';
import { suscribirReposicion, limpiarUrgenciasHuerfanas, sugerencias }
  from './reposicion.js?v=22';
import { iniciarVistaListas, pintarListas, reiniciarListas }
  from './ui/listas.js?v=22';
import { listaActiva, listas, cambiarA, otrasConCosas, suscribirListas }
  from './listas.js?v=22';
import { iniciarCesta, pintarCesta, reiniciarCesta } from './ui/cesta.js?v=22';
import { iniciarDieta, pintarDieta, reiniciarDieta } from './ui/dieta.js?v=22';
import { suscribirRecetas, resumenDieta } from './recetas.js?v=22';
import { copiaTexto, csvTickets, csvPrecios, descargar, nombreArchivo,
         validarCopia, fusionar, limpiarTodo, cuantoHay, suscribirDatos }
  from './datos-io.js?v=22';
import { suscribirCatalogo, estadoCatalogo } from './catalogo-edit.js?v=22';
import { suscribirGastos, ticketPorId, resumenGasto,
         pendientesSugeridos } from './gastos.js?v=22';
import { iniciarAjustesGemini, pintarBloqueGemini } from './ui/escaner.js?v=22';
import { $, euros, tap } from './util.js?v=22';

/* Sello de versión. Lo cambia versionar.py junto con las rutas,
   así que ver aquí un número viejo significa que el navegador está
   usando archivos antiguos. */
export const VERSION_APP = '22';

let vistaActual = 'grid';
let modo = 'editor';

/* ---------- navegación ---------- */

/* En el supermercado, la app toma el color de la tienda elegida:
   solo cambia el acento, el resto del sistema visual no se toca. */
function aplicarTemaTienda() {
  const c = vistaActual === 'comprador' ? compraActual() : null;
  fijarAcentoTienda(c?.tienda ? TIENDA_POR_ID[c.tienda]?.color : null);
}

function ir(vista) {
  vistaActual = vista;
  aplicarTemaTienda();
  cerrarFicha();

  for (const nodo of document.querySelectorAll('.vista')) {
    nodo.hidden = nodo.dataset.vista !== vista;
  }
  for (const btn of document.querySelectorAll('.nav-btn')) {
    btn.dataset.ir === vista
      ? btn.setAttribute('aria-current', 'page')
      : btn.removeAttribute('aria-current');
  }

  $('#herramientas').hidden = vista !== 'grid';
  $('#cmp-pie').hidden = vista !== 'comprador';

  const titulos = {
    grid: 'Tasty', resumen: 'Resumen', gastos: 'Gastos',
    ajustes: 'Ajustes', admin: 'Catálogo', precios: 'Precios',
    tiendas: 'Supermercados', importar: 'Importar',
    recordatorios: 'Recordatorios', listas: 'Listas',
    cesta: 'Dónde comprar', dieta: 'Dieta',
    comprador: 'En el supermercado', ticket: 'Ticket'
  };
  pintarBarra(vista, titulos[vista] || '');

  const nodo = document.querySelector(`.vista[data-vista="${vista}"]`);
  if (nodo) nodo.scrollTop = 0;

  if (vista === 'resumen')   pintarResumen();
  if (vista === 'gastos')    pintarGastos();
  if (vista === 'ajustes')   pintarAjustes();
  if (vista === 'admin')     pintarAdmin();
  if (vista === 'precios')   pintarPanel();
  if (vista === 'tiendas')   pintarTiendas();
  if (vista === 'importar')  pintarImportar();
  if (vista === 'recordatorios') pintarRecordatorios();
  if (vista === 'listas')        pintarListas();
  if (vista === 'cesta')         pintarCesta();
  if (vista === 'dieta')         pintarDieta();
  if (vista === 'comprador') pintarComprador();
  if (vista === 'ticket')    pintarTicket($('#v-ticket'));

  /* Salir cancela cualquier borrador a medias */
  if (vista !== 'gastos') reiniciarGastos();
  if (vista !== 'admin')   reiniciarAdmin();
  if (vista !== 'precios') reiniciarPanelPrecios();
  if (vista !== 'tiendas')  reiniciarTiendas();
  if (vista !== 'importar')      reiniciarImportar();
  if (vista !== 'recordatorios') reiniciarRecordatorios();
  if (vista !== 'listas')        reiniciarListas();
  if (vista !== 'cesta')         reiniciarCesta();
  if (vista !== 'dieta')         reiniciarDieta();
}

document.addEventListener('ir', e => ir(e.detail));

/* En el grid y el resumen la barra enseña qué lista es y deja
   saltar a otra; en el resto, el título de la pantalla */
function pintarBarra(vista, titulo) {
  const nodo = $('#titulo-barra');
  const enLista = vista === 'grid' || vista === 'resumen';

  if (!enLista || modo === 'comprador') {
    nodo.innerHTML = titulo;
    nodo.removeAttribute('data-lista');
    return;
  }

  const l = listaActiva();
  const varias = listas().length > 1;
  nodo.dataset.lista = 'true';
  nodo.innerHTML = `
    <button class="barra-lista" id="barra-listas"
            aria-label="Cambiar de lista">
      <i aria-hidden="true">${l.emoji}</i>
      <span>${l.nombre}</span>
      ${varias ? '<b aria-hidden="true">▾</b>' : ''}
    </button>`;
}

/* ---------- aviso flotante ---------- */

let avisoTimer;
function aviso(texto) {
  const nodo = $('#aviso');
  nodo.textContent = texto;
  nodo.hidden = false;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => { nodo.hidden = true; }, 2400);
}
document.addEventListener('aviso', e => aviso(e.detail));

/* ---------- aviso con un botón ---------- */

let accionTimer, accionPendiente = null;

function avisoConAccion({ texto, accion, alHacer }) {
  const nodo = $('#aviso-accion');
  accionPendiente = alHacer;
  nodo.innerHTML = `
    <span>${texto}</span>
    <button data-hacer>${accion}</button>
    <button class="aviso-x" data-cerrar aria-label="Cerrar">×</button>`;
  nodo.hidden = false;
  clearTimeout(accionTimer);
  accionTimer = setTimeout(cerrarAccion, 7000);
}

function cerrarAccion() {
  $('#aviso-accion').hidden = true;
  accionPendiente = null;
}

$('#aviso-accion').addEventListener('click', e => {
  if (e.target.closest('[data-hacer]')) {
    const fn = accionPendiente;
    cerrarAccion();
    fn?.();
    return;
  }
  if (e.target.closest('[data-cerrar]')) cerrarAccion();
});

document.addEventListener('abrir-aviso-accion', e => avisoConAccion(e.detail));

/* ---------- hoja inferior ---------- */

function abrirHoja(titulo, opciones) {
  $('#hoja-titulo').textContent = titulo;
  $('#hoja-cuerpo').innerHTML = opciones.map((o, i) => `
    <button class="hoja-opcion ${o.peligro ? 'peligro' : ''}" data-op="${i}">
      <span>${o.texto}${o.nota ? `<small>${o.nota}</small>` : ''}</span>
    </button>`).join('');

  $('#hoja-cuerpo').onclick = e => {
    const btn = e.target.closest('[data-op]');
    if (!btn) return;
    cerrarHoja();
    opciones[Number(btn.dataset.op)].accion?.();
  };
  $('#hoja-fondo').hidden = false;
}

function cerrarHoja() { $('#hoja-fondo').hidden = true; }

$('#hoja-fondo').addEventListener('click', e => {
  if (e.target.id === 'hoja-fondo') cerrarHoja();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') cerrarHoja();
});
document.addEventListener('abrir-hoja', e =>
  abrirHoja(e.detail.titulo, e.detail.opciones));

/* ---------- portapapeles ---------- */

async function copiar(texto, mensaje) {
  try {
    await navigator.clipboard.writeText(texto);
    aviso(mensaje);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    aviso(mensaje);
  }
}
document.addEventListener('copiar', e => copiar(e.detail.texto, e.detail.mensaje));

document.addEventListener('descargar-archivo', e => {
  descargar(e.detail.nombre, e.detail.contenido);
  aviso('Archivo descargado');
});

/* ---------- compartir la lista ---------- */

function textoPlano() {
  const lineas = seleccionados().map(({ producto, cantidad }) =>
    `· ${producto.n}${cantidad > 1 ? ` ×${cantidad}` : ''}`);
  for (const l of estado.libres) lineas.push(`· ${l}`);
  return `LISTA DE COMPRA\n\n${lineas.join('\n')}`;
}

function abrirCompartir() {
  if (!totalArticulos()) { aviso('La lista está vacía'); return; }

  const nombre = listaActiva()?.nombre || '';
  const paraComprar = enlace(estado.lista, estado.libres, 'c', estado.urgencia, nombre);
  const paraEditar  = enlace(estado.lista, estado.libres, 'l', estado.urgencia, nombre);
  const opciones = [];

  if (navigator.share) {
    opciones.push({
      texto: 'Enviar para que la compren',
      nota: 'Se abre en modo supermercado, con checklist',
      accion: () => navigator.share({
        title: 'Tasty',
        text: 'Esto es lo que hay que comprar:',
        url: paraComprar
      }).catch(() => {})
    });
  }

  opciones.push(
    { texto: 'Copiar enlace de compra',
      nota: 'Checklist, precios y ticket al terminar',
      accion: () => copiar(paraComprar, 'Enlace copiado') },
    { texto: 'Copiar enlace editable',
      nota: 'Abre la lista para seguir modificándola',
      accion: () => copiar(paraEditar, 'Enlace copiado') },
    { texto: 'Copiar como texto',
      nota: 'Lista escrita, sin enlace',
      accion: () => copiar(textoPlano(), 'Texto copiado') },
    { texto: 'Vaciar la lista', peligro: true,
      accion: () => { vaciar(); aviso('Lista vaciada'); ir('grid'); } }
  );

  abrirHoja('Compartir', opciones);
}

document.addEventListener('abrir-compartir', abrirCompartir);

/* ---------- compartir el ticket ---------- */

document.addEventListener('compartir-ticket', e => {
  const { texto, json } = e.detail;
  const opciones = [];

  if (navigator.share) {
    opciones.push({
      texto: 'Enviar el ticket',
      nota: 'Se abre el menú del móvil',
      accion: () => navigator.share({ title: 'Ticket de compra', text: texto })
        .catch(() => {})
    });
  }
  opciones.push(
    { texto: 'Copiar como texto',
      nota: 'Legible, para mandar por mensaje',
      accion: () => copiar(texto, 'Ticket copiado') },
    { texto: 'Copiar datos para la app',
      nota: 'Para pegarlo en el control de gastos',
      accion: () => copiar(json, 'Datos copiados') }
  );

  abrirHoja('Enviar ticket', opciones);
});

/* ---------- entrar y salir del modo comprador ---------- */

function entrarComprador() {
  modo = 'comprador';
  document.body.dataset.modo = 'comprador';
  ir('comprador');
}

function salirComprador() {
  modo = 'editor';
  delete document.body.dataset.modo;
  ir('grid');
}

document.addEventListener('salir-comprador', salirComprador);

/* "Ver lista para comprar": entra en modo comprador con la lista
   actual, sin tener que abrir un enlace. Útil cuando el que va a
   comprar eres tú mismo. */
document.addEventListener('ver-como-comprador', () => {
  if (!totalArticulos()) { aviso('La lista está vacía'); return; }

  const firma = codificar(estado.lista, estado.libres, estado.urgencia);
  const enCurso = compraActual();

  if (enCurso && enCurso.firma === firma) { entrarComprador(); return; }

  if (enCurso) {
    abrirHoja('Tienes una compra a medias', [
      { texto: 'Empezar con la lista de ahora',
        nota: 'Se descarta lo marcado en la anterior',
        peligro: true,
        accion: () => {
          crearCompra(estado.lista, estado.libres, firma,
                      estado.urgencia, listaActiva()?.nombre || '');
          entrarComprador();
        } },
      { texto: 'Seguir con la que tenía',
        accion: () => entrarComprador() }
    ]);
    return;
  }

  crearCompra(estado.lista, estado.libres, firma,
              estado.urgencia, listaActiva()?.nombre || '');
  entrarComprador();
});

document.addEventListener('editar-ticket', e => {
  ir('gastos');
  if (!abrirEdicionTicket(e.detail)) aviso('Esa compra ya no está');
});

document.addEventListener('ver-ticket', e => {
  const t = ticketPorId(e.detail);
  if (!t) return;
  fijarTicketVisible(t);
  ir('ticket');
});

/* ---------- ajustes ---------- */

function pintarAjustes() {
  const cat = estadoCatalogo();

  $('#v-ajustes').innerHTML = `
    <div class="res-cab">
      <h1>Ajustes</h1>
      <p>Versión ${VERSION_APP}</p>
    </div>

    <div class="aj-bloque">
      <h2>Versión</h2>
      <div class="aj-dato"><span>App</span><span>v${VERSION_APP}</span></div>
      <div class="aj-dato"><span>Datos</span><span>esquema ${estado.schema}</span></div>
      <div class="aj-dato"><span>Catálogo</span><span>v${CATALOGO_VERSION}</span></div>
      <p class="ga-nota">Si aquí no pone la versión que acabas de subir, el
      navegador sigue usando archivos antiguos. Abre
      <code>reset.html</code> que está en la misma carpeta.</p>
    </div>

    <div class="aj-bloque">
      <h2>Aspecto</h2>
      <div class="cmp-tiendas" role="group" aria-label="Tema">
        ${TEMAS.map(t => `
          <button data-set-tema="${t.id}"
                  aria-pressed="${temaActual() === t.id}">${t.nombre}</button>`).join('')}
      </div>
    </div>


    <div class="aj-bloque" id="aj-gemini"></div>

    <div class="aj-bloque">
      <h2>Catálogo</h2>
      <button class="btn-secundario" id="aj-admin"
              style="margin-bottom:0.5px">Editar catálogo${
        cat.sinCambios ? '' : ` · ${cat.nuevos + cat.editados} sin consolidar`}</button>
      <button class="btn-secundario" id="aj-precios"
              style="margin-bottom:0.5px">Gestionar precios</button>
      <button class="btn-secundario" id="aj-tiendas"
              style="margin-bottom:0.5px">Supermercados · ${
        TIENDAS.filter(t => t.activa).length}</button>
      <button class="btn-secundario" id="aj-recordatorios"
              style="margin-bottom:0.5px">Recordatorios${
        recordatorios().length ? ` · ${recordatorios().filter(r => r.activo).length}` : ''}</button>
      <button class="btn-secundario" id="aj-dieta"
              style="margin-bottom:1rem">Dieta y recetas${
        resumenDieta().faltan ? ` · faltan ${resumenDieta().faltan}` : ''}</button>
      <p class="ga-nota" style="padding-top:0">También está en su pestaña, abajo.</p>
      <div class="aj-dato"><span>Productos activos</span><span>${cat.activos}</span></div>
      <div class="aj-dato"><span>Añadidos por ti</span><span>${cat.nuevos}</span></div>
      <div class="aj-dato"><span>Versión del catálogo</span><span>v${CATALOGO_VERSION}</span></div>
      <div class="aj-dato"><span>Precios guardados</span><span>${cuantosPreciosHay()}</span></div>
      <div class="aj-dato"><span>Compras registradas</span><span>${resumenGasto().historico}</span></div>
      <div class="aj-dato"><span>En la lista ahora</span><span>${totalArticulos()}</span></div>
    </div>

    <div class="aj-bloque">
      <h2>Tus datos</h2>
      <p>Los tickets, los precios y todo lo que has añadido viven en este
      dispositivo. Exporta de vez en cuando: es la única copia que hay.</p>
      <button class="btn-secundario" id="aj-exportar"
              style="margin:1rem 0 0.5px">Exportar todo</button>
      <button class="btn-secundario" id="aj-csv"
              style="margin-bottom:0.5px">Descargar en Excel o CSV</button>
      <button class="btn-secundario" id="aj-importar"
              style="margin-bottom:0.5px">Importar y fusionar</button>
      <button class="btn-secundario aj-peligro" id="aj-limpiar">Borrar todo</button>
    </div>

    <div class="aj-bloque">
      <h2>Si algo va raro</h2>
      <p>Si la app deja de responder o se queda con una versión antigua,
      esto borra la caché del navegador y vuelve a descargarlo todo. <b>No
      toca tus datos</b>: las compras, los precios y las listas se quedan.</p>
      <button class="btn-secundario" id="aj-reparar"
              style="margin-top:1rem">Borrar caché y recargar</button>
    </div>

    <div class="aj-bloque">
      <h2>Iconos</h2>
      <p>Sube el SVG a <code>iconos/[categoría]/</code> con el nombre del
      producto en minúsculas, sin acentos y con guion bajo en los espacios.
      Desde el editor de catálogo puedes comprobar cuáles faltan.</p>
    </div>`;
  pintarBloqueGemini();
}

$('#v-ajustes').addEventListener('click', e => {
  if (e.target.closest('#aj-admin'))   { tap(); ir('admin');   return; }
  if (e.target.closest('#aj-precios')) { tap(); ir('precios'); return; }
  if (e.target.closest('#aj-tiendas')) { tap(); ir('tiendas'); return; }
  if (e.target.closest('#aj-recordatorios')) { tap(); ir('recordatorios'); return; }
  if (e.target.closest('#aj-dieta')) { tap(); ir('dieta'); return; }
  if (e.target.closest('#aj-exportar')) { exportarTodo(); return; }
  if (e.target.closest('#aj-csv'))      { menuCSV(); return; }
  if (e.target.closest('#aj-importar')) { ir('importar'); return; }
  if (e.target.closest('#aj-limpiar'))  { confirmarBorrado(); return; }
  if (e.target.closest('#aj-reparar'))  { repararCache(); return; }

  const t = e.target.closest('[data-set-tema]');
  if (t) { tap(); fijarTema(t.dataset.setTema); pintarAjustes(); return; }

});

/* ---------- copia de datos ---------- */

function exportarTodo() {
  const texto = copiaTexto();
  abrirHoja('Exportar todo', [
    { texto: 'Descargar archivo',
      nota: `${cuantoHay().tickets} compras · ${cuantoHay().precios} precios`,
      accion: () => {
        descargar(nombreArchivo('json'), texto);
        aviso('Archivo descargado');
      } },
    { texto: 'Copiar al portapapeles',
      nota: 'Para pegarlo en otro dispositivo',
      accion: () => copiar(texto, 'Copia hecha') }
  ]);
}

function menuCSV() {
  abrirHoja('Descargar tabla', [
    { texto: 'Compras y productos',
      nota: 'Una fila por producto comprado, con fecha y tienda',
      accion: () => {
        descargar(nombreArchivo('csv').replace('.csv', '-compras.csv'),
                  csvTickets(), 'text/csv');
        aviso('Tabla descargada');
      } },
    { texto: 'Precios por supermercado',
      nota: 'Toda la base de precios',
      accion: () => {
        descargar(nombreArchivo('csv').replace('.csv', '-precios.csv'),
                  csvPrecios(), 'text/csv');
        aviso('Tabla descargada');
      } }
  ]);
}

/* Nunca se ofrece borrar sin poner delante el botón de exportar */
function confirmarBorrado() {
  const hay = cuantoHay();

  abrirHoja('Antes de borrar', [
    { texto: 'Exportar primero',
      nota: `${hay.tickets} compras y ${euros(hay.gasto)} de historial`,
      accion: () => {
        descargar(nombreArchivo('json'), copiaTexto());
        aviso('Exportado · ahora ya puedes borrar');
      } },
    { texto: 'Borrar todo sin exportar',
      nota: 'No hay vuelta atrás',
      peligro: true,
      accion: () => segundaConfirmacion(hay) }
  ]);
}

function segundaConfirmacion(hay) {
  abrirHoja('¿Seguro?', [
    { texto: 'Sí, borrar definitivamente',
      nota: `Se pierden ${hay.tickets} compras, ${hay.precios} precios, ` +
            `${hay.productos} productos y ${hay.tiendas} tiendas tuyas`,
      peligro: true,
      accion: () => limpiarTodo() },
    { texto: 'Cancelar' }
  ]);
}

/* Borra la caché y el service worker sin tocar los datos del
   usuario, que viven en otro sitio */
async function repararCache() {
  aviso('Limpiando…');
  try {
    if (window.caches) {
      const claves = await caches.keys();
      await Promise.all(claves.map(k => caches.delete(k)));
    }
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch (e) {
    console.warn('No se pudo limpiar del todo', e);
  }
  location.reload();
}

/* ---------- enganches del shell ---------- */

$('.nav').addEventListener('click', e => {
  const btn = e.target.closest('.nav-btn');
  if (!btn) return;
  tap();

  /* Tocar la pestaña en la que ya estás vuelve al principio de
     esa sección, como en cualquier app. Si no, quedarse dentro
     de una subpantalla obliga a buscar el botón de volver. */
  if (btn.dataset.ir === vistaActual) {
    reiniciarDieta();
    reiniciarGastos();
    reiniciarAdmin();
  }
  ir(btn.dataset.ir);
});

$('#buscar').addEventListener('input', e => fijarBusqueda(e.target.value));
$('#limpiar').addEventListener('click', () => { fijarBusqueda(''); $('#buscar').focus(); });

$('.conmutador').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (btn) { tap(); fijarVista(btn.dataset.vistaGrid); }
});

$('#titulo-barra').addEventListener('click', e => {
  if (e.target.closest('#barra-listas')) { tap(); menuListas(); }
});

/* Salto rápido entre listas, con lo que tiene cada una */
function menuListas() {
  const activa = listaActiva();
  const opciones = listas().map(l => ({
    texto: `${l.emoji} ${l.nombre}${l.id === activa.id ? ' ·' : ''}`,
    nota: l.id === activa.id
      ? 'Es la que estás usando'
      : `${cuantosEn(l)} ${cuantosEn(l) === 1 ? 'cosa' : 'cosas'}`,
    accion: () => {
      if (cambiarA(l.id)) { refrescar(); ir('grid'); aviso(`En «${l.nombre}»`); }
    }
  }));

  opciones.push({
    texto: 'Gestionar listas',
    nota: 'Crear, renombrar, vaciar o borrar',
    accion: () => ir('listas')
  });

  abrirHoja('Tus listas', opciones);
}

function cuantosEn(l) {
  const productos = Object.values(l.lista || {}).reduce((a, b) => a + b, 0);
  return productos + (l.libres?.length || 0);
}

$('#menu').addEventListener('click', () => {
  if (modo === 'comprador') {
    abrirHoja('Opciones', [
      { texto: 'Abandonar la compra',
        nota: 'Se pierde lo marcado hasta ahora',
        peligro: true,
        accion: () => {
          descartarCompra(); salirComprador(); aviso('Compra descartada');
        } },
      { texto: 'Seguir comprando' }
    ]);
  } else {
    abrirCompartir();
  }
});

/* ---------- redibujado ---------- */

function refrescar() {
  limpiarUrgenciasHuerfanas();
  const total = totalArticulos();
  const cont = $('#contador');
  cont.textContent = total;
  cont.dataset.vacio = total === 0;

  for (const btn of document.querySelectorAll('.conmutador button')) {
    btn.setAttribute('aria-pressed', btn.dataset.vistaGrid === estado.ajustes.vista);
  }

  marcarDieta();
  if (modo === 'comprador') return;
  pintarGrid();
  if (vistaActual === 'resumen') pintarResumen();
  if (vistaActual === 'ajustes') pintarAjustes();
}

suscribir(refrescar);
suscribirCompra(() => { aplicarTemaTienda(); if (vistaActual === 'comprador') pintarComprador(); });

/* Un precio nuevo cambia el presupuesto del resumen y la
   agrupación por tienda, así que hay que repintar */
suscribirRecetas(() => {
  marcarDieta();
  if (vistaActual === 'dieta')   pintarDieta();
  if (vistaActual === 'ajustes') pintarAjustes();
});

/* Punto naranja en la pestaña de Dieta cuando falta algo por
   comprar para las recetas activas */
function marcarDieta() {
  const punto = document.getElementById('punto-dieta');
  if (punto) punto.hidden = resumenDieta().faltan === 0;
}

suscribirListas(() => {
  if (vistaActual === 'listas') pintarListas();
  refrescar();
});

suscribirReposicion(() => {
  if (vistaActual === 'grid')    pintarGrid();
  if (vistaActual === 'resumen') pintarResumen();
});

suscribirDatos(() => {
  refrescar();
  if (vistaActual === 'importar') pintarImportar();
});

suscribirTiendas(() => {
  if (vistaActual === 'tiendas')  pintarTiendas();
  if (vistaActual === 'ajustes')  pintarAjustes();
  if (vistaActual === 'precios')  pintarPanel();
});

suscribirPrecios(() => {
  if (vistaActual === 'resumen')   pintarResumen();
  if (vistaActual === 'ajustes')   pintarAjustes();
  if (vistaActual === 'comprador') pintarComprador();
  if (vistaActual === 'cesta')     pintarCesta();
});

/* Editar el catálogo cambia el grid, el resumen y los ajustes */
suscribirCatalogo(() => {
  if (vistaActual === 'admin')   pintarAdmin();
  if (vistaActual === 'ajustes') pintarAjustes();
  if (vistaActual === 'grid')    pintarGrid();
  if (vistaActual === 'resumen') pintarResumen();
});

suscribirGastos(() => {
  marcarPendientes();
  if (vistaActual === 'gastos')  pintarGastos();
  if (vistaActual === 'ajustes') pintarAjustes();
});

/* Punto naranja en la pestaña de Gastos cuando hay productos
   repitiéndose sin catalogar */
function marcarPendientes() {
  const btn = document.querySelector('[data-ir="gastos"] .nav-punto');
  if (btn) btn.hidden = pendientesSugeridos().length === 0;
}

/* ---------- arranque ---------- */

function arrancar() {
  iniciarTema();
  vigilarIconos(document);
  iniciarGrid($('#v-grid'));
  iniciarResumen($('#v-resumen'));
  iniciarComprador($('#v-comprador'), $('#cmp-pie'));
  iniciarFicha($('#ficha-fondo'), $('#ficha-cuerpo'));
  iniciarGastos($('#v-gastos'));
  iniciarAdmin($('#v-admin'));
  iniciarPanelPrecios($('#v-precios'));
  iniciarVistaTiendas($('#v-tiendas'));
  iniciarImportar($('#v-importar'));
  iniciarAjustesGemini();

  /* Pide al navegador que no borre los datos si el móvil se queda sin
     espacio (en la PWA instalada suele concederlo sin preguntar). */
  try { navigator.storage?.persist?.(); } catch { /* sin soporte */ }
  document.addEventListener('ir-vista', e => ir(e.detail));
  iniciarRecordatorios($('#v-recordatorios'));
  iniciarVistaListas($('#v-listas'));
  iniciarCesta($('#v-cesta'));
  iniciarDieta($('#v-dieta'));

  const url = leerHash();
  const traeAlgo = Object.keys(url.lista).length || url.libres.length;
  const enCurso = compraActual();

  /* CASO 1 · llega un enlace para ir a comprar */
  if (url.modo === 'comprador' && traeAlgo) {
    history.replaceState(null, '', location.pathname);

    if (enCurso && enCurso.firma === url.firma) {
      /* El mismo enlace otra vez: se retoma donde estaba */
      refrescar();
      entrarComprador();
      aviso('Compra retomada');
      return;
    }

    if (enCurso) {
      /* Enlace distinto con una compra a medias. Nunca se tira
         el progreso sin preguntar. */
      refrescar();
      entrarComprador();
      abrirHoja('Ha llegado otra lista', [
        { texto: 'Empezar la lista nueva',
          nota: 'Se descarta lo marcado en la anterior',
          peligro: true,
          accion: () => {
            crearCompra(url.lista, url.libres, url.firma,
                        url.urgencias, url.nombre);
            pintarComprador();
            aviso('Lista nueva cargada');
          } },
        { texto: 'Seguir con la que tenía a medias' }
      ]);
      return;
    }

    crearCompra(url.lista, url.libres, url.firma, url.urgencias, url.nombre);
    refrescar();
    entrarComprador();
    aviso('Lista recibida');
    return;
  }

  /* CASO 2 · sin enlace pero con una compra sin terminar.
     Es cerrar la app en mitad del súper y volver a abrirla. */
  if (!traeAlgo && enCurso) {
    refrescar();
    entrarComprador();
    return;
  }

  /* CASO 3 · llega una lista para editar */
  if (traeAlgo) {
    const descartados = cargarLista(url.lista, url.libres);
    if (Object.keys(url.urgencias || {}).length) {
      estado.urgencia = { ...estado.urgencia, ...url.urgencias };
    }
    history.replaceState(null, '', location.pathname);
    refrescar();
    ir('resumen');
    aviso(descartados
      ? `Lista recibida · ${descartados} sin reconocer`
      : 'Lista recibida');
    return;
  }

  /* CASO 4 · arranque normal */
  refrescar();
  marcarPendientes();
  marcarDieta();
  ir('grid');
  revisarRecordatorios();
}

/* ---------- recordatorios ---------- */

function revisarRecordatorios() {
  if (estadoPermiso() !== 'granted') return;

  programar();

  /* Red de seguridad de las notificaciones locales: si el móvil
     descargó la app justo cuando tocaba el aviso, se recupera al
     volver a abrirla. */
  const perdidos = avisosPerdidos();
  if (!perdidos.length) return;

  const r = perdidos[0].recordatorio;
  abrirHoja(r.texto, [
    { texto: 'Ir a comprar',
      nota: `${totalArticulos()} cosas en la lista`,
      accion: () => document.dispatchEvent(new CustomEvent('ver-como-comprador')) },
    { texto: 'Ver la lista primero', accion: () => ir('resumen') },
    { texto: 'Ahora no' }
  ]);
}

/* El service worker avisa cuando se toca una notificación */
navigator.serviceWorker?.addEventListener?.('message', e => {
  if (e.data?.tipo === 'abrir-comprador') {
    document.dispatchEvent(new CustomEvent('ver-como-comprador'));
  }
});

arrancar();

/* Le dice a la red de seguridad del <head> que todo ha ido bien */
window.dispatchEvent(new Event('lista-lista'));

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
