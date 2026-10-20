// Presentación en bucle: avanza sola, con controles manuales y control remoto desde el celular.
(function () {
  var TIEMPO = 8000; // ms por diapositiva
  var slides = document.querySelectorAll('.slide');
  var contenedorPuntos = document.querySelector('.puntos');
  var barra = document.querySelector('.barra');
  var btnPlay = document.getElementById('btn-play');
  var actual = 0, timer = null;
  var reproduciendo = sessionStorage.getItem('pausa') !== '1';
  var pagina = location.pathname.split('/').pop() || 'index.html';
  var toastEl = null, toastT = null;

  slides.forEach(function (_, i) {
    var p = document.createElement('span');
    p.addEventListener('click', function () { ir(i); });
    contenedorPuntos.appendChild(p);
  });
  var puntos = contenedorPuntos.children;
  var dos = function (n) { return (n < 10 ? '0' : '') + n; };
  document.getElementById('cont-t').textContent = '/ ' + dos(slides.length);

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
    sessionStorage.setItem('pausa', valor ? '0' : '1');
    btnPlay.textContent = valor ? '⏸' : '▶';
    reiniciar();
    reiniciarBarra();
  }
  function alternar() { fijarReproduccion(!reproduciendo); }

  // ---- Aviso en pantalla ----
  function aviso(txt) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = txt;
    toastEl.classList.add('ver');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('ver'); }, 1600);
  }

  // ---- Conexión con el celular ----
  // Los comandos viajan por ntfy.sh (servicio público, HTTPS): funciona entre redes distintas sin servidor propio.
  var NTFY = 'https://ntfy.sh/';
  var CANAL_CMD = NTFY + window.SALA + '-cmd', CANAL_ESTADO = NTFY + window.SALA + '-estado';

  // El estado se publica solo al recibir un comando (no en cada avance automático) para no pasar el límite del servicio.
  function publicarEstado() {
    fetch(CANAL_ESTADO, { method: 'POST', body: JSON.stringify({ page: pagina, slide: actual + 1, total: slides.length,
      playing: reproduciendo, t: Date.now() }) }).catch(function () {});
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
        else { aviso('Abriendo...'); location.href = c.file; return; }
        break;
    }
    document.getElementById('luz').classList.add('on');
    document.getElementById('remoto-txt').textContent = 'Celular conectado';
    publicarEstado();
  }
  document.getElementById('remoto-url').textContent =
    new URL('control.html', location.href).href.replace(/^https?:\/\//, '');

  if (window.EventSource && window.SALA) {
    var visto = {};
    var es = new EventSource(CANAL_CMD + '/sse');
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

  // ---- Controles locales ----
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
})();
