# Tasty · app base (antes «Lista de compra»)

Herramienta completa. Grid de productos, lista compartible, modo
comprador con checklist y ticket, precios por supermercado con
comparativa, presupuesto estimado, control de gasto, estadísticas,
editor de catálogo y modo oscuro.

---

## Comprobar qué versión está corriendo

Ajustes → arriba del todo pone **Versión N**. Si ahí no aparece la
versión que acabas de subir, el navegador sigue usando archivos
antiguos, por mucho que en el servidor estén los nuevos.

## Chrome de escritorio atascado

Si en el móvil funciona y en el ordenador no, no es el servidor:
es el Chrome del ordenador, que se ha quedado con archivos
antiguos. La forma segura de arreglarlo:

1. **F12** para abrir las herramientas de desarrollo
2. Pestaña **Application** (o *Aplicación*)
3. En la columna izquierda, **Storage** → **Clear site data**
4. Cerrar las herramientas y recargar con **Ctrl+Shift+R**

Eso borra caché, service workers y todo lo demás de golpe. Es más
contundente que "borrar el historial", que a menudo no toca ni el
service worker ni la Cache Storage.

Ojo: *Clear site data* **sí borra tus datos** de esta página. Si
tenías compras o listas en el ordenador, expórtalas antes desde
Ajustes.

## Reiniciar del todo

Abre `reset.html`, que está en la misma carpeta:

```
tudominio.com/lista/reset.html
```

Es una página independiente: un solo archivo, sin módulos, sin
caché. Funciona incluso cuando la app está completamente rota.
Borra las cachés, quita el service worker y vuelve a la app con
una URL que el navegador no puede tener guardada.

**No toca tus datos.**

## Si la app deja de responder

Síntoma: la página se ve pero no reacciona a nada, o sale un aviso
de que no ha podido arrancar.

**El aviso trae un botón de "Copiar el error".** Eso es lo primero
que hay que mirar: dice exactamente qué archivo ha fallado o qué
excepción ha saltado. Sin ese dato, todo lo demás son conjeturas.

Casi siempre es que **el navegador se ha quedado con un archivo a
medias en la caché**. Hay tres formas de arreglarlo, de menos a
más bruta:

1. Ajustes → *Borrar caché y recargar*. No toca tus datos.
2. Si ni siquiera puedes entrar en Ajustes, la propia app detecta
   el fallo y muestra un botón de reparación.
3. En el navegador: borrar datos del sitio y recargar.

**Sube siempre el `.htaccess`.** Los módulos de JavaScript solo se
ejecutan si el servidor los entrega como `text/javascript`. Si
Hostinger los sirve como texto plano, el navegador los rechaza y
pasa exactamente esto. El `.htaccess` se encarga de eso y de que
el `sw.js` no se quede cacheado.

## Instalación en Hostinger

1. Crea el subdominio (por ejemplo `compra.tudominio.com`).
2. Entra en el Administrador de archivos de hPanel.
3. Sube **el contenido** de esta carpeta a la raíz del subdominio
   (normalmente `public_html/compra/`). No subas la carpeta
   `lista` entera: sube lo que hay dentro.
4. Abre la URL en el móvil.
5. Menú del navegador → *Añadir a pantalla de inicio*.

Tiene que ir por `https://`. Es lo normal en Hostinger, pero si
lo abres desde un archivo local no funcionará: los módulos de
JavaScript necesitan un servidor real.

## Estructura

