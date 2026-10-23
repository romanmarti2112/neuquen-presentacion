// Presentación en bucle dibujada desde el contenido (content.json / copia local),
// con controles manuales y control remoto desde el celular.
(function () {
  var TIEMPO = 8000; // ms por diapositiva
  var params = new URLSearchParams(location.search);
  var preview = params.has('preview'); // vista previa dentro del editor: sin conexión con el celular
  var vista = document.body.getAttribute('data-vista');
  var escenario = document.getElementById('escenario');
  var barra = document.querySelector('.barra');
  var btnPlay = document.getElementById('btn-play');
  var contenedorPuntos = document.querySelector('.puntos');
  var dos = function (n) { return (n < 10 ? '0' : '') + n; };
  if (preview) document.body.classList.add('preview');

  // Clave de la página actual, ej. "index.html" o "tema.html?t=2"
  var archivo = location.pathname.split('/').pop() || 'index.html';
  if (archivo.indexOf('.') === -1) archivo += '.html';
  var nTema = parseInt(params.get('t'), 10) || 1;
  var pagina = vista === 'tema' ? archivo + '?t=' + nTema : archivo;

  var slides = [], puntos = [], actual = 0, timer = null, toastEl = null, toastT = null;
  var reproduciendo = preview || sessionStorage.getItem('pausa') !== '1';
  var contenido = null, paginas = [];

  // ---- Utilidades para dibujar (siempre con textContent: el contenido es editable) ----
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function conSaltos(e, texto) {
    String(texto).split('\n').forEach(function (l, i) {
      if (i) e.appendChild(document.createElement('br'));
      e.appendChild(document.createTextNode(l));
    });
    return e;
  }
  function slide(n, hijos) {
    var s = el('section', 'slide');
    s.setAttribute('data-n', n);
    hijos.forEach(function (h) { s.appendChild(h); });
    escenario.appendChild(s);
  }
  function iniciales(nombre) {
    return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase();
  }

  // ---- Diapositivas ----
  function dibujarInicio(c) {
    slide('00', [el('span', 'etiqueta', 'Presentación'), conSaltos(el('h1'), c.portada.titulo),
      el('div', 'linea'), el('p', 'sub', c.portada.subtitulo)]);
    if (c.integrantes.length) {
      var ul = el('ul', 'integrantes');
      c.integrantes.forEach(function (n) {
        var li = el('li');
        li.appendChild(el('em', null, iniciales(n)));
        li.appendChild(document.createTextNode(n));
        ul.appendChild(li);
      });
      slide('01', [el('span', 'etiqueta', 'Equipo'), el('h2', null, 'Integrantes'), ul]);
    }
    if (c.temas.length) {
      var cont = el('div', 'temas');
      c.temas.forEach(function (t, i) {
        var a = el('a');
        a.href = 'tema.html?t=' + (i + 1);
        a.appendChild(el('b', null, dos(i + 1)));
        a.appendChild(el('span', null, t.nombre));
        cont.appendChild(a);
      });
      slide('02', [el('span', 'etiqueta', 'Índice'), el('h2', null, 'Temas'), cont]);
    }
    slide('03', [el('span', 'etiqueta', 'Cierre'), el('h2', null, c.cierre.titulo),
      el('div', 'linea'), el('p', 'sub', c.cierre.texto)]);
  }

  function dibujarTema(c) {
    var t = c.temas[nTema - 1];
    if (!t) {
      slide('--', [el('span', 'etiqueta', 'Tema'), el('h2', null, 'Este tema no existe'),
        el('div', 'vacio', 'Elegí un tema en el panel de control.')]);
      return;
    }
    var n = dos(nTema), et = function () { return el('span', 'etiqueta', 'Tema ' + n); };
    slide(n, [et(), conSaltos(el('h1'), t.titulo), el('div', 'linea'), el('p', 'sub', t.descripcion)]);

    t.diapositivas.forEach(function (d) {
      var hijos = [et()];
      if (d.titulo) hijos.push(el('h2', null, d.titulo));
      var texto = el('div', 'texto');
      d.texto.split(/\n+/).filter(Boolean).forEach(function (p) { texto.appendChild(el('p', 'sub', p)); });
      var puntosLista = d.puntos.filter(Boolean);
      if (puntosLista.length) {
        var ul = el('ul', 'lista');
        puntosLista.forEach(function (p) { ul.appendChild(el('li', null, p)); });
        texto.appendChild(ul);
      }
      var conImagen = Contenido.imagenSegura(d.imagen);
      if (!texto.childNodes.length && !conImagen) texto.appendChild(el('div', 'vacio', 'Contenido pendiente.'));
      var cuerpo = el('div', 'cuerpo' + (conImagen ? ' con-imagen' : ''));
      if (texto.childNodes.length) cuerpo.appendChild(texto);
      if (conImagen) {
        var fig = el('figure', 'imagen'), img = el('img');
        img.src = d.imagen; img.alt = d.titulo || ''; img.referrerPolicy = 'no-referrer';
        fig.appendChild(img);
        cuerpo.appendChild(fig);
      }
      hijos.push(cuerpo);
      slide(n, hijos);
    });
  }

  function dibujarPanel() {
    var nav = document.getElementById('nav');
    nav.textContent = '';
    paginas.forEach(function (p, i) {
      var a = el('a');
      a.href = p.file;
      if (p.file === pagina) a.className = 'actual';
      a.appendChild(el('i', null, dos(i)));
      a.appendChild(el('span', null, p.name));
      nav.appendChild(a);
    });
    if (vista === 'tema' && contenido.temas[nTema - 1]) document.title = contenido.temas[nTema - 1].nombre + ' - Cuenca Neuquina';
  }

  // ---- Reproducción ----
  function mostrar(i) {
    slides.forEach(function (s, n) {
      s.classList.toggle('activa', n === i);
      s.classList.toggle('saliendo', n < i);
      puntos[n].classList.toggle('activo', n === i);
    });
    actual = i;
    document.getElementById('cont-n').textContent = dos(i + 1);
    reiniciarBarra();
  }
  function ir(i) { mostrar((i + slides.length) % slides.length); reiniciar(); }
  function siguiente() { ir(actual + 1); }
  function anterior() { ir(actual - 1); }

  function reiniciarBarra() {
    barra.style.transition = 'none';
    barra.style.transform = 'scaleX(0)';
    if (!reproduciendo) return;
    void barra.offsetWidth;
    barra.style.transition = 'transform ' + TIEMPO + 'ms linear';
    barra.style.transform = 'scaleX(1)';
  }
  function reiniciar() {
    clearInterval(timer);
    if (reproduciendo) timer = setInterval(function () { mostrar((actual + 1) % slides.length); }, TIEMPO);
  }
  function fijarReproduccion(valor) {
    reproduciendo = valor;
    if (!preview) sessionStorage.setItem('pausa', valor ? '0' : '1');
    btnPlay.textContent = valor ? '⏸' : '▶';
    reiniciar();
    reiniciarBarra();
  }
  function alternar() { fijarReproduccion(!reproduciendo); }

  function aviso(txt) {
    if (!toastEl) { toastEl = el('div', 'toast'); document.body.appendChild(toastEl); }
    toastEl.textContent = txt;
    toastEl.classList.add('ver');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('ver'); }, 1600);
  }

  // ---- Conexión con el celular ----
  // Los comandos viajan por ntfy.sh (servicio público, HTTPS): funciona entre redes distintas sin servidor propio.
  var NTFY = 'https://ntfy.sh/';
  function publicarEstado() {
    fetch(NTFY + window.SALA + '-estado', { method: 'POST', body: JSON.stringify({
      page: pagina, slide: actual + 1, total: slides.length, playing: reproduciendo, t: Date.now(), paginas: paginas
    }) }).catch(function () {});
  }
  function comando(c) {
    switch (c.action) {
      case 'ping': break;
      case 'next': siguiente(); aviso('Siguiente ▶'); break;
      case 'prev': anterior(); aviso('◀ Anterior'); break;
      case 'play': fijarReproduccion(true); aviso('Reproduciendo'); break;
      case 'pause': fijarReproduccion(false); aviso('Pausa'); break;
      case 'toggle': alternar(); aviso(reproduciendo ? 'Reproduciendo' : 'Pausa'); break;
      case 'slide': ir(c.index >= slides.length ? slides.length - 1 : (parseInt(c.index, 10) || 0)); break;
      case 'page':
        if (c.file === pagina) { ir(0); aviso('Inicio del tema'); }
        else if (paginas.some(function (p) { return p.file === c.file; })) { aviso('Abriendo...'); location.href = c.file; return; }
        break;
    }
    document.getElementById('luz').classList.add('on');
    document.getElementById('remoto-txt').textContent = 'Celular conectado';
    publicarEstado();
  }
  function conectarCelular() {
    document.getElementById('remoto-url').textContent =
      new URL('control.html', location.href).href.replace(/^https?:\/\//, '');
    if (preview || !window.EventSource || !window.SALA) return;
    var visto = {};
    var es = new EventSource(NTFY + window.SALA + '-cmd/sse');
    es.onmessage = function (e) {
      try {
        var d = JSON.parse(e.data);
        if (d.event !== 'message' || visto[d.id]) return;
        visto[d.id] = 1;
        comando(JSON.parse(d.message));
      } catch (x) {}
    };
    publicarEstado();
  }

  // ---- Arranque ----
  function iniciar(c) {
    contenido = c;
    paginas = Contenido.paginas(c);
    if (vista === 'tema') dibujarTema(c); else dibujarInicio(c);
    dibujarPanel();

    slides = Array.prototype.slice.call(escenario.querySelectorAll('.slide'));
    slides.forEach(function (_, i) {
      var p = el('span');
      p.addEventListener('click', function () { ir(i); });
      contenedorPuntos.appendChild(p);
    });
    puntos = contenedorPuntos.children;
    document.getElementById('cont-t').textContent = '/ ' + dos(slides.length);

    document.getElementById('btn-sig').addEventListener('click', siguiente);
    document.getElementById('btn-ant').addEventListener('click', anterior);
    btnPlay.addEventListener('click', alternar);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') siguiente();
      else if (e.key === 'ArrowLeft') anterior();
      else if (e.key === ' ') { e.preventDefault(); alternar(); }
    });

    btnPlay.textContent = reproduciendo ? '⏸' : '▶';
    mostrar(0);
    reiniciar();
    conectarCelular();
  }

  Contenido.cargar(function (c) { iniciar(c); });
})();
