/* ============================================================
   VISTA RECORDATORIOS
   ============================================================ */

import { DIAS, recordatorios, crearRecordatorio, editarRecordatorio,
         borrarRecordatorio, textoProxima, textoDias, estadoPermiso,
         pedirPermiso, necesitaInstalarse, enPantallaDeInicio,
         soportaNotificaciones } from '../recordatorios.js?v=21';
import { $, tap } from '../util.js?v=21';

let raiz;
let editando = null;              // id, 'nuevo' o null
let diasElegidos = [1, 4];        // lunes y jueves por defecto

export function reiniciarRecordatorios() { editando = null; }

function aviso(t) {
  document.dispatchEvent(new CustomEvent('aviso', { detail: t }));
}

export function iniciarRecordatorios(nodo) {
  raiz = nodo;

  raiz.addEventListener('click', async e => {
    const t = e.target;

    if (t.closest('#rc-volver')) {
      if (editando) { editando = null; pintarRecordatorios(); }
      else document.dispatchEvent(new CustomEvent('ir', { detail: 'ajustes' }));
      return;
    }

    if (t.closest('#rc-permiso')) {
      const r = await pedirPermiso();
      aviso(r === 'granted' ? 'Notificaciones activadas'
          : r === 'denied' ? 'Las has bloqueado en el navegador'
          : 'Sin cambios');
      pintarRecordatorios();
      return;
    }

    if (t.closest('#rc-nuevo')) {
      editando = 'nuevo'; diasElegidos = [1, 4]; pintarRecordatorios(); return;
    }

    const abrir = t.closest('[data-rc-editar]');
    if (abrir) {
      tap();
      editando = abrir.dataset.rcEditar;
      diasElegidos = [...(recordatorios().find(r => r.id === editando)?.dias || [])];
      pintarRecordatorios();
      return;
    }

    const dia = t.closest('[data-rc-dia]');
    if (dia) {
      tap();
      const n = +dia.dataset.rcDia;
      diasElegidos = diasElegidos.includes(n)
        ? diasElegidos.filter(x => x !== n)
        : [...diasElegidos, n].sort();
      pintarRecordatorios();
      return;
    }

    const alt = t.closest('[data-rc-activo]');
    if (alt) {
      tap();
      const r = recordatorios().find(x => x.id === alt.dataset.rcActivo);
      editarRecordatorio(r.id, { activo: !r.activo });
      pintarRecordatorios();
      return;
    }

    if (t.closest('#rc-guardar')) { guardar(); return; }
    if (t.closest('#rc-borrar')) {
      borrarRecordatorio(editando);
      editando = null;
      aviso('Recordatorio borrado');
      pintarRecordatorios();
      return;
    }
    if (t.closest('#rc-probar')) { probar(); return; }
  });
}

function guardar() {
  const hora = $('#rc-hora', raiz)?.value || '18:00';
  const [h, m] = hora.split(':');
  const texto = $('#rc-texto', raiz)?.value || '';

  if (editando === 'nuevo') {
    const r = crearRecordatorio({ dias: diasElegidos, hora: h, minuto: m, texto });
    if (!r.ok) { aviso(r.error); return; }
    aviso('Recordatorio creado');
  } else {
    if (!diasElegidos.length) { aviso('Elige al menos un día.'); return; }
    editarRecordatorio(editando, {
      dias: diasElegidos, hora: +h, minuto: +m,
      texto: texto.trim() || 'Toca hacer la compra'
    });
    aviso('Guardado');
  }
  editando = null;
  pintarRecordatorios();
}

function probar() {
  if (estadoPermiso() !== 'granted') { aviso('Activa antes las notificaciones'); return; }
  const opciones = {
    body: 'Así se verá el aviso cuando toque.',
    icon: 'iconos/app-192.png', tag: 'prueba'
  };
  navigator.serviceWorker?.ready
    .then(reg => reg.showNotification('Toca hacer la compra', opciones))
    .catch(() => new Notification('Toca hacer la compra', opciones));
}

/* ---------- pintado ---------- */

