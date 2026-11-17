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

const VERSION = 'compra-v39';

const ESENCIALES = [
  './',
  './index.html',
  './manifest.json',
  './iconos/app-180.png',
  './iconos/favicon.svg',
  './iconos/app-192.png',
  './fonts/inter.woff2',
  './fonts/space-grotesk.woff2',
  './css/base.css?v=39',
  './css/shell.css?v=39',
  './css/grid.css?v=39',
  './css/comprador.css?v=39',
  './css/ficha.css?v=39',
  './css/gastos.css?v=39',
  './css/stats.css?v=39',
  './css/admin.css?v=39',
  './css/tiendas.css?v=39',
  './css/listas.css?v=39',
  './css/cesta.css?v=39',
  './css/dieta.css?v=39',
  './css/revision.css?v=39',
  './css/historial.css?v=39',
  './css/productos.css?v=39',
  './css/ruta.css?v=39',
  './css/cocina.css?v=39',
  './css/tasty.css?v=39',
  './js/alias.js?v=39',
  './js/app.js?v=39',
  './js/almacen.js?v=39',
  './js/catalogo-edit.js?v=39',
  './js/cantidad.js?v=39',
  './js/busqueda.js?v=39',
  './js/basicos.js?v=39',
  './js/hogar.js?v=39',
  './js/cocina.js?v=39',
  './js/color.js?v=39',
  './js/compra.js?v=39',
  './js/datos-io.js?v=39',
  './js/escaner.js?v=39',
  './js/despensa.js?v=39',
  './js/estado.js?v=39',
  './js/fusion.js?v=39',
  './js/gastos.js?v=39',
  './js/gemini.js?v=39',
  './js/historial.js?v=39',
  './js/iconos.js?v=39',
  './js/listas.js?v=39',
  './js/menu.js?v=39',
  './js/precios.js?v=39',
  './js/recetas.js?v=39',
  './js/recordatorios.js?v=39',
  './js/reposicion.js?v=39',
  './js/ruta.js?v=39',
  './js/secciones.js?v=39',
  './js/unidades.js?v=39',
  './js/stats.js?v=39',
  './js/tema.js?v=39',
  './js/tiendas.js?v=39',
  './js/ui/admin.js?v=39',
  './js/ui/cesta.js?v=39',
  './js/ui/cantidad.js?v=39',
  './js/ui/bienvenida.js?v=39',
  './js/ui/comprador.js?v=39',
  './js/ui/dieta.js?v=39',
  './js/ui/despensa.js?v=39',
  './js/ui/escaner.js?v=39',
  './js/ui/ficha.js?v=39',
  './js/ui/gastos.js?v=39',
  './js/ui/historial.js?v=39',
  './js/ui/grid.js?v=39',
  './js/ui/importar.js?v=39',
  './js/ui/listas.js?v=39',
  './js/ui/productos.js?v=39',
  './js/ui/acaba.js?v=39',
  './js/ui/hoy.js?v=39',
  './js/ui/menu.js?v=39',
  './js/ui/receta.js?v=39',
  './js/ui/receta-comun.js?v=39',
  './js/ui/precios-panel.js?v=39',
  './js/ui/recordatorios.js?v=39',
  './js/ui/resumen.js?v=39',
  './js/ui/ruta.js?v=39',
  './js/ui/revision.js?v=39',
  './js/ui/stats.js?v=39',
  './js/ui/ticket.js?v=39',
  './js/ui/tienda.js?v=39',
  './js/ui/tiendas.js?v=39',
  './js/url.js?v=39',
  './js/util.js?v=39',
  './datos/catalogo.js?v=39',
  './datos/categorias.js?v=39',
  './datos/fotos-recetas.js?v=39',
  './datos/iconos.js?v=39',
  './datos/recetas-dieta.js?v=39',
  './datos/recetas-noviembre.js?v=39',
  './datos/secciones.js?v=39',
  './datos/tiendas.js?v=39',
  './fonts/jetbrains-mono.woff2',
  './iconos/app-512.png',
  './iconos/app.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      /* Uno a uno: si un archivo falla, el resto se guarda igualmente
         (con addAll, un solo fallo no guardaba nada). Solo se guarda lo
         que viene bien (regla 1). */
      .then(c => Promise.allSettled(ESENCIALES.map(url =>
        fetch(url, { cache: 'reload' }).then(res => { if (guardable(res)) return c.put(url, res); }))))
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
            c.postMessage({ tipo: e.notification.data?.abrir === 'hoy' ? 'abrir-hoy' : 'abrir-comprador' });
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
