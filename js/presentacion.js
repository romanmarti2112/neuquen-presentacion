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
    enviarEstado();
  }
  function ir(i) { mostrar((i + slides.length) % slides.length); reiniciar(); }
  function siguiente() { ir(actual + 1); }
  function anterior() { ir(actual - 1); }

  function reiniciarBarra() {
    barra.style.transition = 'none';
    barra.style.width = '0';
    if (!reproduciendo) return;
    void barra.offsetWidth;
    barra.style.transition = 'width ' + TIEMPO + 'ms linear';
    barra.style.width = '100%';
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
    enviarEstado();
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

  // ---- Conexión con el celular (servidor Node) ----
  var conexiones = [];
  function enviarEstado() {
    var st = { type: 'state', page: pagina, slide: actual + 1, total: slides.length, playing: reproduciendo };
    conexiones.forEach(function (c) { if (c.open) c.send(st); });
  }
  function comando(c) {
    switch (c.action) {
      case 'next': siguiente(); aviso('Siguiente ▶'); break;
      case 'prev': anterior(); aviso('◀ Anterior'); break;
      case 'play': fijarReproduccion(true); aviso('Reproduciendo'); break;
      case 'pause': fijarReproduccion(false); aviso('Pausa'); break;
      case 'toggle': alternar(); aviso(reproduciendo ? 'Reproduciendo' : 'Pausa'); break;
      case 'slide': ir(parseInt(c.index, 10) || 0); break;
      case 'page':
        if (c.file === pagina) { ir(0); aviso('Inicio del tema'); }
        else { aviso('Abriendo...'); location.href = c.file; }
        break;
    }
  }
  // La pantalla se registra en el broker público de PeerJS con un id fijo; el celular se conecta directo (WebRTC).
  function indicador() {
    var n = conexiones.filter(function (c) { return c.open; }).length;
    document.getElementById('luz').classList.toggle('on', n > 0);
    document.getElementById('remoto-txt').textContent = n > 0 ? 'Celular conectado' : 'Esperando celular';
  }
  document.getElementById('remoto-url').textContent =
    new URL('control.html', location.href).href.replace(/^https?:\/\//, '');

  function registrar() {
    if (!window.Peer || !window.SALA) return;
    var peer = new Peer(window.SALA + '-pantalla');
    peer.on('connection', function (c) {
      conexiones.push(c);
      c.on('open', function () { indicador(); c.send({ type: 'state', page: pagina, slide: actual + 1, total: slides.length, playing: reproduciendo }); });
      c.on('data', function (d) { comando(d); });
      c.on('close', function () { conexiones = conexiones.filter(function (x) { return x !== c; }); indicador(); });
    });
    // Al cambiar de página el id tarda un instante en liberarse: se reintenta.
    peer.on('error', function (e) {
      if (e.type === 'unavailable-id') { peer.destroy(); setTimeout(registrar, 1500); }
    });
    peer.on('disconnected', function () { peer.reconnect(); });
  }
  registrar();

  // ---- Controles locales ----
  document.getElementById('btn-sig').addEventListener('click', siguiente);
  document.getElementById('btn-ant').addEventListener('click', anterior);
  btnPlay.addEventListener('click', alternar);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') siguiente();
    else if (e.key === 'ArrowLeft') anterior();
    else if (e.key === ' ') { e.preventDefault(); alternar(); }
  });
  // Paralaje suave del fondo
  var orbes = document.querySelectorAll('.orbe');
  document.addEventListener('mousemove', function (e) {
    var x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    orbes.forEach(function (o, i) {
      var f = (i + 1) * 30;
      o.style.transform = 'translate(' + (-x * f) + 'px,' + (-y * f) + 'px)';
    });
  });

  btnPlay.textContent = reproduciendo ? '⏸' : '▶';
  mostrar(0);
  reiniciar();
})();