export function pintarRecordatorios() {
  if (!raiz) return;
  if (editando) return pintarEditor();

  const lista = recordatorios();
  const permiso = estadoPermiso();

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>Recordatorios</h1>
      <p>${lista.length ? `${lista.length} programado${lista.length === 1 ? '' : 's'}`
                        : 'Sin avisos todavía'}</p>
    </div>

    ${bloquePermiso(permiso)}

    ${permiso === 'granted' ? `
      <div class="ga-acciones">
        <button class="btn-principal" id="rc-nuevo">Nuevo recordatorio</button>
      </div>` : ''}

    ${lista.length ? `
      <div class="aj-bloque">
        ${lista.map(r => `
          <div class="rc-fila" data-off="${!r.activo}">
            <button class="rc-n" data-rc-editar="${r.id}">
              ${r.texto}
              <em>${textoDias(r)} · ${String(r.hora).padStart(2, '0')}:${
                String(r.minuto).padStart(2, '0')}</em>
              <i>${r.activo ? textoProxima(r) : 'Pausado'}</i>
            </button>
            <button class="rc-off" data-rc-activo="${r.id}"
                    aria-label="${r.activo ? 'Pausar' : 'Activar'}">
              ${r.activo ? '||' : '▶'}
            </button>
          </div>`).join('')}
      </div>` : ''}

    <div class="aj-bloque">
      <h2>Cómo funciona</h2>
      <p>Al tocar el aviso se abre la lista directamente en modo compra,
      lista para ir tachando.</p>
      <p class="ga-nota">Son avisos locales, sin servidor detrás. Se
      programan mientras la app sigue en memoria y, si el móvil la
      descarga, al volver a abrirla se recupera el aviso que tocaba en
      las últimas seis horas. Para avisos garantizados haría falta
      añadir notificaciones push desde el servidor.</p>
    </div>

    ${permiso === 'granted' ? `
      <div class="res-acciones">
        <button class="btn-secundario" id="rc-probar">Ver cómo se verá</button>
      </div>` : ''}

    <div class="res-acciones">
      <button class="btn-secundario" id="rc-volver">Volver a ajustes</button>
    </div>`;
}

function bloquePermiso(permiso) {
  if (permiso === 'granted') return '';

  if (!soportaNotificaciones()) {
    return `<div class="aj-bloque"><p>Este navegador no admite
      notificaciones. Prueba desde Chrome en Android o añadiendo la app
      a la pantalla de inicio en iPhone.</p></div>`;
  }

  if (necesitaInstalarse()) {
    return `
      <div class="ga-aviso">
        <b>Antes hay que instalar la app</b>
        <p>En iPhone las notificaciones web solo funcionan si la app está
        añadida a la pantalla de inicio. Dale a Compartir, luego a
        <b>Añadir a pantalla de inicio</b>, y vuelve aquí desde el icono.</p>
      </div>`;
  }

  if (permiso === 'denied') {
    return `
      <div class="ga-aviso">
        <b>Están bloqueadas</b>
        <p>Las notificaciones se bloquearon para esta página. Hay que
        volver a permitirlas desde los ajustes del navegador; desde aquí
        ya no se puede pedir.</p>
      </div>`;
  }

  return `
    <div class="aj-bloque">
      <p>Para avisarte hace falta tu permiso. Solo se usa para los
      recordatorios que programes tú.</p>
    </div>
    <div class="ga-acciones">
      <button class="btn-principal" id="rc-permiso">Activar notificaciones</button>
    </div>`;
}

function pintarEditor() {
  const esNuevo = editando === 'nuevo';
  const r = esNuevo
    ? { texto: '', hora: 18, minuto: 0 }
    : recordatorios().find(x => x.id === editando);
  if (!r) { editando = null; return pintarRecordatorios(); }

  const hora = `${String(r.hora).padStart(2, '0')}:${String(r.minuto).padStart(2, '0')}`;

  raiz.innerHTML = `
    <div class="res-cab">
      <h1>${esNuevo ? 'Nuevo aviso' : 'Editar aviso'}</h1>
      <p>${diasElegidos.length
        ? `${diasElegidos.length} ${diasElegidos.length === 1 ? 'día' : 'días'} a la semana`
        : 'Elige los días'}</p>
    </div>

    <div class="aj-bloque">
      <p class="fi-label">Qué días</p>
      <div class="rc-dias">
        ${DIAS.map(d => `
          <button data-rc-dia="${d.id}"
                  aria-pressed="${diasElegidos.includes(d.id)}"
                  aria-label="${d.nombre}">${d.corto}</button>`).join('')}
      </div>

      <p class="fi-label" style="margin-top:1.3rem">A qué hora</p>
      <input class="ga-fecha" id="rc-hora" type="time" value="${hora}">

      <p class="fi-label" style="margin-top:1.3rem">Texto del aviso</p>
      <input class="ga-fecha" id="rc-texto" type="text"
             value="${(r.texto || '').replace(/"/g, '&quot;')}"
             placeholder="Toca hacer la compra" autocomplete="off">
    </div>

    <div class="res-acciones">
      <button class="btn-principal" id="rc-guardar">Guardar</button>
      ${!esNuevo ? '<button class="btn-secundario" id="rc-borrar">Borrar</button>' : ''}
      <button class="btn-secundario" id="rc-volver">Cancelar</button>
    </div>`;
}
