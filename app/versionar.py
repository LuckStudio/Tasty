#!/usr/bin/env python3
"""
============================================================
 VERSIONAR

 Pone el mismo ?v=N en TODAS las rutas del proyecto: los CSS
 y los módulos del index.html, y también los imports que los
 módulos se hacen entre sí.

 POR QUÉ ES IMPRESCINDIBLE

 Sin esto, el navegador se queda con los .js en su caché y no
 vuelve a pedirlos nunca. Al subir una versión nueva mezcla
 archivos viejos con nuevos y la app revienta con errores del
 tipo "no exporta X", porque el que exporta X es el archivo
 nuevo y el navegador está usando el viejo.

 IMPORTANTE: la versión tiene que ser LA MISMA en todas
 partes. Si un módulo se pide con ?v=13 desde un sitio y con
 ?v=12 desde otro, el navegador lo carga DOS VECES como si
 fueran módulos distintos, con estados separados. Eso da
 fallos rarísimos y difíciles de encontrar.

 USO:  python3 versionar.py 14
============================================================
"""
import re, sys, os, pathlib

version = sys.argv[1] if len(sys.argv) > 1 else '13'

def limpia(ruta):
    return re.sub(r'\?v=\d+', '', ruta)

# --- imports entre módulos ---
tocados = 0
for f in list(pathlib.Path('js').rglob('*.js')) + list(pathlib.Path('datos').glob('*.js')):
    s = original = f.read_text(encoding='utf-8')
    s = re.sub(r"(from\s+['\"])(\.[^'\"]+?\.js)(\?v=\d+)?(['\"])",
               lambda m: f"{m.group(1)}{m.group(2)}?v={version}{m.group(4)}", s)
    if s != original:
        f.write_text(s, encoding='utf-8')
        tocados += 1

# --- index.html: css, modulepreload y el script de arranque ---
p = pathlib.Path('index.html')
s = p.read_text(encoding='utf-8')
s = re.sub(r'(href="(?:css|js|datos)/[^"?]+\.(?:css|js))(\?v=\d+)?"',
           lambda m: f'{m.group(1)}?v={version}"', s)
s = re.sub(r'(src="js/app\.js)(\?v=\d+)?"', f'src="js/app.js?v={version}"', s)
p.write_text(s, encoding='utf-8')

# --- sello de versión visible en Ajustes ---
p = pathlib.Path('js/app.js')
s = p.read_text(encoding='utf-8')
s = re.sub(r"export const VERSION_APP = '\d+';",
           f"export const VERSION_APP = '{version}';", s)
p.write_text(s, encoding='utf-8')

# --- service worker ---
p = pathlib.Path('sw.js')
s = p.read_text(encoding='utf-8')
s = re.sub(r"const VERSION = 'compra-v\d+';", f"const VERSION = 'compra-v{version}';", s)

# Todo lo que la app pide al arrancar se guarda AL INSTALAR el service worker.
# Si no, solo se guardaría lo que se pida con él ya activo (desde la segunda
# visita) y quien instale la app y vaya directo al súper sin cobertura la
# encontraría a medias. La lista sale del propio index.html para que nunca
# se quede desactualizada.
html_sw = pathlib.Path('index.html').read_text(encoding='utf-8')
rutas = ['./', './index.html', './manifest.json']
for m in re.finditer(r'<link[^>]+?href="([^"]+)"[^>]*>', html_sw):
    h = m.group(1)
    if h.startswith(('http', '#', 'data:')): continue
    if re.search(r'rel="(modulepreload|stylesheet|preload|apple-touch-icon|icon|manifest)"', m.group(0)):
        rutas.append('./' + h)
m = re.search(r'<script[^>]+src="([^"]+)"', html_sw)
if m and not m.group(1).startswith('http'): rutas.append('./' + m.group(1))
for extra in ['fonts/inter.woff2', 'fonts/space-grotesk.woff2', 'fonts/jetbrains-mono.woff2', 'iconos/app-192.png', 'iconos/app-512.png', 'iconos/app.svg', 'iconos/favicon.svg']:
    if pathlib.Path(extra).exists(): rutas.append('./' + extra)
vistas, unicas = set(), []
for r in rutas:
    if r not in vistas: vistas.add(r); unicas.append(r)
bloque = 'const ESENCIALES = [\n  ' + ',\n  '.join("'" + r + "'" for r in unicas) + '\n];'
s = re.sub(r"const ESENCIALES = \[.*?\];", lambda _: bloque, s, count=1, flags=re.S)
p.write_text(s, encoding='utf-8')
print(f'Service worker: {len(unicas)} archivos guardados al instalar')

# ============================================================
#  COMPROBACIÓN
#  Un módulo que usa algo sin importarlo no da error hasta que
#  el navegador ejecuta esa línea, y para entonces la app ya
#  está muerta. Esto lo caza antes de subir nada.
# ============================================================

exportado = {}
for f in list(pathlib.Path('js').rglob('*.js')) + list(pathlib.Path('datos').glob('*.js')):
    s = f.read_text(encoding='utf-8')
    n = set(re.findall(r'export\s+(?:async\s+)?function\s+([\w$]+)', s))
    n |= set(re.findall(r'export\s+(?:const|let|var)\s+([\w$]+)', s))
    for m in re.finditer(r'export\s*\{([^}]+)\}', s):
        for x in m.group(1).split(','):
            n.add(x.strip().split(' as ')[-1].strip())
    exportado[str(f)] = n

todos = set()
for v in exportado.values():
    todos |= v

fallos = []
for f in list(pathlib.Path('js').rglob('*.js')):
    s = f.read_text(encoding='utf-8')
    limpio = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    limpio = re.sub(r'^\s*//.*$', '', limpio, flags=re.M)

    importados = set()
    for m in re.finditer(r"import\s*\{([^}]+)\}\s*from", limpio, re.S):
        for x in m.group(1).split(','):
            importados.add(x.strip().split(' as ')[-1].strip())
    locales = set(re.findall(r'(?:function|const|let|var|class)\s+([\w$]+)', limpio))

    # funciones llamadas
    usados = set(re.findall(r'(?<![\w.$])([a-zA-Z][\w$]*)\s*\(', limpio))
    # constantes en mayúsculas
    usados |= set(re.findall(r'(?<![\w.$])([A-Z][A-Z0-9_]{2,})(?![\w$])', limpio))

    for nombre in usados:
        if nombre not in todos: continue
        if nombre in importados or nombre in locales: continue
        if nombre in exportado[str(f)]: continue
        fallos.append(f'{f}: usa {nombre} sin importarlo')

# ¿Falta alguna precarga en el index?
html = pathlib.Path('index.html').read_text(encoding='utf-8')
precargas = set(re.findall(r'modulepreload" href="([^"]+)"', html))
for f in list(pathlib.Path('js').rglob('*.js')) + list(pathlib.Path('datos').glob('*.js')):
    for m in re.finditer(r"from\s+['\"](\.[^'\"?]+?\.js)(\?v=\d+)?['\"]", f.read_text(encoding='utf-8')):
        ruta = os.path.normpath(os.path.join(f.parent, m.group(1))).replace(chr(92), '/')
        if ruta + f'?v={version}' not in precargas:
            fallos.append(f'sin precargar en index.html: {ruta}')

print(f'Versión {version} aplicada · {tocados} módulos actualizados')
if fallos:
    print()
    print('PROBLEMAS ENCONTRADOS:')
    for x in sorted(set(fallos)):
        print('  ✗ ' + x)
    sys.exit(1)
print('Comprobación: todo correcto')