```
.htaccess           tipos MIME y caché (IMPORTANTE, ver abajo)
index.html          página única
manifest.json       datos para la pantalla de inicio
sw.js               funcionamiento sin conexión

css/base.css        colores, tipografía, tokens, temas
css/shell.css       barra superior, nav inferior, hojas
css/grid.css        botones de producto y resumen
css/comprador.css   checklist, ticket e historial
css/ficha.css       ficha de producto y presupuesto
css/gastos.css      historial, importar y editor de tickets
css/stats.css       gráficos de las estadísticas
css/admin.css       editor de catálogo
css/tiendas.css     supermercados y panel de precios
css/listas.css      listas múltiples y comprador
css/cesta.css       dónde comprar, marcas y equivalentes
css/dieta.css       recetas y comidas del día

js/app.js           arranque y navegación
js/estado.js        estado central de la lista
js/compra.js        modo comprador y tickets
js/precios.js       precios, conversión de unidades, comparativas
js/gastos.js        tickets, importación y pendientes
js/stats.js         agregados y evolución de precios
js/catalogo-edit.js catálogo editable, altas y export
js/tiendas.js       supermercados propios y colores
js/datos-io.js      exportar, importar por fusión y borrar
js/reposicion.js    periodicidad, sugerencias y urgencias
js/recordatorios.js avisos programados
js/listas.js        listas por ubicación
js/recetas.js       dieta, recetas e ingredientes
js/almacen.js       guardado en el navegador
js/tema.js          claro, oscuro o automático
js/url.js           enlaces compartibles
js/iconos.js        SVG con reserva a emoji
js/util.js          utilidades
js/ui/grid.js       vista del grid
js/ui/resumen.js    vista del resumen
js/ui/comprador.js  checklist y ticket
js/ui/ficha.js      ficha de producto con precios
js/ui/gastos.js     historial de compras y editor
js/ui/stats.js      gráficos y evolución de precio
js/ui/admin.js      editor de catálogo
js/ui/precios-panel.js  gestión rápida de precios
js/ui/tiendas.js    alta y edición de supermercados
js/ui/importar.js   fusión de copias
js/ui/recordatorios.js  avisos de compra
js/ui/listas.js     gestión de listas
js/ui/cesta.js      dónde comprar hoy
js/ui/dieta.js      recetas y qué falta
js/ui/ticket.js     render del ticket

datos/catalogo.js   los 183 productos
datos/categorias.js tipos de alimento y frecuencias
datos/tiendas.js    supermercados
datos/iconos.js     registro opcional de iconos subidos

iconos/             SVG por categoría + icono de la app
```

## Qué editar y dónde

| Quiero | Toco |
|---|---|
| Añadir o cambiar productos | `datos/catalogo.js` |
| Añadir un supermercado | `datos/tiendas.js` |
| Añadir una categoría | `datos/categorias.js` |
| Subir un icono | `iconos/<categoría>/` |
| Cambiar colores o tipografía | `css/base.css` |

## Iconos

El icono de un producto se busca en:

```
iconos/<categoría>/<nombre>.svg
```

El nombre va en minúsculas, sin acentos y con guion bajo en
lugar de espacios:

```
Tomate            →  iconos/verduras/tomate.svg
Patatas fritas    →  iconos/snacks/patatas_fritas.svg
Plátanos          →  iconos/frutas/platanos.svg
Papel higiénico   →  iconos/higiene/papel_higienico.svg
```

Si el archivo no existe se usa el emoji del producto, así que
puedes subirlos poco a poco. Tienes un ejemplo hecho en
`iconos/verduras/tomate.svg` y las instrucciones de dibujo en
`iconos/LEEME.txt`.

Los archivos `app-180.png`, `app-192.png` y `app-512.png` son el
icono de la app en la pantalla de inicio. Sustitúyelos por los
tuyos manteniendo los nombres.

## Reglas del catálogo

1. **El `id` de un producto no cambia nunca.** Los enlaces que ya
   has compartido dependen de él.
2. **Nada se borra.** Para retirar un producto ponle `a: true` y
   queda archivado, con su id reservado para siempre.
3. Un producto nuevo coge un id libre por encima del último de su
   bloque de categoría.

Si abres un enlace antiguo que contiene un producto ya archivado,
la app lo descarta e informa, en vez de mostrar algo equivocado.

## Al subir cambios

**Ejecuta esto antes de subir nada:**

```
python3 versionar.py 18
```

