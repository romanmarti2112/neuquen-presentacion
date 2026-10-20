// Control remoto: botones + comandos de voz (Web Speech API).
(function () {
  var paginas = [];
  var estado = {};
  var $ = function (id) { return document.getElementById(id); };

  // ---- Enviar comandos ----
  var NTFY = 'https://ntfy.sh/';
  var CANAL_CMD = NTFY + window.SALA + '-cmd', CANAL_ESTADO = NTFY + window.SALA + '-estado';
  var esperaT = null;

  function estadoConexion(ok, txt) {
    $('luz').className = 'luz ' + (ok ? 'on' : '');
    $('estado-txt').textContent = txt;
  }
  function enviar(cmd) {
    if (navigator.vibrate) navigator.vibrate(25);
    fetch(CANAL_CMD, { method: 'POST', body: JSON.stringify(cmd) })
      .catch(function () { estadoConexion(false, 'Sin internet'); });
    // La pantalla responde con su estado; si no lo hace, avisamos.
    clearTimeout(esperaT);
    esperaT = setTimeout(function () { estadoConexion(false, 'La pantalla no responde'); }, 6000);
  }

  // ---- Botones ----
  document.querySelectorAll('[data-cmd]').forEach(function (b) {
    b.addEventListener('click', function () { enviar({ action: b.getAttribute('data-cmd') }); });
  });

  function dibujarTemas() {
    var cont = $('temas');
    cont.innerHTML = '';
    paginas.forEach(function (p, i) {
      var b = document.createElement('button');
      b.innerHTML = '<i>' + (i < 10 ? '0' : '') + i + '</i>' + p.name;
      b.setAttribute('data-file', p.file);
      if (estado.page === p.file) b.className = 'actual';
      b.addEventListener('click', function () { enviar({ action: 'page', file: p.file }); });
      cont.appendChild(b);
    });
  }

  // ---- Estado en vivo ----
  function mostrarEstado() {
    var p = paginas.filter(function (x) { return x.file === estado.page; })[0];
    $('ahora-pag').textContent = p ? p.name : '—';
    $('ahora-sl').textContent = estado.slide ? 'Diapositiva ' + estado.slide + ' / ' + estado.total : 'Diapositiva — / —';
    $('btn-toggle').innerHTML = (estado.playing === false ? '▶' : '⏸') + '<small>' + (estado.playing === false ? 'Seguir' : 'Pausa') + '</small>';
    dibujarTemas();
  }

  var visto = {};
  var es = new EventSource(CANAL_ESTADO + '/sse');
  es.onmessage = function (e) {
    try {
      var d = JSON.parse(e.data);
      if (d.event !== 'message' || visto[d.id]) return;
      visto[d.id] = 1;
      var st = JSON.parse(d.message);
      if (Date.now() - st.t > 60000) return; // estado viejo
      clearTimeout(esperaT);
      estado = st;
      estadoConexion(true, 'Pantalla conectada');
      mostrarEstado();
    } catch (x) {}
  };
  estadoConexion(false, 'Buscando pantalla...');
  enviar({ action: 'ping' });

  fetch('paginas.json').then(function (r) { return r.json(); }).then(function (d) { paginas = d; mostrarEstado(); });

  // ---- Voz ----
  var NUM = { cero: 0, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
  function limpiar(t) {
    return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function tieneAlguna(t, lista) { return lista.some(function (w) { return (' ' + t + ' ').indexOf(' ' + w + ' ') !== -1; }); }

  // Devuelve un comando o null
  function interpretar(raw) {
    var t = limpiar(raw);
    if (!t) return null;

    // "tema 3", "ir al tema dos", "3", "capitulo tres"
    var m = t.match(/(?:tema|capitulo|punto|seccion)\s+(\d+|[a-z]+)/);
    if (m) {
      var n = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : NUM[m[1]];
      if (n !== undefined && paginas[n]) return { cmd: { action: 'page', file: paginas[n].file }, txt: paginas[n].name };
    }
    // Por nombre del tema (cuando los renombren)
    for (var i = 1; i < paginas.length; i++) {
      var nombre = limpiar(paginas[i].name);
      if (nombre.length > 3 && t.indexOf(nombre) !== -1) return { cmd: { action: 'page', file: paginas[i].file }, txt: paginas[i].name };
    }
    if (tieneAlguna(t, ['inicio', 'portada', 'principio', 'home', 'menu'])) return { cmd: { action: 'page', file: paginas[0].file }, txt: 'Inicio' };
    if (tieneAlguna(t, ['primera', 'primer', 'empezar', 'comenzar'])) return { cmd: { action: 'slide', index: 0 }, txt: 'Primera' };
    if (tieneAlguna(t, ['ultima', 'ultimo', 'final', 'cierre'])) return { cmd: { action: 'slide', index: 9999 }, txt: 'Ultima' };
    if (tieneAlguna(t, ['siguiente', 'proxima', 'proximo', 'adelante', 'avanza', 'avanzar', 'sigue', 'next'])) return { cmd: { action: 'next' }, txt: 'Siguiente' };
    if (tieneAlguna(t, ['anterior', 'atras', 'volver', 'retrocede', 'retroceder', 'previa', 'back'])) return { cmd: { action: 'prev' }, txt: 'Anterior' };
    if (tieneAlguna(t, ['pausa', 'pausar', 'pausalo', 'deten', 'detener', 'para', 'parar', 'stop', 'frena', 'quieto'])) return { cmd: { action: 'pause' }, txt: 'Pausa' };
    if (tieneAlguna(t, ['continuar', 'continua', 'seguir', 'sigamos', 'reproducir', 'reproduce', 'play', 'reanudar', 'arranca', 'inicia'])) return { cmd: { action: 'play' }, txt: 'Reproducir' };
    return null;
  }

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, activo = false;
  var btnMic = $('btn-mic');

  function mensaje(t) { $('voz-estado').textContent = t; }

  if (!SR) {
    mensaje('Este navegador no soporta voz. Usá Chrome en Android o Safari en iPhone.');
    btnMic.disabled = true;
    btnMic.style.opacity = .4;
  } else {
    rec = new SR();
    rec.lang = 'es-AR';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = function (e) {
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        var dicho = e.results[i][0].transcript;
        var r = interpretar(dicho);
        $('voz-oyo').textContent = r ? '“' + dicho.trim() + '” → ' + r.txt : '“' + dicho.trim() + '” (no entendí)';
        if (r) enviar(r.cmd);
      }
    };
    rec.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        activo = false; btnMic.classList.remove('escuchando');
        mensaje('Micrófono bloqueado: permitilo en el navegador (y abrí la página con https).');
      }
    };
    // El navegador corta el reconocimiento solo: se reinicia mientras esté activo.
    rec.onend = function () { if (activo) { try { rec.start(); } catch (x) {} } };

    btnMic.addEventListener('click', function () {
      activo = !activo;
      btnMic.classList.toggle('escuchando', activo);
      if (activo) { try { rec.start(); } catch (x) {} mensaje('Escuchando… decí un comando'); }
      else { rec.stop(); mensaje('Voz desactivada'); }
    });
  }
})();
