// Acceso al contenido del sitio: content.json (original del repo) + copia local editada en este navegador.
(function () {
  var CLAVE = 'neuq-contenido-v1';

  function leerLocal() {
    try { var s = localStorage.getItem(CLAVE); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }

  // Garantiza que existan todos los campos para que el resto del código no falle.
  function normalizar(d) {
    d = d && typeof d === 'object' ? d : {};
    d.portada = d.portada || {};
    d.portada.titulo = String(d.portada.titulo || '');
    d.portada.subtitulo = String(d.portada.subtitulo || '');
    d.cierre = d.cierre || {};
    d.cierre.titulo = String(d.cierre.titulo || '');
    d.cierre.texto = String(d.cierre.texto || '');
    d.integrantes = Array.isArray(d.integrantes) ? d.integrantes.map(String) : [];
    d.temas = (Array.isArray(d.temas) ? d.temas : []).map(function (t, i) {
      t = t || {};
      return {
        nombre: String(t.nombre || 'Tema ' + (i + 1)),
        titulo: String(t.titulo || ''),
        descripcion: String(t.descripcion || ''),
        diapositivas: (Array.isArray(t.diapositivas) ? t.diapositivas : []).map(function (s) {
          s = s || {};
          return {
            titulo: String(s.titulo || ''),
            texto: String(s.texto || ''),
            puntos: Array.isArray(s.puntos) ? s.puntos.map(String) : [],
            imagen: String(s.imagen || '')
          };
        })
      };
    });
    return d;
  }

  function original(cb) {
    fetch('content.json?v=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) { cb(normalizar(d)); })
      .catch(function () { cb(normalizar({})); });
  }

  window.Contenido = {
    normalizar: normalizar,
    hayLocal: function () { return leerLocal() !== null; },
    original: original,
    // Devuelve la copia local si existe; si no, el content.json del sitio.
    cargar: function (cb) {
      var local = leerLocal();
      if (local) return cb(normalizar(local), true);
      original(function (d) { cb(d, false); });
    },
    guardarLocal: function (d) {
      try { localStorage.setItem(CLAVE, JSON.stringify(d)); return true; } catch (e) { return false; }
    },
    borrarLocal: function () { try { localStorage.removeItem(CLAVE); } catch (e) {} },
    // Solo se aceptan imágenes por http(s) o data:image (nunca javascript:).
    imagenSegura: function (u) { return /^(https?:\/\/|data:image\/)/i.test(u || ''); },
    // Lista de páginas para el panel y la voz: [{file, name}]
    paginas: function (d) {
      return [{ file: 'index.html', name: 'Inicio' }].concat(
        d.temas.map(function (t, i) { return { file: 'tema.html?t=' + (i + 1), name: t.nombre }; }));
    }
  };
})();