Pone el mismo `?v=` en todas partes: los CSS, los módulos del
`index.html` y los imports que los módulos se hacen entre sí.
También actualiza la versión del `sw.js`.

**Y comprueba antes de dejarte subir nada:** que ningún módulo
use una función sin importarla, y que todos estén precargados en
el `index.html`. Si algo falla, lo dice y no da la versión por
buena. Ese fallo —usar algo sin importarlo— no revienta hasta que
el navegador ejecuta esa línea concreta, y para entonces la app ya
está muerta sin explicación.

Ahora mismo va por la 17.

### Por qué esto importa tanto

Sin versión en las rutas, el navegador se queda con los `.js` en
su caché y no vuelve a pedirlos. Al subir una versión nueva mezcla
archivos viejos con nuevos y la app revienta con errores del tipo
*«el módulo no exporta X»*: el que exporta X es el archivo nuevo, y
el navegador está usando el viejo.

Y la versión tiene que ser **la misma en todas partes**. Si un
módulo se pide con `?v=13` desde un sitio y con `?v=12` desde
otro, el navegador lo carga **dos veces** como si fueran módulos
distintos, cada uno con su estado. Eso da fallos rarísimos. El
script se encarga de que no pase.

## Cómo se usa

### Al hacer la lista

- **Un toque** en un producto lo añade
- **Otro toque** suma una unidad más
- **Mantener pulsado** abre su ficha de precios
- El conmutador de arriba agrupa por **frecuencia** de compra o
  por **tipo** de alimento
- Los tres puntos abren compartir

### Los dos tipos de enlace

**Enlace de compra.** Abre la app en modo supermercado: checklist,
precios y ticket. Es el que se manda a quien va a comprar.

**Enlace editable.** Carga la lista para seguir tocándola. Es para
ti, o para que la otra persona añada cosas antes de salir.

### En el supermercado

- Tocar el cuadro marca el producto como cogido: se tacha pero no
  desaparece, y entonces aparece el campo de precio
- El precio es siempre opcional; lo que se deje vacío no suma
- Se pueden añadir cosas no previstas, que quedan marcadas con un
  `+` en el ticket
- Arriba se ve el progreso, abajo el total en vivo
- Al finalizar sale el ticket, con lo que no se encontró apuntado
  aparte

Si se cierra la app en mitad de la compra no se pierde nada: al
volver a abrirla se retoma donde estaba. Y si llega un enlace
distinto con una compra a medias, pregunta antes de descartarla.

### Precios

Cada producto tiene una ficha: mantén pulsado su botón en el grid,
o toca su nombre en el resumen.

Dentro se guarda un precio por cada supermercado, y siempre son
**dos cifras**:

- **lo que pagas en caja** — 1,29 € por una bolsa de 200 g, que es
  lo que sirve para calcular el presupuesto
- **el precio por unidad** — 6,45 €/kg, que es lo que sirve para
  comparar entre tiendas

La segunda no se escribe nunca: se calcula sola. Tú pones 1,29 € y
"200 g", y el €/kg aparece debajo mientras escribes.

La ficha ordena los supermercados de más barato a más caro, marca
el mejor y muestra el porcentaje de diferencia. Los precios de más
de 60 días salen atenuados con un aviso: siguen sirviendo, pero no
deben engañar.

La estrella marca dónde prefieres comprar cada producto. Cuando la
lista reparte cosas entre dos o más supermercados, tanto el resumen
como la checklist del comprador se agrupan por tienda.

**Los tickets actualizan los precios solos.** Al cerrar una compra,
lo que se pagó de verdad se guarda en la ficha de cada producto. Con
usar la app un par de veces, la base de precios se llena sola.

### Presupuesto y dónde comprar

En el resumen aparece el coste estimado de la lista, calculado con
el precio de la tienda preferida de cada producto. Debajo, la
comparativa entre supermercados.

