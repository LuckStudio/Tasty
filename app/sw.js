/* ============================================================
   SERVICE WORKER
   ------------------------------------------------------------
   Sirve para que la app abra sin conexión. Estrategia "red
   primero": si hay internet siempre ves la última versión, y si
   no la hay tira de lo guardado.

   DOS REGLAS QUE NO SE PUEDEN ROMPER, aprendidas a base de
   romperlas:

   1. SOLO SE GUARDA LO QUE VIENE BIEN.
      Guardar una respuesta 404 es guardar una página de error
      con el nombre de un archivo de verdad. A partir de ahí la
      app queda rota para siempre, aunque el archivo se suba
      después.

   2. EL RESPALDO EN index.html ES SOLO PARA NAVEGACIONES.
      Devolver index.html cuando falla un .js le da al navegador
      HTML donde espera un módulo. Lo rechaza, y con él muere
      todo el JavaScript: la página se ve pero no responde a
      nada.

   IMPORTANTE: al subir cambios sube el número de VERSION. Así
   se borra la caché vieja y todos ven lo nuevo.
   ============================================================ */

const VERSION = 'compra-v27';

const ESENCIALES = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(ESENCIALES))
      .catch(() => {})            /* si algo falla, se instala igual */
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(
        claves.filter(k => k !== VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ¿Merece la pena guardar esta respuesta? */
function guardable(res) {
  return res
    && res.ok                     /* nada de 404, 500 ni redirecciones raras */
    && res.status === 200
    && res.type === 'basic';      /* solo lo servido por nuestro propio dominio */
}

self.addEventListener('fetch', e => {
  const req = e.request;

  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  /* El propio service worker nunca se cachea: si se congelase,
     no habría forma de publicar una versión nueva */
  if (req.url.includes('sw.js')) return;

  const esNavegacion = req.mode === 'navigate'
    || (req.headers.get('accept') || '').includes('text/html');

  e.respondWith(
    fetch(req)
      .then(res => {
        if (guardable(res)) {
          const copia = res.clone();
          caches.open(VERSION).then(c => c.put(req, copia)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const guardado = await caches.match(req);
        if (guardado) return guardado;

        /* Solo una navegación puede recibir index.html de
           respaldo. Un script o una hoja de estilos prefiere
           fallar limpiamente a recibir HTML. */
        if (esNavegacion) {
          const inicio = await caches.match('./index.html');
          if (inicio) return inicio;
        }
        return Response.error();
      })
  );
});

/* ------------------------------------------------------------
   NOTIFICACIONES
   Al tocar el aviso se abre la app directamente en modo
   comprador. Si ya estaba abierta en una pestaña, se trae al
   frente en vez de abrir otra. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const destino = new URL('./', self.location).href;

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(lista => {
        for (const c of lista) {
          if (c.url.includes(self.registration.scope)) {
            c.postMessage({ tipo: 'abrir-comprador' });
            return c.focus();
          }
        }
        return self.clients.openWindow(destino);
      })
  );
});

/* La app puede pedir un borrado completo de la caché */
self.addEventListener('message', e => {
  if (e.data?.tipo === 'limpiar-cache') {
    e.waitUntil(
      caches.keys().then(k => Promise.all(k.map(x => caches.delete(x))))
    );
  }
});
