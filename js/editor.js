// Editor de contenido: guarda en este navegador y permite exportar content.json para publicar.
(function () {
  var datos = null;
  var sel = { tipo: 'portada', i: 0 };
  var guardarT = null, prevT = null, avisoT = null;
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function aviso(txt) {
    var a = $('aviso');
    a.textContent = txt;
    a.classList.add('ver');
    clearTimeout(avisoT);
    avisoT = setTimeout(function () { a.classList.remove('ver'); }, 2200);
  }

  // ---- Guardado automático + vista previa ----
  function cambio() {
    $('guardado').className = 'guardado';
    $('guardado').textContent = 'Guardando…';
    clearTimeout(guardarT);
    guardarT = setTimeout(function () {
      var ok = Contenido.guardarLocal(datos);
      $('guardado').className = 'guardado' + (ok ? '' : ' error');
      $('guardado').textContent = ok ? 'Guardado en este navegador ✓' : 'No se pudo guardar (¿memoria llena?)';
    }, 250);
    clearTimeout(prevT);
    prevT = setTimeout(recargarPrevia, 700);
  }
  function urlPrevia() {
    return sel.tipo === 'tema' ? 'tema.html?t=' + (sel.i + 1) + '&preview=1' : 'index.html?preview=1';
  }
  function recargarPrevia() {
    var f = $('prev');
    var actual = f.getAttribute('data-url');
    if (actual === urlPrevia()) { try { f.contentWindow.location.reload(); return; } catch (e) {} }
    f.setAttribute('data-url', urlPrevia());
    f.src = urlPrevia();
  }

  // ---- Piezas de formulario ----
  function campo(etiqueta, valor, alCambiar, opc) {
    opc = opc || {};
    var l = el('label', 'campo');
    l.appendChild(el('span', null, etiqueta));
    var i = opc.largo ? el('textarea') : el('input');
    if (!opc.largo) i.type = 'text';
    if (opc.filas) i.rows = opc.filas;
    i.value = valor;
    i.addEventListener('input', function () { alCambiar(i.value); cambio(); });
    l.appendChild(i);
    if (opc.ayuda) l.appendChild(el('small', null, opc.ayuda));
    return l;
  }
  function boton(txt, fn, cls) {
    var b = el('button', 'btn ' + (cls || ''), txt);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }
  function mover(arr, i, d) {
    var j = i + d;
    if (j < 0 || j >= arr.length) return false;
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    return true;
  }

  // Reduce la imagen elegida a ~1000px para que entre en el JSON.
  function imagenADataUrl(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1000 / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = function () { aviso('No se pudo leer la imagen'); };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  // ---- Barra lateral ----
  function dibujarLado() {
    var lado = $('lado');
    lado.textContent = '';
    function item(txt, tipo, i) {
      var b = el('button', sel.tipo === tipo && sel.i === (i || 0) ? 'sel' : '', txt);
      b.addEventListener('click', function () { sel = { tipo: tipo, i: i || 0 }; dibujar(); recargarPrevia(); });
      lado.appendChild(b);
    }
    lado.appendChild(el('h3', null, 'Inicio'));
    item('Portada', 'portada');
    item('Integrantes', 'integrantes');
    item('Cierre', 'cierre');
    lado.appendChild(el('h3', null, 'Temas'));
    datos.temas.forEach(function (t, i) { item((i + 1) + '. ' + t.nombre, 'tema', i); });
    var nuevo = el('button', 'nuevo', '+ Agregar tema');
    nuevo.addEventListener('click', function () {
      datos.temas.push({ nombre: 'Tema ' + (datos.temas.length + 1), titulo: '', descripcion: '', diapositivas: [] });
      sel = { tipo: 'tema', i: datos.temas.length - 1 };
      cambio(); dibujar(); recargarPrevia();
    });
    lado.appendChild(nuevo);

    var ay = el('details', 'ayuda');
    ay.appendChild(el('summary', null, 'Cómo publicar los cambios'));
    var ol = el('ol');
    ['Tus cambios se guardan solos, pero solo en este navegador.',
     'Tocá «Descargar content.json».',
     'Reemplazá el content.json del repositorio de GitHub con ese archivo y hacé commit.',
     'Vercel se actualiza solo y lo ve todo el grupo.'].forEach(function (t) { ol.appendChild(el('li', null, t)); });
    ay.appendChild(ol);
    lado.appendChild(ay);
  }

  // ---- Formularios ----
  function formPortada(f) {
    f.appendChild(el('h1', null, 'Portada'));
    f.appendChild(el('p', 'nota', 'Primera diapositiva. Con Enter en el título podés hacer un salto de línea.'));
    f.appendChild(campo('Título', datos.portada.titulo, function (v) { datos.portada.titulo = v; }, { largo: true, filas: 2 }));
    f.appendChild(campo('Subtítulo', datos.portada.subtitulo, function (v) { datos.portada.subtitulo = v; }));
  }
  function formCierre(f) {
    f.appendChild(el('h1', null, 'Cierre'));
    f.appendChild(el('p', 'nota', 'Última diapositiva de la página de inicio.'));
    f.appendChild(campo('Título', datos.cierre.titulo, function (v) { datos.cierre.titulo = v; }));
    f.appendChild(campo('Texto', datos.cierre.texto, function (v) { datos.cierre.texto = v; }, { largo: true }));
  }
  function formIntegrantes(f) {
    f.appendChild(el('h1', null, 'Integrantes'));
    f.appendChild(el('p', 'nota', 'Aparecen en la segunda diapositiva del inicio.'));
    datos.integrantes.forEach(function (n, i) {
      var fila = el('div', 'fila');
      var inp = el('input');
      inp.type = 'text'; inp.value = n;
      inp.addEventListener('input', function () { datos.integrantes[i] = inp.value; cambio(); });
      fila.appendChild(inp);
      fila.appendChild(boton('▲', function () { if (mover(datos.integrantes, i, -1)) { cambio(); dibujar(); } }, 'chico'));
      fila.appendChild(boton('▼', function () { if (mover(datos.integrantes, i, 1)) { cambio(); dibujar(); } }, 'chico'));
      fila.appendChild(boton('✕', function () { datos.integrantes.splice(i, 1); cambio(); dibujar(); }, 'chico peligro'));
      f.appendChild(fila);
    });
    f.appendChild(boton('+ Agregar integrante', function () { datos.integrantes.push(''); cambio(); dibujar(); }));
  }

  function tarjetaDiap(t, d, k) {
    var c = el('div', 'diap');
    var cab = el('div', 'diap-cab');
    cab.appendChild(el('b', null, 'Diapositiva ' + (k + 1)));
    cab.appendChild(boton('▲', function () { if (mover(t.diapositivas, k, -1)) { cambio(); dibujar(); } }, 'chico'));
    cab.appendChild(boton('▼', function () { if (mover(t.diapositivas, k, 1)) { cambio(); dibujar(); } }, 'chico'));
    cab.appendChild(boton('✕', function () {
      if (confirm('¿Eliminar esta diapositiva?')) { t.diapositivas.splice(k, 1); cambio(); dibujar(); }
    }, 'chico peligro'));
    c.appendChild(cab);

    c.appendChild(campo('Título', d.titulo, function (v) { d.titulo = v; }));
    c.appendChild(campo('Texto', d.texto, function (v) { d.texto = v; }, { largo: true, filas: 4, ayuda: 'Cada renglón nuevo es un párrafo.' }));
    c.appendChild(campo('Lista de puntos', d.puntos.join('\n'), function (v) {
      d.puntos = v.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    }, { largo: true, filas: 4, ayuda: 'Un punto por renglón.' }));

    var l = el('label', 'campo');
    l.appendChild(el('span', null, 'Imagen'));
    var fila = el('div', 'img-fila');
    var inp = el('input');
    inp.type = 'text'; inp.placeholder = 'https://… (link de una imagen)'; inp.value = d.imagen.indexOf('data:') === 0 ? '' : d.imagen;
    var mini = el('img', 'miniatura');
    function actualizarMini() {
      if (Contenido.imagenSegura(d.imagen)) { mini.src = d.imagen; mini.style.display = ''; } else mini.style.display = 'none';
    }
    inp.addEventListener('input', function () { d.imagen = inp.value.trim(); actualizarMini(); cambio(); });
    fila.appendChild(inp);
    fila.appendChild(boton('Subir…', function () {
      var a = $('archivo-img');
      a.value = '';
      a.onchange = function () {
        if (!a.files[0]) return;
        imagenADataUrl(a.files[0], function (url) { d.imagen = url; inp.value = ''; actualizarMini(); cambio(); aviso('Imagen cargada'); });
      };
      a.click();
    }, 'chico'));
    fila.appendChild(boton('Quitar', function () { d.imagen = ''; inp.value = ''; actualizarMini(); cambio(); }, 'chico'));
    l.appendChild(fila);
    l.appendChild(mini);
    l.appendChild(el('small', null, 'Pegá un link o subí una imagen (se reduce sola). Las subidas hacen más pesado el content.json.'));
    c.appendChild(l);
    actualizarMini();
    return c;
  }

  function formTema(f) {
    var t = datos.temas[sel.i];
    if (!t) { f.appendChild(el('h1', null, 'Elegí algo de la izquierda')); return; }
    f.appendChild(el('h1', null, 'Tema ' + (sel.i + 1)));
    var barra = el('div', 'barra-tema');
    barra.appendChild(boton('▲ Subir tema', function () {
      if (mover(datos.temas, sel.i, -1)) { sel.i--; cambio(); dibujar(); recargarPrevia(); }
    }, 'chico'));
    barra.appendChild(boton('▼ Bajar tema', function () {
      if (mover(datos.temas, sel.i, 1)) { sel.i++; cambio(); dibujar(); recargarPrevia(); }
    }, 'chico'));
    barra.appendChild(boton('✕ Eliminar tema', function () {
      if (!confirm('¿Eliminar "' + t.nombre + '" y todas sus diapositivas?')) return;
      datos.temas.splice(sel.i, 1);
      sel = datos.temas.length ? { tipo: 'tema', i: Math.max(0, sel.i - 1) } : { tipo: 'portada', i: 0 };
      cambio(); dibujar(); recargarPrevia();
    }, 'chico peligro'));
    f.appendChild(barra);

    f.appendChild(campo('Nombre en el menú y la voz', t.nombre, function (v) { t.nombre = v; dibujarLado(); },
      { ayuda: 'Es lo que dice el panel de control y lo que podés decir por voz (ej. «yacimientos»).' }));
    f.appendChild(campo('Título de la primera diapositiva', t.titulo, function (v) { t.titulo = v; }, { largo: true, filas: 2 }));
    f.appendChild(campo('Descripción breve', t.descripcion, function (v) { t.descripcion = v; }));

    t.diapositivas.forEach(function (d, k) { f.appendChild(tarjetaDiap(t, d, k)); });
    f.appendChild(boton('+ Agregar diapositiva', function () {
      t.diapositivas.push({ titulo: '', texto: '', puntos: [], imagen: '' });
      cambio(); dibujar();
      var fm = $('form'); fm.scrollTop = fm.scrollHeight;
    }));
  }

  function dibujar() {
    dibujarLado();
    var f = $('form');
    var top = f.scrollTop;
    f.textContent = '';
    if (sel.tipo === 'portada') formPortada(f);
    else if (sel.tipo === 'cierre') formCierre(f);
    else if (sel.tipo === 'integrantes') formIntegrantes(f);
    else formTema(f);
    f.scrollTop = top;
  }

  // ---- Acciones superiores ----
  $('b-descargar').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(datos, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'content.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    aviso('Descargado: subilo al repo como content.json');
  });
  $('b-copiar').addEventListener('click', function () {
    var txt = JSON.stringify(datos, null, 1);
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
      .then(function () { aviso('JSON copiado'); })
      .catch(function () { aviso('No se pudo copiar: usá Descargar'); });
  });
  $('b-importar').addEventListener('click', function () { $('archivo').value = ''; $('archivo').click(); });
  $('archivo').addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        datos = Contenido.normalizar(JSON.parse(r.result));
        sel = { tipo: 'portada', i: 0 };
        cambio(); dibujar(); recargarPrevia();
        aviso('Contenido importado');
      } catch (e) { aviso('El archivo no es un JSON válido'); }
    };
    r.readAsText(file);
  });
  $('b-restaurar').addEventListener('click', function () {
    if (!confirm('Se pierden las ediciones de este navegador y se vuelve al content.json publicado. ¿Seguir?')) return;
    Contenido.borrarLocal();
    Contenido.original(function (d) {
      datos = d;
      sel = { tipo: 'portada', i: 0 };
      $('guardado').className = 'guardado';
      $('guardado').textContent = 'Mostrando el contenido publicado';
      dibujar(); recargarPrevia();
    });
  });

  Contenido.cargar(function (d, local) {
    datos = d;
    $('guardado').textContent = local ? 'Editando copia guardada en este navegador' : 'Mostrando el contenido publicado';
    dibujar();
    recargarPrevia();
  });
})();