Esa comparativa se hace sobre una **cesta común**: solo los
productos que tienen precio en todas las tiendas comparadas, y dice
siempre sobre cuántos se ha calculado. Comparar totales sin más
mentiría, porque una tienda de la que solo se conocen dos precios
parecería la más barata.

### Gastos

Cuarta pestaña. Arriba, lo gastado este mes. Debajo, todas las
compras registradas.

Un ticket entra de tres formas:

1. **Al terminar una compra** en el móvil
2. **Importándolo**: pegas el texto que te manden desde el botón
   *Copiar datos para la app*
3. **A mano**, con *Nueva compra*, para lo que compraste sin
   haber hecho lista

Al importar, lo pegado se valida y se reconstruye desde cero: **el
total se recalcula siempre a partir de las líneas**, nunca se cree
el que venga en el texto. Un ticket ya importado no entra dos
veces.

Borrar una compra no borra los precios que enseñó. Ese
conocimiento se queda.

### Por catalogar

Todo lo que se compra sin estar en el catálogo queda apuntado en
esa bandeja, con cuántas veces ha aparecido y en qué
supermercados. Se cuentan por nombre normalizado, así que "Queso
Azul" y "queso azul" son el mismo producto.

Cuando algo aparece en **tres compras o más**, sale un aviso
naranja y un punto en la pestaña de Gastos: es una señal de que
merece la pena añadirlo al catálogo de verdad. En la Fase 6 se
podrá hacer desde la propia app; por ahora quedan apuntados.

El sistema se alimenta de tu compra real, no de lo que crees que
compras.

### Estadísticas

Dentro de Gastos, botón *Ver estadísticas*. Cuatro periodos: este
mes, tres meses, doce meses y todo.

- **Cifras** — gastado, número de compras, compra media y artículos
- **Mes a mes** — seis meses en barras, con el mes en curso en
  naranja porque todavía no ha terminado
- **Por categoría** — dónde se va el dinero por tipo de alimento,
  y qué categorías no tienen ningún gasto registrado
- **Por supermercado** — el reparto entre tiendas
- **Dónde se va el dinero** — los productos que más pesan en el
  total, con cuántas veces los has comprado. Se pueden tocar para
  abrir su ficha

Nada de esto se guarda: **se recalcula sobre los tickets cada
vez**. Si borras una compra, las cifras cuadran al momento sin
dejar residuos.

### Evolución del precio de un producto

En la ficha de cualquier producto que hayas comprado alguna vez
aparece **lo que has pagado**: una línea con las últimas seis
compras, las fechas con su supermercado y, si el cambio es
apreciable, cuánto ha subido o bajado desde la primera vez.

Aquí no hizo falta guardar nada nuevo. Cada ticket ya lleva fecha,
tienda y lo pagado por cada producto, así que el histórico existía
desde el primer día: solo había que leerlo.

El gráfico es SVG dibujado a mano, sin librerías, y hereda los
colores del tema.

### Editor de catálogo

En Ajustes, botón *Editar catálogo*. Desde ahí se puede añadir
productos, editarlos, archivarlos y catalogar los pendientes.

**Los IDs siguen siendo sagrados.** Un producto nuevo coge el
primer id libre de su bloque de categoría, siempre por encima del
último usado, y nunca se reutiliza uno viejo. Cambiar un producto
de categoría no le cambia el id: el bloque solo reparte ids
nuevos, no clasifica.

Nada se borra de verdad. Un producto se archiva y su id queda
reservado. La única excepción es un producto que acabas de crear y
que todavía no ha salido en ninguna lista ni en ningún ticket: ese
se puede borrar del todo, porque nadie depende de él.

Si editas un producto del catálogo horneado se guarda solo la
diferencia. Y si acabas devolviéndolo a su valor original, la
edición desaparece sola, para que el export solo lleve cambios de
verdad.

**Cuidado al renombrar:** la ruta del icono sale del nombre, así
que cambiarlo deja huérfano el SVG que hubiera subido. El editor
enseña siempre la ruta prevista.

### Iconos: qué falta

