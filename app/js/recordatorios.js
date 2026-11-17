/* ============================================================
   RECORDATORIOS
   ------------------------------------------------------------
   Avisos de "toca hacer la compra" a la hora y los días que
   elijas. Al tocar la notificación se abre la lista lista para
   comprar.

   LÍMITE HONESTO, y conviene entenderlo bien:

   Esto son notificaciones LOCALES, no push. No hay servidor
   detrás mandando nada. Eso significa que el aviso se programa
   mientras la app está abierta, y si el sistema descarga la
   página de memoria, el temporizador se va con ella.

   Para que no se pierda un recordatorio, al abrir la app se
   comprueba si tocaba alguno desde la última vez y se avisa
   entonces. No es tan bueno como una notificación push de
   verdad, pero funciona sin servidor.

   Para avisos garantizados haría falta un PHP en el servidor
   con Web Push y claves VAPID. Está fuera de esta versión.

   Además, en iPhone las notificaciones web solo funcionan si la
   app está AÑADIDA A LA PANTALLA DE INICIO (iOS 16.4 o
   superior). Desde Safari normal, no. En Android van siempre.
   ============================================================ */

import { nuevoId } from './util.js?v=39';
import { datos, guardar } from './almacen.js?v=39';

export const DIAS = [
  { id: 0, corto: 'D', nombre: 'Domingo' },
  { id: 1, corto: 'L', nombre: 'Lunes' },
  { id: 2, corto: 'M', nombre: 'Martes' },
  { id: 3, corto: 'X', nombre: 'Miércoles' },
  { id: 4, corto: 'J', nombre: 'Jueves' },
  { id: 5, corto: 'V', nombre: 'Viernes' },
  { id: 6, corto: 'S', nombre: 'Sábado' }
];

