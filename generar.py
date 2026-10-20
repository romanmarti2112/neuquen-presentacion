# Genera las páginas HTML (pantalla) con el mismo panel y fondo animado.
# Uso: python generar.py   (editar TEMAS para renombrar los temas)
import json

TEMAS = ["Tema 1", "Tema 2", "Tema 3", "Tema 4", "Tema 5"]
INTEGRANTES = ["Navarro Kevin", "Vallejos Axel", "Suarez Nicolas", "Vargas Alexis", "Magallan Luciano"]

PAGINAS = [("index.html", "Inicio")] + [("tema-%d.html" % (i + 1), t) for i, t in enumerate(TEMAS)]

ONDA = "M0,60 C150,20 350,100 600,60 S1050,100 1200,60 C1350,20 1550,100 1800,60 S2250,100 2400,60 L2400,200 L0,200Z"
FONDO = (
    '<div class="fondo"><div class="orbe o1"></div><div class="orbe o2"></div><div class="orbe o3"></div>'
    '<div class="rejilla"></div>'
    + "".join(
        '<svg class="estrato e%d" viewBox="0 0 2400 200" preserveAspectRatio="none"><path d="%s"/></svg>' % (i, ONDA)
        for i in (1, 2, 3)
    )
    + "</div>"
)


def panel(actual):
    links = "".join(
        '<a href="%s"%s><i>%02d</i><span>%s</span></a>' % (f, ' class="actual"' if f == actual else "", n, t)
        for n, (f, t) in enumerate(PAGINAS)
    )
    return (
        '<div class="barra"></div>\n<aside class="panel">'
        '<div class="marca"><b>NEUQUÉN</b><small>Cuenca Neuquina</small></div>'
        '<h3>Panel de control</h3><nav>%s</nav>'
        '<div class="mandos"><button id="btn-ant" title="Anterior (←)">◀</button>'
        '<button id="btn-play" title="Pausa / Play (espacio)">⏸</button>'
        '<button id="btn-sig" title="Siguiente (→)">▶</button></div>'
        '<div class="puntos"></div><div class="contador"><b id="cont-n">01</b><span id="cont-t">/ 01</span></div>'
        '<div class="remoto"><span class="luz" id="luz"></span><div><strong id="remoto-txt">Esperando celular</strong>'
        '<small id="remoto-url">...</small></div></div></aside>' % links
    )


def pagina(archivo, titulo, slides):
    html = (
        '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        '<title>%s</title>\n<link rel="stylesheet" href="css/estilos.css">\n</head>\n<body>\n'
        '%s\n%s\n<main class="escenario">\n%s\n</main>\n'
        '<script src="js/config.js"></script>\n<script src="js/presentacion.js"></script>\n</body>\n</html>\n'
        % (titulo, FONDO, panel(archivo), slides)
    )
    with open(archivo, "w", encoding="utf-8") as f:
        f.write(html)


def slide(n, contenido):
    return '<section class="slide" data-n="%s">%s</section>\n' % (n, contenido)


# ---- Inicio ----
tarjetas = "".join(
    '<a href="tema-%d.html"><b>0%d</b><span>%s</span></a>' % (i + 1, i + 1, t) for i, t in enumerate(TEMAS)
)
gente = "".join(
    "<li><em>%s</em>%s</li>" % ("".join(p[0] for p in n.split()[:2]), n) for n in INTEGRANTES
)
inicio = (
    slide("00", '<span class="etiqueta">Presentación</span><h1>Cuenca <br>Neuquina</h1><div class="linea"></div><p class="sub">[Subtítulo / materia / institución]</p>')
    + slide("01", '<span class="etiqueta">Equipo</span><h2>Integrantes</h2><ul class="integrantes">%s</ul>' % gente)
    + slide("02", '<span class="etiqueta">Índice</span><h2>Temas</h2><div class="temas">%s</div>' % tarjetas)
    + slide("03", '<span class="etiqueta">Cierre</span><h2>Gracias</h2><div class="linea"></div><p class="sub">[Mensaje final / preguntas]</p>')
)
pagina("index.html", "Cuenca Neuquina", inicio)

# ---- Temas ----
for i, t in enumerate(TEMAS, 1):
    et = '<span class="etiqueta">Tema 0%d</span>' % i
    s = slide("0%d" % i, et + '<h1>[Título de %s]</h1><div class="linea"></div><p class="sub">[Descripción breve]</p>' % t)
    for sub in "ABC":
        s += slide("0%d" % i, et + '<h2>[Subtítulo %s]</h2><div class="vacio">Contenido pendiente.</div>' % sub)
    pagina("tema-%d.html" % i, "%s - Cuenca Neuquina" % t, s)

# Lista de páginas para el control del celular (botones y voz)
with open("paginas.json", "w", encoding="utf-8") as f:
    json.dump([{"file": a, "name": b} for a, b in PAGINAS], f, ensure_ascii=False, indent=1)