Dentro del editor, sección *Iconos*, botón *Comprobar*. La app
pregunta al servidor por cada archivo y te dice cuáles existen y
cuáles no, con la ruta exacta de los que faltan. Se puede copiar la
lista entera para subirlos de golpe.

Tarda unos segundos porque son cientos de peticiones, por eso solo
se hace cuando lo pides.

### Qué pasa al consolidar

Cuando un producto que creaste en la app pasa al catálogo de
serie, tu dispositivo sigue teniendo su copia local con el mismo
identificador. La app lo detecta, **no lo muestra dos veces**, y
en el editor te ofrece retirar la copia sobrante. Puedes hacerlo
sin perder nada: el producto sigue ahí, ahora de serie.

Lo mismo con los precios y las tiendas preferidas: al hornearlos
en `datos/catalogo.js` dejan de estar solo en un móvil y los ve
cualquiera que abra la app.

### Exportar para regenerar el catálogo

Editor → *Copia y export* → *Copiar instantánea*.

La instantánea lleva tres cosas:

1. El **catálogo completo** tal y como debe quedar horneado, con
   ids, categorías, frecuencias, unidades, emojis, tiendas
   preferidas y precios
2. El **detalle de qué has tocado**: qué productos son nuevos, qué
   campos has editado y desde qué valor estaban antes
3. Los **pendientes**, las categorías y las tiendas

Con eso se puede comparar la base anterior con la actual sin
ambigüedad y regenerar `datos/catalogo.js`. También sirve como
copia de seguridad: *Importar instantánea* la restaura en
cualquier dispositivo.

### Supermercados propios

Ajustes → *Supermercados*. Además de los de serie se puede añadir
la frutería del barrio, la carnicería o la panadería de la
esquina. Cada sitio lleva **su color**, que aparece en el ticket,
en las listas agrupadas y en el historial.

Los sitios de serie no se borran, se desactivan: dejan de
ofrecerse pero sus tickets y precios siguen ahí. Uno propio sí se
puede borrar, pero solo si nunca se ha usado.

Los sellos de los tickets son **monogramas con el color de la
marca**, no logotipos reales: los logos de las cadenas son marcas
registradas y no pueden distribuirse dentro de la app. El
monograma cumple la misma función y además funciona igual de bien
para la frutería de tu barrio.

### Gestión rápida de precios

Ajustes → *Gestionar precios*. Eliges un supermercado y recorres
el catálogo metiendo precios en cadena. Filtros por **sin precio**,
**con precio**, **caducados** y por categoría, más buscador.

Cada precio se guarda al salir del campo, sin botón de confirmar,
y el €/kg aparece debajo mientras escribes. Pulsar Enter salta al
siguiente producto que aún no tiene precio: la idea es poder
sentarse diez minutos y dejar la base hecha.

La estrella de cada fila añade esa tienda a la preferencia del
producto sin salir del panel.

### Dónde comprar cada producto: primera opción y plan B

La preferencia ya no es un solo sitio, es una **lista ordenada**.
La primera manda para agrupar la lista y estimar el gasto; las
siguientes son adonde ir si está cerrado o no queda.

Se edita desde la ficha del producto o desde el editor de
catálogo, con flechas para reordenar.

### Elegir dónde estás comprando

En el modo comprador, al tocar el supermercado donde estás, **cada
línea coge el precio que ya conoces de esa tienda**. No adivina:
es lo que pagaste allí la última vez.

Los rellenados salen en cursiva y marcados con `~` porque son una
previsión, no un dato confirmado. Un precio escrito a mano nunca se
pisa, y en cuanto escribes uno deja de ser estimación.

Abajo hay dos cifras: **en el carro** (lo que llevas de verdad) y
**previsto al terminar** (contando lo que aún no has cogido pero
cuyo precio se conoce). La segunda desaparece cuando ya está todo.

Los precios estimados **no** se guardan en la base al cerrar el
ticket: salieron de ahí, y volver a guardarlos falsearía la fecha
del dato.