const oyentes = new Set();
export function suscribirRecordatorios(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
function avisar() {
  guardar();
  programar();
  oyentes.forEach(fn => fn());
}

/* ---------- soporte del dispositivo ---------- */

export function soportaNotificaciones() {
  return 'Notification' in window;
}

export function enPantallaDeInicio() {
  return window.matchMedia?.('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
}

export function estadoPermiso() {
  if (!soportaNotificaciones()) return 'no-soportado';
  return Notification.permission;      // default | granted | denied
}

/* En iPhone hay que instalar la app antes de poder pedir permiso */
export function necesitaInstalarse() {
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return esIOS && !enPantallaDeInicio();
}

export async function pedirPermiso() {
  if (!soportaNotificaciones()) return 'no-soportado';
  try { return await Notification.requestPermission(); }
  catch { return 'denied'; }
}

/* ---------- alta y baja ---------- */

export function recordatorios() {
  return datos.recordatorios || [];
}

export function crearRecordatorio({ dias, hora, minuto, texto, tipo }) {
  if (!datos.recordatorios) datos.recordatorios = [];
  const r = {
    id: nuevoId('r'),
    dias: (dias || []).filter(d => d >= 0 && d <= 6).sort(),
    hora: Math.max(0, Math.min(23, parseInt(hora, 10) || 18)),
    minuto: Math.max(0, Math.min(59, parseInt(minuto, 10) || 0)),
    texto: (texto || '').trim() || 'Toca hacer la compra',
    tipo: tipo === 'cocinar' ? 'cocinar' : 'compra',     // qué abre el aviso: la compra o «Hoy»
    activo: true,
    ultimoAviso: null
  };
  if (!r.dias.length) return { ok: false, error: 'Elige al menos un día.' };
  datos.recordatorios.push(r);
  avisar();
  return { ok: true, recordatorio: r };
}

export function editarRecordatorio(id, cambios) {
  const r = recordatorios().find(x => x.id === id);
  if (!r) return { ok: false, error: 'Ese recordatorio ya no está.' };
  Object.assign(r, cambios);
  avisar();
  return { ok: true };
}

export function borrarRecordatorio(id) {
  datos.recordatorios = recordatorios().filter(x => x.id !== id);
  avisar();
}

/* ---------- cálculo de la próxima vez ---------- */

/* Cuándo toca el siguiente aviso de un recordatorio */
export function proxima(r, desde = new Date()) {
  if (!r.activo || !r.dias.length) return null;

  for (let salto = 0; salto <= 7; salto++) {
    const d = new Date(desde);
    d.setDate(d.getDate() + salto);
    d.setHours(r.hora, r.minuto, 0, 0);
    if (!r.dias.includes(d.getDay())) continue;
    if (d > desde) return d;
  }
  return null;
}

export function textoProxima(r) {
  const p = proxima(r);
  if (!p) return 'Desactivado';

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dia = new Date(p); dia.setHours(0, 0, 0, 0);
  const salto = Math.round((dia - hoy) / 86400000);

  const hora = `${String(r.hora).padStart(2, '0')}:${String(r.minuto).padStart(2, '0')}`;
  if (salto === 0) return `Hoy a las ${hora}`;
  if (salto === 1) return `Mañana a las ${hora}`;
  return `${DIAS[p.getDay()].nombre} a las ${hora}`;
}

export function textoDias(r) {
  if (r.dias.length === 7) return 'Todos los días';
  if (r.dias.length === 5 && r.dias.every(d => d >= 1 && d <= 5)) return 'De lunes a viernes';
  if (r.dias.length === 2 && r.dias.includes(0) && r.dias.includes(6)) return 'Fines de semana';
  return r.dias.map(d => DIAS[d].nombre.slice(0, 3)).join(', ');
}

/* ---------- disparo ---------- */

let temporizadores = [];

function lanzar(r) {
  if (estadoPermiso() !== 'granted') return;

  const cocinar = r.tipo === 'cocinar';
  const opciones = {
    body: cocinar ? 'Abre Tasty y mira qué toca cocinar.' : 'Abre la lista y ve directo a comprar.',
    icon: 'iconos/app-192.png',
    badge: 'iconos/app-192.png',
    tag: 'compra-' + r.id,
    /* La etiqueta evita que se apilen diez avisos iguales */
    renotify: true,
    data: { abrir: cocinar ? 'hoy' : 'comprador' }
  };

  try {
    /* Con service worker la notificación sobrevive aunque la
       pestaña se cierre justo después */
    navigator.serviceWorker?.ready
      .then(reg => reg.showNotification(r.texto, opciones))
      .catch(() => new Notification(r.texto, opciones));
  } catch {
    try { new Notification(r.texto, opciones); } catch { /* nada */ }
  }

  r.ultimoAviso = new Date().toISOString();
  guardar();
}

/* Programa los avisos de las próximas horas mientras la app
   siga viva. setTimeout no aguanta más de 24 días, y de todas
   formas no tiene sentido programar tan lejos. */
export function programar() {
  for (const t of temporizadores) clearTimeout(t);
  temporizadores = [];

  if (estadoPermiso() !== 'granted') return;

  const ahora = new Date();
  for (const r of recordatorios()) {
    const p = proxima(r, ahora);
    if (!p) continue;
    const espera = p - ahora;
    if (espera > 0 && espera < 26 * 3600 * 1000) {
      temporizadores.push(setTimeout(() => { lanzar(r); programar(); }, espera));
    }
  }
}

/* Al abrir la app se mira si tocó algún aviso mientras estaba
   cerrada. Es la red de seguridad de las notificaciones
   locales. Solo se recupera si fue en las últimas seis horas:
   avisar de una compra de anteayer no sirve de nada. */
export function avisosPerdidos() {
  const perdidos = [];
  const ahora = new Date();

  for (const r of recordatorios()) {
    if (!r.activo || !r.dias.length) continue;

    /* Última vez que debió sonar */
    let debio = null;
    for (let salto = 0; salto <= 7; salto++) {
      const d = new Date(ahora);
      d.setDate(d.getDate() - salto);
      d.setHours(r.hora, r.minuto, 0, 0);
      if (!r.dias.includes(d.getDay())) continue;
      if (d <= ahora) { debio = d; break; }
    }
    if (!debio) continue;

    const horas = (ahora - debio) / 3600000;
    if (horas > 6) continue;
    if (r.ultimoAviso && new Date(r.ultimoAviso) >= debio) continue;

    perdidos.push({ recordatorio: r, cuando: debio });
    r.ultimoAviso = ahora.toISOString();
  }

  if (perdidos.length) guardar();
  return perdidos;
}
