/* DANTESTORE beta - Interfaz del catálogo.
 * Fuente de datos: window.DANTESTORE_DATOS (generado desde data/productos.json). No se modifica ningún dato.
 * Secciones: utilidades · tarjetas · vistas · detalle · carrito · ventanas emergentes · navegación (hash) · arranque. */
(function () {
  'use strict';
  var D = window.DANTESTORE_DATOS, C = window.DS_CONFIG, K = window.DS_Carrito;
  var RAIZ = C.rutaRaiz;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var din = K.dinero;
  var catPorNombre = {}, catPorAncla = {};
  D.categorias.forEach(function (c) { catPorNombre[c.nombre] = c; catPorAncla[c.ancla] = c; });
  var porId = K.porId;
  var estado = { cat: null, q: '' };
  var nav = { empujados: 0 };            // entradas de historial creadas por esta página (detalle/carrito)
  var capaActual = null, abridor = null;

  /* ---------- Utilidades de interfaz ---------- */
  function anunciar(t) { var e = $('#anuncioVivo'); e.textContent = ''; setTimeout(function () { e.textContent = t; }, 30); }
  var avisoT;
  function aviso(t) { var a = $('#aviso'); a.textContent = t; a.classList.add('on'); clearTimeout(avisoT); avisoT = setTimeout(function () { a.classList.remove('on'); }, 1800); anunciar(t); }
  function plural(n, s, p) { return n + ' ' + (n === 1 ? s : p); }

  /* ---------- Imágenes: miniaturas en tarjetas, completas en el detalle ---------- */
  function sinFoto() { return '<div class="sinfoto" role="img" aria-label="Foto próximamente"><span aria-hidden="true">📷</span><small>Foto próximamente</small></div>'; }
  function imagen(p, tipo, i, eager) {
    var f = p.fotos[i || 0]; if (!f) return sinFoto();
    return '<img src="' + RAIZ + f[tipo] + '" alt="' + esc(p.nombre) + '" width="' + f.w + '" height="' + f.h + '"' + (eager ? '' : ' loading="lazy"') + ' decoding="async">';
  }
  // Si una imagen falla, se muestra el marcador "Foto próximamente" en vez de un icono roto.
  document.addEventListener('error', function (e) {
    var t = e.target; if (!t || t.tagName !== 'IMG' || t.dataset.fallo) return;
    if (t.classList.contains('decor')) { t.style.visibility = 'hidden'; return; }
    t.dataset.fallo = '1'; var d = document.createElement('div'); d.innerHTML = sinFoto(); t.replaceWith(d.firstChild);
  }, true);

  /* ---------- Tarjeta de producto ---------- */
  function insignias(p) {
    var h = ''; if (p.etiquetas.mas_vendido) h += '<span class="ins ins--vende">🔥 Más vendido</span>';
    if (p.etiquetas.nuevo) h += '<span class="ins ins--nuevo">NUEVO</span>'; return h ? '<div class="ins-grupo">' + h + '</div>' : '';
  }
  function precioHtml(p, grande) {
    return p.precio ? '<span class="precio' + (grande ? ' precio--grande' : '') + '">' + din(p.precio) + '</span>'
      : '<span class="precio precio--consultar' + (grande ? ' precio--grande' : '') + '">' + esc(p.precio_texto) + '</span>';
  }
  function tarjeta(p) {
    var c = catPorNombre[p.categoria], q = K.cantidad(p.id);
    return '<article class="tarjeta" data-id="' + esc(p.id) + '" style="--ac:' + esc(c ? c.color : '#B8913A') + '">' +
      '<button class="tarjeta__foto" type="button" data-accion="detalle" data-id="' + esc(p.id) + '"' + (p.fotos.length ? '' : ' aria-label="Ver detalle de ' + esc(p.nombre) + '"') + '>' + imagen(p, 'm', 0) + '</button>' +
      insignias(p) + '<span class="enCarro" data-enc="' + esc(p.id) + '"' + (q ? '' : ' hidden') + '>' + q + ' en carrito</span>' +
      '<div class="tarjeta__cuerpo"><h3 class="tarjeta__nombre"><button type="button" data-accion="detalle" data-id="' + esc(p.id) + '">' + esc(p.nombre) + '</button></h3>' +
      '<div class="tarjeta__precio">' + precioHtml(p) + '</div>' +
      (p.etiquetas.escasez ? '<p class="escasez">' + esc(p.etiquetas.escasez) + '</p>' : '') +
      '<button class="btn btn--add" type="button" data-accion="agregar" data-id="' + esc(p.id) + '" aria-label="Agregar ' + esc(p.nombre) + ' al carrito">＋ Agregar</button></div></article>';
  }
  function grilla(lista) { return '<div class="grilla">' + lista.map(tarjeta).join('') + '</div>'; }

  /* ---------- Vistas: inicio (agrupado), categoría, búsqueda ---------- */
  function productosDe(cat) { return D.productos.filter(function (p) { return p.categoria === cat; }); }
  function buscar(q) {
    var t = norm(q).split(/\s+/).filter(Boolean);
    return D.productos.filter(function (p) { var h = norm(p.nombre + ' ' + p.categoria); return t.every(function (x) { return h.indexOf(x) !== -1; }); });
  }
  function seccionDestacados() {
    var l = D.mas_vendidos.map(function (id) { return porId[id]; }).filter(Boolean);
    return '<section class="destacados" id="destacados" aria-labelledby="hDest"><div class="seccion__cab"><h2 id="hDest">🔥 Más vendidos</h2><span>Los favoritos de nuestros clientes</span></div>' +
      '<div class="carrusel">' + l.map(tarjeta).join('') + '</div></section>';
  }
  function seccionCategoria(c) {
    var l = productosDe(c.nombre);
    return '<section class="seccion" id="sec-' + esc(c.ancla) + '" style="--ac:' + esc(c.color) + '" aria-labelledby="h-' + esc(c.ancla) + '"><div class="seccion__cab"><h2 id="h-' + esc(c.ancla) + '">' + esc(c.nombre) + '</h2><span>' + plural(l.length, 'producto', 'productos') + '</span>' +
      '<button class="enlace" type="button" data-accion="cat" data-cat="' + esc(c.nombre) + '">Ver solo esta categoría ›</button></div>' + grilla(l) + '</section>';
  }
  function vacio(q) {
    return '<div class="vacio" role="status"><p class="vacio__icono" aria-hidden="true">🔍</p><h2>No encontramos «' + esc(q) + '»</h2><p>Prueba con otra palabra o mira todas las categorías.</p>' +
      '<div class="vacio__acc"><button class="btn btn--pri" type="button" data-accion="todo">Ver todo el catálogo</button>' +
      '<a class="btn btn--wa" target="_blank" rel="noopener" href="https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent('Hola DANTESTORE 👋, estoy buscando: ' + q) + '">Preguntar por WhatsApp</a></div></div>';
  }
  function render() {
    var m = $('#catalogo'), h, n;
    if (estado.q) {
      var r = buscar(estado.q); n = r.length;
      h = r.length ? '<div class="seccion__cab seccion__cab--sola"><h2>Resultados para «' + esc(estado.q) + '»</h2><span>' + plural(r.length, 'producto', 'productos') + '</span></div>' + grilla(r) : vacio(estado.q);
      anunciar(r.length ? plural(r.length, 'resultado', 'resultados') : 'Sin resultados');
    } else if (estado.cat) {
      var c = catPorNombre[estado.cat], l = productosDe(estado.cat); n = l.length;
      h = '<div class="migas"><button class="enlace" type="button" data-accion="todo">‹ Todo el catálogo</button></div>' +
        '<section class="seccion" style="--ac:' + esc(c.color) + '"><div class="seccion__cab seccion__cab--sola"><h2>' + esc(c.nombre) + '</h2><span>' + plural(l.length, 'producto', 'productos') + '</span></div>' + grilla(l) + '</section>';
      anunciar(c.nombre + ': ' + plural(l.length, 'producto', 'productos'));
    } else {
      n = D.productos.length; h = seccionDestacados() + D.categorias.map(seccionCategoria).join('');
    }
    m.innerHTML = h; m.setAttribute('aria-busy', 'false');
    $$('.chip').forEach(function (b) { var on = (b.dataset.cat || '') === (estado.q ? '__none__' : (estado.cat || '')); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    $('#borrarBusqueda').hidden = !$('#buscar').value;
    return n;
  }
  function irAlCatalogo() {
    var b = $('#barra'), top = $('#catalogo').getBoundingClientRect().top + window.scrollY - (b ? b.offsetHeight : 0) - 8;
    if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }
  function fijarHash(h) { try { history.replaceState(null, '', location.pathname + location.search + (h ? '#' + h : '')); } catch (e) { /* ignorar */ } }
  function elegirCategoria(nombre, sinScroll) {
    estado.cat = nombre && catPorNombre[nombre] ? nombre : null; estado.q = ''; $('#buscar').value = '';
    render(); fijarHash(estado.cat ? 'cat=' + encodeURIComponent(estado.cat) : '');
    var ch = $('.chip[aria-pressed="true"]'); if (ch && ch.scrollIntoView) { var cont = $('#chips'); cont.scrollLeft = ch.offsetLeft - 16; }
    if (!sinScroll) irAlCatalogo();
  }

  /* ---------- Navegación con hash: #p=ID (detalle), #carrito, #cat=Nombre ---------- */
  function irHash(h) { nav.empujados++; location.hash = h; }          // genera una entrada de historial (el botón Atrás cierra la capa)
  function cerrarConAtras() { if (nav.empujados > 0) { nav.empujados--; history.back(); } else { fijarHash(estado.cat ? 'cat=' + encodeURIComponent(estado.cat) : ''); sincronizar(); } }
  function sincronizar() {
    var h = ''; try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { h = ''; }
    if (h.indexOf('p=') === 0 && porId[h.slice(2)]) { cerrarCapa($('#capaCarrito')); mostrarDetalle(h.slice(2)); }
    else if (h === 'carrito') { cerrarCapa($('#capaDetalle')); mostrarCarrito(); }
    else {
      cerrarCapa($('#capaDetalle')); cerrarCapa($('#capaCarrito'));
      if (h.indexOf('cat=') === 0 && catPorNombre[h.slice(4)] && estado.cat !== h.slice(4)) { elegirCategoria(h.slice(4), true); }
      else if (h === '' && !estado.q && estado.cat && !capaActual) { /* se mantiene la vista actual */ }
    }
  }

  /* ---------- Capas modales (detalle y carrito): foco, Esc, bloqueo de scroll ---------- */
  function abrirCapa(el) {
    if (!el.hidden) return; abridor = document.activeElement; el.hidden = false; capaActual = el;
    document.body.classList.add('sin-scroll'); var f = $('[data-cerrar]', el) || el; setTimeout(function () { f.focus(); }, 30);
  }
  function cerrarCapa(el) {
    if (!el || el.hidden) return; el.hidden = true; if (capaActual === el) capaActual = null;
    if (!$('.capa:not([hidden])')) document.body.classList.remove('sin-scroll');
    if (abridor && document.body.contains(abridor) && abridor.focus) { try { abridor.focus({ preventScroll: true }); } catch (e) { /* ignorar */ } } abridor = null;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!$('#capaPopup').hidden) { cerrarPopup(); return; }
      if (capaActual) { cerrarConAtras(); }
    }
    if (e.key === 'Tab' && capaActual) {                              // el foco no sale de la capa abierta
      var f = $$('button:not([disabled]),a[href],input,textarea,summary,[tabindex="0"]', capaActual).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return; var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });

  /* ---------- Detalle del producto (imágenes completas) ---------- */
  var det = { id: null, foto: 0, cant: 1 };
  function descripcionHtml(t) {
    if (!t) return '';
    var partes = t.split(/\s\*\s/), intro = partes.shift().replace(/^\*\s*/, '');
    var h = intro ? '<p>' + esc(intro) + '</p>' : '';
    if (partes.length) h += '<ul>' + partes.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    return h;
  }
  function pintarGaleria() {
    var p = porId[det.id], g = $('#detGal'); if (!g) return;
    g.querySelector('.galeria__principal').innerHTML = imagen(p, 'c', det.foto, true);
    $$('.galeria__mini button', g).forEach(function (b, i) { b.setAttribute('aria-current', i === det.foto ? 'true' : 'false'); });
    var n = $('#detContador'); if (n) n.textContent = (det.foto + 1) + ' / ' + p.fotos.length;
  }
  function pintarCantidad() {
    var p = porId[det.id]; $('#detCant').textContent = det.cant;
    $('#detAgregar').innerHTML = '＋ Agregar al carrito' + (p.precio ? ' · ' + din(p.precio * det.cant) : '');
  }
  function mostrarDetalle(id) {
    var p = porId[id], c = catPorNombre[p.categoria], el = $('#capaDetalle');
    if (!el.hidden && det.id === id) return;
    det = { id: id, foto: 0, cant: 1 };
    var minis = p.fotos.length > 1 ? '<div class="galeria__mini">' + p.fotos.map(function (f, i) { return '<button type="button" data-accion="foto" data-i="' + i + '" aria-label="Ver foto ' + (i + 1) + ' de ' + p.fotos.length + '"><img src="' + RAIZ + f.m + '" alt="" width="' + f.w + '" height="' + f.h + '" loading="lazy"></button>'; }).join('') + '</div>' : '';
    var flechas = p.fotos.length > 1 ? '<button class="galeria__flecha galeria__flecha--ant" type="button" data-accion="foto-ant" aria-label="Foto anterior">‹</button><button class="galeria__flecha galeria__flecha--sig" type="button" data-accion="foto-sig" aria-label="Foto siguiente">›</button><span class="galeria__cont" id="detContador" aria-hidden="true"></span>' : '';
    var rel = D.productos.filter(function (x) { return x.categoria === p.categoria && x.id !== p.id; }).slice(0, 4);
    el.innerHTML = '<div class="capa__fondo" data-accion="cerrar"></div><div class="capa__hoja capa__hoja--detalle" style="--ac:' + esc(c.color) + '">' +
      '<button class="capa__cerrar" type="button" data-cerrar data-accion="cerrar" aria-label="Cerrar detalle">✕</button>' +
      '<div class="detalle"><div class="galeria" id="detGal"><div class="galeria__principal"></div>' + flechas + minis + '</div>' +
      '<div class="detalle__info"><p class="detalle__cat"><button class="enlace" type="button" data-accion="cat-desde-detalle" data-cat="' + esc(p.categoria) + '">' + esc(p.categoria) + '</button></p>' +
      '<h2 id="detNombre">' + esc(p.nombre) + '</h2>' + insignias(p) + '<div class="detalle__precio">' + precioHtml(p, true) + '</div>' +
      (p.etiquetas.escasez ? '<p class="escasez">' + esc(p.etiquetas.escasez) + '</p>' : '') +
      '<div class="detalle__desc">' + (descripcionHtml(p.descripcion) || '') + '</div>' +
      '<div class="cantidad" role="group" aria-label="Cantidad"><button type="button" data-accion="det-menos" aria-label="Menos">−</button><output id="detCant" aria-live="polite">1</output><button type="button" data-accion="det-mas" aria-label="Más">＋</button></div>' +
      '<button class="btn btn--pri btn--grande" id="detAgregar" type="button" data-accion="det-agregar"></button>' +
      '<a class="btn btn--wa btn--grande" target="_blank" rel="noopener" href="' + esc(K.consulta(p)) + '">💬 Preguntar por WhatsApp</a>' +
      (rel.length ? '<div class="relacionados"><h3>Más de ' + esc(p.categoria) + '</h3><div class="relacionados__fila">' + rel.map(function (x) { return '<button type="button" data-accion="detalle-rel" data-id="' + esc(x.id) + '">' + imagen(x, 'm', 0) + '<span>' + esc(x.nombre) + '</span></button>'; }).join('') + '</div></div>' : '') +
      '</div></div></div>';
    abrirCapa(el); pintarGaleria(); pintarCantidad(); el.querySelector('.capa__hoja').scrollTop = 0;
    var gal = $('#detGal'), x0 = null;                                  // deslizar para cambiar de foto
    gal.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    gal.addEventListener('touchend', function (e) { if (x0 === null) return; var d = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(d) > 45) cambiarFoto(d < 0 ? 1 : -1); }, { passive: true });
  }
  function cambiarFoto(d) { var p = porId[det.id], n = p.fotos.length; if (n < 2) return; det.foto = (det.foto + d + n) % n; pintarGaleria(); }

  /* ---------- Carrito (panel) ---------- */
  function pintarCarrito() {
    var el = $('#capaCarrito'), t = K.totales(), it = K.items(), ent = K.entrega();
    var ins = $('#insCarrito'); ins.textContent = t.unidades; ins.hidden = !t.unidades;
    $('#btnCarrito').setAttribute('aria-label', 'Abrir carrito, ' + plural(t.unidades, 'producto', 'productos'));
    var bc = $('#barraCarrito'); bc.hidden = !t.unidades || !!capaActual;
    bc.innerHTML = '<span>🛒 Ver carrito · ' + plural(t.unidades, 'producto', 'productos') + '</span><b>' + (t.subtotal ? din(t.subtotal) : 'Consultar') + '</b>';
    $$('.enCarro').forEach(function (e) { var q = K.cantidad(e.dataset.enc); e.hidden = !q; e.textContent = q + ' en carrito'; });
    if (el.hidden) return;
    var h = '<div class="capa__fondo" data-accion="cerrar"></div><div class="capa__hoja capa__hoja--carrito"><div class="carrito__cab"><h2 id="carTitulo">Tu pedido</h2><button class="capa__cerrar capa__cerrar--fijo" type="button" data-cerrar data-accion="cerrar" aria-label="Cerrar carrito">✕</button></div>';
    if (!it.length) {
      h += '<div class="carrito__vacio"><p class="vacio__icono" aria-hidden="true">🛒</p><p><b>Aún no has agregado productos.</b></p><p>Explora el catálogo y agrega lo que te guste.</p><button class="btn btn--pri" type="button" data-accion="cerrar">Ver productos</button></div></div>';
    } else {
      h += '<ul class="carrito__lista">' + it.map(function (i) {
        var p = i.p;
        return '<li class="citem"><div class="citem__foto">' + imagen(p, 'm', 0, true) + '</div><div class="citem__info"><b>' + esc(p.nombre) + '</b><span>' + (p.precio ? din(p.precio) + ' c/u' : esc(p.precio_texto)) + '</span>' +
          '<div class="cantidad cantidad--mini" role="group" aria-label="Cantidad de ' + esc(p.nombre) + '"><button type="button" data-accion="menos" data-id="' + esc(p.id) + '" aria-label="Quitar una unidad de ' + esc(p.nombre) + '">−</button><output>' + i.q + '</output><button type="button" data-accion="mas" data-id="' + esc(p.id) + '" aria-label="Agregar una unidad de ' + esc(p.nombre) + '">＋</button></div></div>' +
          '<div class="citem__der"><b>' + (p.precio ? din(i.total) : '—') + '</b><button class="enlace enlace--peligro" type="button" data-accion="quitar" data-id="' + esc(p.id) + '" aria-label="Quitar ' + esc(p.nombre) + ' del carrito">Quitar</button></div></li>';
      }).join('') + '</ul>';
      h += '<fieldset class="entrega"><legend>¿Cómo quieres recibirlo?</legend>' + Object.keys(C.entregas).map(function (k) {
        var e = C.entregas[k]; return '<label class="entrega__op' + (ent === k ? ' on' : '') + '"><input type="radio" name="entrega" value="' + k + '"' + (ent === k ? ' checked' : '') + '><span><b>' + e.icono + ' ' + esc(e.titulo) + '</b><small>' + esc(e.detalle) + '</small></span></label>';
      }).join('') + '</fieldset>';
      h += '<div class="resumen"><div><span>Subtotal</span><span>' + din(t.subtotal) + '</span></div>' + (t.envio ? '<div><span>Domicilio</span><span>' + din(t.envio) + '</span></div>' : '') +
        '<div class="resumen__total"><b>Total' + (ent === 'otra' ? ' (sin envío)' : '') + '</b><b>' + din(t.total) + '</b></div>' +
        (t.sinPrecio ? '<p class="nota">Incluye ' + plural(t.sinPrecio, 'producto', 'productos') + ' con precio por consultar (no suma al total).</p>' : '') + '</div>';
      h += '<label class="campo" for="carNombre">Tu nombre</label><input class="campo__in" id="carNombre" placeholder="Escribe tu nombre" autocomplete="name" maxlength="60" value="' + esc(K.nombre()) + '">';
      h += '<a class="btn btn--wa btn--grande" id="carEnviar" target="_blank" rel="noopener" href="' + esc(K.enlace()) + '">💬 Enviar pedido por WhatsApp</a>';
      h += '<details class="copiar"><summary>¿No se abre WhatsApp?</summary><p>Copia este mensaje y envíalo al +' + esc(C.whatsapp) + ':</p><textarea id="carTexto" readonly rows="7">' + esc(K.mensaje()) + '</textarea></details>';
      h += '<button class="enlace enlace--peligro carrito__vaciar" type="button" data-accion="vaciar">Vaciar carrito</button></div>';
    }
    // se conserva el foco y el texto del nombre al repintar
    var foco = document.activeElement && document.activeElement.id; var sel = foco === 'carNombre' ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    var sc = el.querySelector('.capa__hoja') ? el.querySelector('.capa__hoja').scrollTop : 0;
    el.innerHTML = h; var hoja = el.querySelector('.capa__hoja'); if (hoja) hoja.scrollTop = sc;
    var cerrar = $('[data-cerrar]', el); if (foco && $('#' + foco, el)) { var f = $('#' + foco, el); f.focus(); if (sel && f.setSelectionRange) f.setSelectionRange(sel[0], sel[1]); } else if (!el.contains(document.activeElement) && cerrar) cerrar.focus();
  }
  function actualizarEnlace() {                                         // al escribir el nombre solo se actualiza el enlace y el texto
    var a = $('#carEnviar'); if (a) a.href = K.enlace(); var t = $('#carTexto'); if (t) t.value = K.mensaje();
  }
  function mostrarCarrito() { var el = $('#capaCarrito'); if (!el.hidden) return; abrirCapa(el); pintarCarrito(); $('#barraCarrito').hidden = true; }
  K.alCambiar(function (soloNombre) { if (soloNombre === true) actualizarEnlace(); else pintarCarrito(); });

  /* ---------- Ventanas emergentes (Navidad y Juguetería), una vez al día ---------- */
  var colaPopup = [];
  function hoy() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function visto(k) { try { return localStorage.getItem(C.prefijo + 'pm_' + k) === hoy(); } catch (e) { return false; } }
  function marcar(k) { try { localStorage.setItem(C.prefijo + 'pm_' + k, hoy()); } catch (e) { /* ignorar */ } }
  function mostrarPopup(k) {
    var v = D.ventanas_emergentes[k], el = $('#capaPopup'), cat = catPorAncla[String(v.destino).replace('#', '')];
    el.className = 'pm ' + (k === 'nav' ? 'pm--nav' : 'pm--jug'); el.dataset.k = k; el.setAttribute('aria-labelledby', 'pmT');
    el.innerHTML = '<div class="pm__caja"><div class="pm__deco" aria-hidden="true">' + (k === 'nav' ? '<s>❄</s><s>🎄</s><s>❄</s><s>⭐</s><s>❄</s><s>🎁</s>' : '<s>🧸</s><s>🎈</s><s>⭐</s><s>🚗</s><s>🎈</s><s>🧩</s>') + '</div>' +
      '<button class="pm__x" type="button" data-accion="popup-cerrar" aria-label="Cerrar anuncio">✕</button><h2 id="pmT">' + esc(v.titulo) + '</h2><p>' + esc(v.mensaje) + '</p>' +
      '<button class="btn btn--pri btn--grande" type="button" data-accion="popup-ir" data-cat="' + esc(cat ? cat.nombre : '') + '">' + esc(v.boton) + '</button></div>';
    el.hidden = false; var b = $('.pm__x', el); setTimeout(function () { b.focus(); }, 30);
  }
  function cerrarPopup(irA) {
    var el = $('#capaPopup'); if (el.hidden) return; marcar(el.dataset.k); el.hidden = true; el.innerHTML = '';
    if (irA !== undefined) { colaPopup = []; elegirCategoria(irA || null); return; }
    if (colaPopup.length) setTimeout(function () { if (!capaActual) mostrarPopup(colaPopup.shift()); }, 350);
  }
  function iniciarPopups() {
    if (/[?&#]sinpopups/.test(location.href) || !C.popupsUnaVezAlDia && false) return;
    ['nav', 'jug'].forEach(function (k) { if (D.ventanas_emergentes[k] && !visto(k)) colaPopup.push(k); });
    if (colaPopup.length) setTimeout(function () { if (!capaActual && !/#(p=|carrito)/.test(location.hash)) mostrarPopup(colaPopup.shift()); }, 1200);
  }

  /* ---------- Portada y barra de categorías ---------- */
  function pintarPortada() {
    var P = D.portada; $('#pKicker').textContent = P.kicker; $('#pTitulo').textContent = P.titulo; $('#pSub').textContent = P.subtitulo;
    var nav_ = D.ventanas_emergentes.nav, jug = D.ventanas_emergentes.jug;
    var cn = nav_ && catPorAncla[String(nav_.destino).replace('#', '')], cj = jug && catPorAncla[String(jug.destino).replace('#', '')];
    var b = ''; if (cn) b += '<button class="btn btn--rapido btn--navidad" type="button" data-accion="cat" data-cat="' + esc(cn.nombre) + '"><span aria-hidden="true">🎄</span> ' + esc(cn.nombre) + '</button>';
    if (cj) b += '<button class="btn btn--rapido btn--jug" type="button" data-accion="cat" data-cat="' + esc(cj.nombre) + '"><span aria-hidden="true">🧸</span> ' + esc(cj.nombre) + '</button>';
    b += '<button class="btn btn--rapido btn--todo" type="button" data-accion="ver-todo-scroll">Ver todo</button>'; $('#pBotones').innerHTML = b;
    var f = D.mas_vendidos.map(function (id) { return porId[id]; }).filter(function (p) { return p && p.fotos.length; }).slice(0, 4);
    $('#mosaico').innerHTML = f.map(function (p, i) { return '<div class="mosaico__item m' + i + '"><img class="decor" src="' + RAIZ + p.fotos[0].m + '" alt="" width="' + p.fotos[0].w + '" height="' + p.fotos[0].h + '" ' + (i < 2 ? '' : 'loading="lazy" ') + 'decoding="async"></div>'; }).join('');
  }
  function pintarChips() {
    var h = '<button class="chip" type="button" data-accion="todo" data-cat="" aria-pressed="true">Todo <small>' + D.productos.length + '</small></button>';
    h += D.categorias.map(function (c) { return '<button class="chip" type="button" data-accion="cat" data-cat="' + esc(c.nombre) + '" aria-pressed="false" style="--ac:' + esc(c.color) + '">' + esc(c.nombre) + ' <small>' + c.cantidad + '</small></button>'; }).join('');
    $('#chips').innerHTML = h;
  }

  /* ---------- Eventos (delegación) ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-accion]'); if (!t) return;
    var a = t.dataset.accion, id = t.dataset.id;
    if (t.classList.contains('capa__fondo') && e.target !== t) return;
    switch (a) {
      case 'agregar': K.agregar(id, 1); aviso('✓ ' + porId[id].nombre + ' agregado al carrito'); t.classList.add('ok'); t.textContent = '✓ Agregado'; setTimeout(function () { t.classList.remove('ok'); t.textContent = '＋ Agregar'; }, 1100); break;
      case 'detalle': irHash('p=' + encodeURIComponent(id)); break;
      case 'detalle-rel': history.replaceState(null, '', '#p=' + encodeURIComponent(id)); sincronizar(); break;
      case 'cat': elegirCategoria(t.dataset.cat); break;
      case 'cat-desde-detalle': cerrarCapa($('#capaDetalle')); nav.empujados = 0; elegirCategoria(t.dataset.cat); break;
      case 'todo': elegirCategoria(null); break;
      case 'ver-todo-scroll': elegirCategoria(null, true); document.getElementById('catalogo').scrollIntoView({ block: 'start' }); irAlCatalogo(); break;
      case 'carrito': irHash('carrito'); break;
      case 'cerrar': cerrarConAtras(); break;
      case 'foto': det.foto = +t.dataset.i; pintarGaleria(); break;
      case 'foto-ant': cambiarFoto(-1); break;
      case 'foto-sig': cambiarFoto(1); break;
      case 'det-menos': det.cant = Math.max(1, det.cant - 1); pintarCantidad(); break;
      case 'det-mas': det.cant = Math.min(C.cantidadMaxima, det.cant + 1); pintarCantidad(); break;
      case 'det-agregar': K.agregar(det.id, det.cant); aviso('✓ ' + porId[det.id].nombre + ' agregado al carrito'); det.cant = 1; pintarCantidad(); break;
      case 'mas': K.cambiar(id, 1); break;
      case 'menos': K.cambiar(id, -1); break;
      case 'quitar': K.quitar(id); aviso('Producto quitado'); break;
      case 'vaciar': if (t.dataset.confirma) { K.vaciar(); aviso('Carrito vaciado'); } else { t.dataset.confirma = '1'; t.textContent = 'Toca otra vez para confirmar'; setTimeout(function () { if (t.isConnected) { delete t.dataset.confirma; t.textContent = 'Vaciar carrito'; } }, 3000); } break;
      case 'popup-cerrar': cerrarPopup(); break;
      case 'popup-ir': cerrarPopup(t.dataset.cat); break;
    }
  });
  document.addEventListener('change', function (e) { if (e.target.name === 'entrega') K.fijarEntrega(e.target.value); });
  document.addEventListener('input', function (e) { if (e.target.id === 'carNombre') K.fijarNombre(e.target.value); });
  var tb; $('#buscar').addEventListener('input', function (e) {
    var v = e.target.value; $('#borrarBusqueda').hidden = !v; clearTimeout(tb);
    tb = setTimeout(function () { estado.q = v.trim(); if (!estado.q) { render(); } else { render(); } if (estado.q) irAlCatalogo(); }, 140);
  });
  $('#formBuscar').addEventListener('submit', function (e) { e.preventDefault(); estado.q = $('#buscar').value.trim(); render(); irAlCatalogo(); $('#buscar').blur(); });
  $('#borrarBusqueda').addEventListener('click', function () { $('#buscar').value = ''; estado.q = ''; render(); $('#buscar').focus(); });
  window.addEventListener('hashchange', function () { sincronizar(); });
  window.addEventListener('popstate', function () { sincronizar(); });
  $('#capaPopup').addEventListener('click', function (e) { if (e.target === this) cerrarPopup(); });

  /* ---------- Arranque ---------- */
  function iniciar() {
    if (C.esBeta) $('#bannerBeta').hidden = false;
    $('#pieWa').href = 'https://wa.me/' + C.whatsapp;
    pintarPortada(); pintarChips();
    var h = ''; try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { h = ''; }
    if (h.indexOf('cat=') === 0 && catPorNombre[h.slice(4)]) estado.cat = h.slice(4);
    render(); pintarCarrito();
    if (h.indexOf('p=') === 0 || h === 'carrito') sincronizar();
    iniciarPopups();
  }
  try { iniciar(); } catch (err) {
    var m = $('#catalogo'); m.setAttribute('aria-busy', 'false');
    m.innerHTML = '<div class="vacio"><h2>No pudimos cargar el catálogo</h2><p>Recarga la página o escríbenos por WhatsApp.</p><a class="btn btn--wa" href="https://wa.me/' + C.whatsapp + '">Escribir por WhatsApp</a></div>';
    if (window.console) console.error(err);
  }
})();