### El ticket

Lleva sello de la tienda con su color de marca, fecha con hora y
minutos, duración de la compra, forma de pago (tarjeta o metálico,
con su icono) y un código de barras.

**El código de barras es decorativo.** Se genera a partir del id
del ticket, así que el mismo ticket dibuja siempre el mismo, pero
no codifica nada real.

### Editar una compra

Desde el ticket, botón *Editar esta compra*, o desde el lápiz de
cada fila del historial. Se pueden cambiar productos, cantidades,
precios, tienda, fecha y forma de pago. El total se recalcula y los
precios vuelven a aprenderse. Queda marcada como editada.

### Tus datos: exportar, importar, borrar

Todo vive en el dispositivo, así que Ajustes tiene un bloque
dedicado:

- **Exportar todo** — archivo JSON con tickets, precios, catálogo
  propio, tiendas, pendientes y preferencias
- **Descargar en Excel o CSV** — dos tablas: una fila por producto
  comprado con fecha y tienda, y la base de precios completa. Con
  punto y coma, decimales con coma y BOM, que es lo que Excel en
  español espera
- **Importar y fusionar**
- **Borrar todo**

**Importar fusiona, no sustituye.** Lo que llega se añade; lo que
coincide se sobrescribe; lo que tenías y no viene en el archivo se
queda intacto. En los precios gana el dato más reciente, no el que
llega. Ese es el flujo pensado: el móvil acumula compras, cada
cierto tiempo se vuelca en el ordenador, y el ordenador queda como
archivo completo.

Antes de importar se ve una previa de lo que trae el archivo:
cuántas compras, de qué periodo y cuánto gasto.

**Borrar exige dos pasos y pone el export delante.** El primer
diálogo ofrece exportar antes que borrar; el segundo dice
exactamente qué se pierde.

### Historial por meses

En Gastos, las compras se agrupan por mes con su total, y los
meses antiguos vienen plegados. Una lista plana deja de servir a
los pocos meses.

### Sugeridos: reposición inteligente

Encima de todo el grid aparece una sección **Sugeridos** con lo
que toca reponer. Cada botón dice cuánto hace que lo compraste.

La periodicidad de cada producto sale de tres sitios, por este
orden:

1. **Manual** — lo que hayas fijado tú en la ficha
2. **Aprendida** — la media de días entre compras reales, sacada
   de tus tickets. Hacen falta al menos tres compras
3. **Estimada** — un valor por defecto según su frecuencia, solo
   como punto de partida

La ficha dice siempre de dónde viene el número. Una estimación
sin historial no se presenta como si fuera un dato.

Se sugiere a partir del 85% del ciclo: mejor avisar un poco antes
que quedarse sin. La × de la esquina descarta la sugerencia, pero
**el descarte caduca** —dura un tercio del ciclo del producto—
porque si no, lo que compras cada semana volvería a colarse a los
dos días.

### Urgencia: para cuándo hace falta

En el resumen, el reloj de cada línea pone una fecha límite. Lo
que vence en dos días o menos sale destacado arriba, y cada línea
lleva un filo de color según lo apurada que vaya.

**La urgencia viaja en el enlace**, así que quien reciba la lista
ve también qué corre prisa. Los enlaces antiguos sin urgencias se
siguen leyendo igual.

### Recordatorios

Ajustes → *Recordatorios*. Días de la semana, hora y texto. Al
tocar el aviso se abre la lista directamente en modo compra.

**Límite honesto:** son notificaciones locales, sin servidor
detrás. Se programan mientras la app sigue en memoria, y si el
móvil la descarga el temporizador se va con ella. Como red de
seguridad, al abrir la app se recupera el aviso que tocaba en las
últimas seis horas. Para avisos garantizados haría falta añadir
Web Push desde el servidor.

**En iPhone** las notificaciones web solo funcionan si la app está
añadida a la pantalla de inicio (iOS 16.4+). Desde Safari normal,
no. En Android van siempre. La app detecta el caso y lo explica en
lugar de fallar en silencio.

### Descuentos

Cada línea de la compra tiene, junto al precio, un campo para el
descuento. El precio que se guarda es el pagado; el descuento se
guarda **aparte**, porque si se restara del precio se perdería la
información de cuánto has ahorrado.

El ticket muestra el descuento en cada línea y un **Te has
ahorrado** antes del total. También sale en el texto compartible.

### Varias listas que no se pisan

Toca el nombre de la lista en la barra de arriba para cambiar de
una a otra, o entra en *Gestionar listas*.

Cada lista es independiente: la de casa, la del piso de la playa,
la de la oficina. Lo que pongas en una no aparece en las demás.
También se puede copiar todo de una lista a otra sin vaciar el
origen.

Por dentro, la lista que estás editando sigue viviendo donde
siempre y al cambiar se guarda una y se carga la otra. Es un
cambio de contexto, no un modelo de datos distinto por todas
partes.

**El nombre de la lista viaja en el enlace**, así que quien la
reciba sabe si es la de casa o la de la playa.

### En el supermercado

Cada línea lleva ahora **su icono**, y si tiene fecha límite se
ve el plazo con un filo de color al lado.

**Al tocar el nombre de un producto** se abre lo que hace falta
saber estando en el pasillo: cuánto cuesta aquí, cuánto sale por
kilo, si está más barato en otra tienda y cuánto, y cada cuánto
sueles comprarlo.

### Comprar en un sitio de paso

En el selector de tienda hay un **+ Otro sitio** para escribir un
lugar que no está guardado. No crea una tienda nueva: el nombre se
queda dentro de esa compra.

Como no hay tienda conocida, no se autorrellenan precios ni se
guardan comparables, pero el sitio sí aparece en el ticket, en el
historial y en las estadísticas con su nombre. Si acabas yendo a
menudo, créalo como tienda de verdad desde Ajustes.

### Supermercados favoritos

La estrella de cada tienda marca los sitios a los que **realmente
vas**. Las comparativas solo tienen en cuenta los marcados.

Comparar contra una tienda que te pilla a media hora sale barato
en la pantalla y caro en la vida. Si no marcas ninguno se comparan
todos, para no obligar a configurar nada antes de empezar.

### Dónde comprar hoy

Botón en el resumen. Responde a dos preguntas distintas porque
son dos decisiones distintas: si vas a **una sola tienda**, a
cuál; y si te da igual repartir, cuánto te ahorras y en cuántas
paradas.

**Una trampa que la pantalla evita a propósito.** Si a una tienda
le falta el precio de tres cosas y se lo rellenas con el más
barato de otra, esa tienda parece baratísima — y es justo lo que
no puedes hacer yendo a un sitio solo. Por eso se separan:

- **Tienen precio de todo** — las únicas comparables entre sí y
  las únicas que pueden recomendarse
- **Les falta algún precio** — se muestran aparte con cuántos les
  faltan, y nunca ganan

Si ninguna tienda cubre la lista entera, lo dice en vez de señalar
una a medias como si fuera la respuesta.

El veredicto va en una frase, que es lo que se lee de verdad: *"Ve
a Alcampo"* o *"Repartiendo te ahorras 1,55 €. Tú decides si vale
el rato."*

### Sustitutos más baratos

Al añadir un producto, si hay algo equivalente y **más de un 15%
más barato**, sale un aviso con un botón de *Cambiar*. Por debajo
de ese umbral no compensa cambiar de costumbre y el aviso sería
ruido.

Se comparan por precio por kilo o litro, que es lo único
comparable entre formatos distintos, y solo entre productos de la
misma unidad: un yogur por unidad no se compara con queso por
kilo.

Los candidatos salen de la misma categoría, pero desde la ficha se
pueden **enlazar equivalentes a mano** — y la relación es de ida y
vuelta. El aviso sale una sola vez, al añadirlo por primera vez.

### Marcas no negociables

En la ficha, *Exigencia de marca*: **cualquiera vale** o **marca
concreta**, con espacio para decir cuál.

Lo que se marca como estricto sale destacado en el resumen, en la
línea del comprador y al abrir su información. Es lo que evita la
llamada desde el pasillo del súper cuando compra otra persona.

### Iconos: emoji por defecto

Cada producto lleva su **emoji**. Se ve igual en todos los
móviles, no pesa nada y no hay que dibujar doscientos archivos.

Si quieres sustituir alguno por un SVG tuyo: dibújalo siguiendo
`iconos/LEEME.txt`, súbelo a `iconos/[categoría]/[nombre].svg` y
**escribe su nombre en `datos/iconos.js`**. Solo se piden al
servidor los que estén declarados ahí, así que no hay peticiones
fallidas.

### La dieta estricta viene incluida

En la pestaña Dieta, botón **Cargar la dieta estricta**: 20
recetas repartidas en las cinco comidas, con sus cantidades, sus
notas y la suplementación.

Se puede recargar cuantas veces quieras: lo que coincida en nombre
y comida se actualiza, y lo que hayas añadido tú se queda. Está en
`datos/recetas-dieta.js`, editable a mano si prefieres.

Dos recetas vienen **desactivadas** a propósito, porque no son
comidas del plan sino pautas: *Picoteo saludable* y *Si comes
fuera*. Actívalas si quieres que cuenten para la compra.

### Dieta y recetas

Tiene su propia pestaña, entre Lista y Resumen. Cinco comidas del día, y dentro dos
planes: **Dieta estricta** primero y **Recetas varias** después.

Cada receta se marca como **activa** o **inactiva**. Las activas
son las que rotas ahora y cuentan para la compra; las inactivas no
desaparecen, se quedan para consultarlas.

Los ingredientes se enlazan al catálogo, y entonces cuentan; o se
escriben como texto suelto, y entonces solo se leen al cocinar.
Cuando un producto sale en varias recetas, **las cantidades se
suman** y se dice en cuáles aparece. Si las unidades no coinciden
no se inventa una conversión: se avisa.

**Tocar una receta abre su acceso rápido**: los ingredientes con
su estado, para marcarlos uno a uno o meterlos todos de golpe. La
fila de cada receta muestra cuántos de sus ingredientes están ya
en la lista, con una barrita de progreso. El lápiz abre el editor.

**Exportar recetas** desde el botón de la pestaña. Tres formatos:
un `.json` con todo, el mismo copiado al portapapeles, o un texto
legible para mandarlo por mensaje.

Al importar, cada ingrediente **se vuelve a enlazar con el
catálogo**: primero por su identificador y, si ese id no existe en
este dispositivo, buscando su nombre. Lo que no encuentre se queda
como texto suelto y se te dice cuántos han sido. Las recetas que
coinciden en nombre y comida se actualizan en vez de duplicarse.

**Qué falta** compara lo que necesitan tus recetas activas con lo
que hay en la lista, y lo añade todo de un botón. También dice qué
podrías cocinar ya y qué te falta para cada plato.

Un límite honesto: la app **no sabe qué tienes en la despensa**.
Compara con la lista de la compra, no con tu cocina.

### Tema

En Ajustes se elige entre **el del sistema**, **claro** y
**oscuro**. Por defecto sigue al móvil. Los iconos SVG se
invierten solos para contrastar con el fondo, así que un mismo
archivo sirve para los dos temas.

## Ideas para más adelante

Nada de esto hace falta, pero es lo que tendría sentido si algún
día la herramienta se queda corta:

- **Sincronización real** con un PHP de pocas líneas en Hostinger,
  para que los tickets y los precios se compartan solos entre
  dispositivos en vez de por copia y pega
- **Subida de SVG desde la app**, que también necesita PHP
- **Presupuesto mensual** con aviso al acercarse al límite
- **Listas recurrentes** guardadas con nombre
