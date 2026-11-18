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
  function avisoAgregado(r, p) { aviso(!r.ok ? 'No se pudo agregar el producto' : r.tope ? 'Máximo ' + K.max + ' unidades de ' + p.nombre : '✓ ' + p.nombre + ' agregado al carrito'); }

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
      '<button class="tarjeta__foto" type="button" tabindex="-1" data-accion="detalle" data-id="' + esc(p.id) + '"' + (p.fotos.length ? '' : ' aria-label="Ver detalle de ' + esc(p.nombre) + '"') + '>' + imagen(p, 'm', 0) + '</button>' +
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
    actualizarBarra();
    if (abridor && document.body.contains(abridor) && abridor.focus) { try { abridor.focus({ preventScroll: true }); } catch (e) { /* ignorar */ } } abridor = null;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!$('#capaPopup').hidden) { cerrarPopup(); return; }
      if (capaActual === $('#capaCarrito') && cp.confirmando) { cp.confirmando = false; pintarCarrito(); return; }
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

  /* ---------- Carrito (panel de 2 pasos: 1 Carrito · 2 Entrega y datos) ---------- */
  var cp = { paso: 1, intentado: false, confirmando: false, enviado: false };
  function reiniciarPanel() { cp = { paso: 1, intentado: false, confirmando: false, enviado: false }; }
  function byId(i) { return document.getElementById(i); }
  /* Texto del total según la entrega elegida: nunca se presenta como definitivo si falta cotizar el envío o hay productos por consultar. */
  function totalTexto(t, ent) {
    if (!ent) return { etq: 'Total', v: 'Elige la entrega', nota: '' };
    if (t.envioPorCotizar) return { etq: 'Total definitivo', v: 'Pendiente de cotización', nota: 'Productos con precio: ' + din(t.subtotal) + ' + envío por cotizar. Te confirmamos el total por WhatsApp.' + (t.sinPrecio ? ' Además hay ' + plural(t.sinPrecio, 'producto', 'productos') + ' con precio por consultar.' : '') };
    if (t.sinPrecio) return { etq: 'Total definitivo', v: 'Por confirmar', nota: 'Sin contar ' + plural(t.sinPrecio, 'producto', 'productos') + ' con precio por consultar: ' + din(t.total) + (t.envio ? ' (incluye domicilio)' : '') + '.' };
    return { etq: 'Total', v: din(t.total), nota: '' };
  }
  function cuerpoPaso1(t, it) {
    var h = '<p class="carrito__conteo"><b>' + plural(t.unidades, 'unidad', 'unidades') + '</b> · ' + plural(t.lineas, 'producto diferente', 'productos diferentes') + '</p>';
    h += '<ul class="carrito__lista">' + it.map(function (i) {
      var p = i.p, id = esc(p.id), tope = i.q >= K.max;
      return '<li class="citem"><div class="citem__foto">' + imagen(p, 'm', 0, true) + '</div><div class="citem__info"><b>' + esc(p.nombre) + '</b><span>' + (p.precio ? din(p.precio) + ' c/u' : esc(p.precio_texto)) + '</span>' +
        '<div class="cantidad cantidad--mini" role="group" aria-label="Cantidad de ' + esc(p.nombre) + '">' +
        '<button type="button" id="menos-' + id + '" data-accion="menos" data-id="' + id + '" aria-label="Quitar una unidad de ' + esc(p.nombre) + '"' + (i.q <= 1 ? ' disabled' : '') + '>−</button><output>' + i.q + '</output>' +
        '<button type="button" id="mas-' + id + '" data-accion="mas" data-id="' + id + '" aria-label="' + (tope ? 'Máximo ' + K.max + ' unidades de ' + esc(p.nombre) : 'Agregar una unidad de ' + esc(p.nombre)) + '"' + (tope ? ' disabled' : '') + '>＋</button></div>' +
        (tope ? '<small class="citem__tope">Máximo ' + K.max + ' por producto</small>' : '') + '</div>' +
        '<div class="citem__der"><span class="citem__sub"><small>Subtotal</small><b>' + (p.precio ? din(i.total) : 'Consultar') + '</b></span><button class="enlace enlace--peligro" type="button" data-accion="quitar" data-id="' + id + '" aria-label="Quitar ' + esc(p.nombre) + ' del carrito">Quitar</button></div></li>';
    }).join('') + '</ul>';
    h += '<div class="resumen"><div class="resumen__total"><b>Subtotal</b><b>' + din(t.subtotal) + '</b></div>' +
      (t.sinPrecio ? '<p class="nota">Incluye ' + plural(t.sinPrecio, 'producto', 'productos') + ' con precio por consultar (no suma al subtotal).</p>' : '') +
      '<p class="nota">En el siguiente paso eliges la entrega y ves el total.</p></div>';
    h += '<button class="enlace enlace--peligro carrito__vaciar" type="button" data-accion="vaciar">Vaciar carrito</button>';
    return h;
  }
  function campoHTML(k) {
    var d = K.campos[k], obl = d.min > 0, ac = { nombre: 'name', direccion: 'address-line1', barrio: 'address-level3', ciudad: 'address-level2', departamento: 'address-level1' }[k] || 'off';
    return '<div class="campo-g"><label class="campo" for="c-' + k + '">' + esc(d.etiqueta) + (obl ? ' <span class="obl">(obligatorio)</span>' : ' <span class="opc">(opcional)</span>') + '</label>' +
      '<input class="campo__in" id="c-' + k + '" data-campo="' + k + '" type="text" maxlength="' + d.max + '" value="' + esc(K.comprador(k)) + '" autocomplete="' + ac + '" enterkeyhint="next"' + (obl ? ' aria-required="true"' : '') + ' aria-describedby="err-' + k + '">' +
      '<small class="campo__err" id="err-' + k + '"></small></div>';
  }
  function cuerpoPaso2(t, it, ent) {
    var h = '<div class="errores" id="carErrores" tabindex="-1" hidden><b>Faltan datos para enviar tu pedido:</b><ul></ul></div>';
    h += campoHTML('nombre');
    h += '<fieldset class="entrega" aria-describedby="errEntrega"><legend>¿Cómo quieres recibirlo? <span class="obl">(obligatorio)</span></legend>' + Object.keys(C.entregas).map(function (k) {
      var e = C.entregas[k]; return '<label class="entrega__op' + (ent === k ? ' on' : '') + '"><input type="radio" id="ent-' + k + '" name="entrega" value="' + k + '"' + (ent === k ? ' checked' : '') + '><span><b>' + e.icono + ' ' + esc(e.titulo) + '</b><small>' + esc(e.detalle) + '</small></span></label>';
    }).join('') + '<small class="campo__err" id="errEntrega"></small></fieldset>';
    var vis = K.camposVisibles().filter(function (k) { return k !== 'nombre'; });
    if (vis.length) h += '<div class="datos-entrega"><h3>' + (ent === 'dom' ? 'Datos del domicilio' : 'Datos para cotizar el envío') + '</h3>' + vis.map(campoHTML).join('') + '</div>';
    else if (ent === 'tienda') h += '<p class="nota nota--ok">Para recoger en tienda solo necesitamos tu nombre.</p>';
    var tt = totalTexto(t, ent), E = ent ? C.entregas[ent] : null;
    h += '<section class="resumen resumen--det" aria-labelledby="resTit"><h3 id="resTit">Resumen de tu pedido</h3><ul class="res__lineas">' + it.map(function (i) {
      return '<li><div><b>' + esc(i.p.nombre) + '</b><small>' + (i.p.precio ? i.q + ' × ' + din(i.p.precio) : plural(i.q, 'unidad', 'unidades') + ' · precio por consultar') + '</small></div><b>' + (i.p.precio ? din(i.total) : '—') + '</b></li>';
    }).join('') + '</ul>' +
      '<div class="res__fila"><span>Subtotal (' + plural(t.unidades, 'unidad', 'unidades') + ')</span><b>' + din(t.subtotal) + '</b></div>' +
      '<div class="res__fila"><span>Entrega</span><b>' + (E ? esc(E.titulo) : 'Sin elegir') + '</b></div>' +
      (ent === 'dom' ? '<div class="res__fila"><span>Domicilio (pago contraentrega)</span><b>' + din(t.envio) + '</b></div>' : '') +
      (ent === 'otra' ? '<div class="res__fila"><span>Envío</span><b>Por cotizar</b></div>' : '') +
      (ent === 'tienda' ? '<div class="res__fila"><span>Recoger en tienda</span><b>Gratis</b></div>' : '') +
      '<div class="resumen__total"><b>' + tt.etq + '</b><b>' + esc(tt.v) + '</b></div>' + (tt.nota ? '<p class="nota">' + esc(tt.nota) + '</p>' : '') + '</section>';
    if (cp.enviado) h += '<div class="enviado" role="status"><b>Se abrió WhatsApp con tu pedido.</b><p>Revísalo y envíalo desde allí. Tu carrito se conserva por si necesitas corregir algo. Si ya lo enviaste, puedes vaciarlo.</p><button class="btn btn--sec" type="button" data-accion="vaciar">Ya envié mi pedido: vaciar carrito</button></div>';
    h += '<details class="copiar"><summary>¿No se abre WhatsApp?</summary><p>Copia este mensaje y envíalo al +' + esc(C.whatsapp) + ':</p><textarea id="carTexto" readonly rows="8" aria-label="Mensaje del pedido, para copiar">' + esc(K.mensaje()) + '</textarea></details>';
    return h;
  }
  function pintarCarrito() {
    var el = $('#capaCarrito'), t = K.totales(), it = K.items(), ent = K.entrega();
    var ins = $('#insCarrito'); ins.textContent = t.unidades; ins.hidden = !t.unidades;
    $('#btnCarrito').setAttribute('aria-label', 'Abrir carrito, ' + plural(t.unidades, 'unidad', 'unidades'));
    var bc = $('#barraCarrito'); bc.hidden = !t.unidades || !!capaActual;
    bc.innerHTML = '<span>🛒 Ver carrito · ' + plural(t.unidades, 'unidad', 'unidades') + '</span><b>' + (t.subtotal ? din(t.subtotal) : 'Consultar') + '</b>';
    $$('.enCarro').forEach(function (e) { var q = K.cantidad(e.dataset.enc); e.hidden = !q; e.textContent = q + ' en carrito'; });
    if (el.hidden) return;
    if (!it.length) reiniciarPanel();
    var vacio = !it.length, p2 = cp.paso === 2 && !vacio;
    var foco = document.activeElement && document.activeElement.id, sel = null;
    if (foco && /^c-/.test(foco) && document.activeElement.setSelectionRange) sel = [document.activeElement.selectionStart, document.activeElement.selectionEnd];
    var cuerpoPrev = el.querySelector('.carrito__cuerpo'), sc = cuerpoPrev ? cuerpoPrev.scrollTop : 0;
    var h = '<div class="capa__fondo" data-accion="cerrar"></div><div class="capa__hoja capa__hoja--carrito"><div class="carrito__cab">' +
      (p2 ? '<button class="capa__cerrar capa__atras" type="button" data-accion="paso-1" aria-label="Volver al carrito">‹</button>' : '') +
      '<h2 id="carTitulo" tabindex="-1">' + (p2 ? 'Entrega y datos' : 'Tu carrito') + '</h2>' +
      '<button class="capa__cerrar capa__cerrar--fijo" type="button" data-cerrar data-accion="cerrar" aria-label="Cerrar carrito y seguir comprando">✕</button></div>';
    if (vacio) {
      h += '<div class="carrito__cuerpo"><div class="carrito__vacio"><p class="vacio__icono" aria-hidden="true">🛒</p><p><b>Aún no has agregado productos.</b></p><p>Explora el catálogo y agrega lo que te guste.</p><button class="btn btn--pri" type="button" data-accion="cerrar">Ver productos</button></div></div></div>';
    } else {
      h += '<ol class="pasos" aria-label="Pasos del pedido"><li' + (p2 ? '' : ' aria-current="step"') + '><span>1</span> Carrito</li><li' + (p2 ? ' aria-current="step"' : '') + '><span>2</span> Entrega y datos</li></ol>';
      h += '<div class="carrito__cuerpo">' + (p2 ? cuerpoPaso2(t, it, ent) : cuerpoPaso1(t, it)) + '</div><div class="carrito__pie">';
      if (cp.confirmando) {
        h += '<div class="confirmar" role="alertdialog" aria-labelledby="confTit" aria-describedby="confTxt"><p id="confTit"><b>¿Vaciar el carrito?</b></p><p id="confTxt">Se quitarán ' + plural(t.lineas, 'producto', 'productos') + ' (' + plural(t.unidades, 'unidad', 'unidades') + ') y los datos que escribiste.</p>' +
          '<div class="pie__fila"><button class="btn btn--sec" id="vaciarNo" type="button" data-accion="vaciar-no">Cancelar</button><button class="btn btn--peligro" id="vaciarSi" type="button" data-accion="vaciar-si">Sí, vaciar</button></div></div>';
      } else if (p2) {
        var tt = totalTexto(t, ent), v = K.validar();
        h += '<div class="carrito__total"><span>' + tt.etq + '</span><b id="carTotalPie">' + esc(tt.v) + '</b></div>' +
          '<a class="btn btn--wa btn--grande" id="carEnviar" data-accion="enviar" target="_blank" rel="noopener" href="' + esc(v.ok ? K.enlace() : '#carrito') + '">💬 Enviar pedido por WhatsApp</a>';
      } else {
        h += '<div class="carrito__total"><span>Subtotal</span><b>' + din(t.subtotal) + '</b></div><div class="pie__fila"><button class="btn btn--sec" type="button" data-accion="cerrar">← Seguir comprando</button><button class="btn btn--pri" id="carContinuar" type="button" data-accion="paso-2">Continuar →</button></div>';
      }
      h += '</div></div>';
    }
    el.innerHTML = h;
    var cuerpo = el.querySelector('.carrito__cuerpo'); if (cuerpo) cuerpo.scrollTop = sc;
    marcarErrores();
    // foco: se conserva el control que se estaba usando (por id); si ya no existe, su pareja (+/−), el título o el botón de cerrar
    var f = foco && byId(foco), par = foco && /^(mas|menos)-/.test(foco) ? byId(foco.replace(/^(mas|menos)/, function (m) { return m === 'mas' ? 'menos' : 'mas'; })) : null;
    if (f && el.contains(f) && !f.disabled) { f.focus({ preventScroll: true }); if (sel && f.setSelectionRange) f.setSelectionRange(sel[0], sel[1]); }
    else if (par && !par.disabled) par.focus({ preventScroll: true });
    else if (cp.confirmando && byId('vaciarNo')) byId('vaciarNo').focus();
    else if (!el.contains(document.activeElement)) { var tt2 = byId('carTitulo') || $('[data-cerrar]', el); if (tt2) tt2.focus({ preventScroll: true }); }
  }
  /* Mensajes de error junto a cada campo y resumen al inicio; solo después de intentar enviar. */
  function marcarErrores() {
    var sum = byId('carErrores'); if (!sum) return;
    var v = K.validar(), lista = [], ord = ['nombre', 'entrega'].concat(K.orden.filter(function (k) { return k !== 'nombre'; }));
    K.orden.forEach(function (k) {
      var i = byId('c-' + k), e = byId('err-' + k); if (!i) return;
      var m = cp.intentado && v.errores[k] || ''; e.textContent = m; if (m) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid');
    });
    var ee = byId('errEntrega'); if (ee) ee.textContent = cp.intentado && v.errores.entrega || '';
    if (cp.intentado) ord.forEach(function (k) { if (v.errores[k]) lista.push([k === 'entrega' ? 'ent-dom' : 'c-' + k, v.errores[k]]); });
    sum.hidden = !lista.length;
    sum.querySelector('ul').innerHTML = lista.map(function (x) { return '<li><a href="#' + x[0] + '" data-accion="ir-campo" data-campo="' + x[0] + '">' + esc(x[1]) + '</a></li>'; }).join('');
  }
  function actualizarDatos() {                                         // al escribir: solo se actualizan enlace, texto de respaldo y errores (sin repintar, para no perder el foco)
    var a = byId('carEnviar'); if (a) a.href = K.validar().ok ? K.enlace() : '#carrito';
    var t = byId('carTexto'); if (t) t.value = K.mensaje();
    marcarErrores();
  }
  function actualizarBarra() { var b = $('#barraCarrito'); if (b) b.hidden = !K.totales().unidades || !!capaActual; }   // la barra flotante reaparece al cerrar el carrito o el detalle
  function mostrarCarrito() { var el = $('#capaCarrito'); if (!el.hidden) return; reiniciarPanel(); abrirCapa(el); pintarCarrito(); $('#barraCarrito').hidden = true; }
  K.alCambiar(function (tipo) { if (tipo === 'datos') actualizarDatos(); else pintarCarrito(); });

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
      case 'agregar': avisoAgregado(K.agregar(id, 1), porId[id]); t.classList.add('ok'); t.textContent = '✓ Agregado'; setTimeout(function () { t.classList.remove('ok'); t.textContent = '＋ Agregar'; }, 1100); break;
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
      case 'det-agregar': avisoAgregado(K.agregar(det.id, det.cant), porId[det.id]); det.cant = 1; pintarCantidad(); break;
      case 'mas': if (!K.cambiar(id, 1)) aviso('Máximo ' + K.max + ' unidades por producto'); break;
      case 'menos': K.cambiar(id, -1); break;
      case 'quitar': K.quitar(id); aviso('Producto quitado'); break;
      case 'vaciar': cp.confirmando = true; pintarCarrito(); break;
      case 'vaciar-no': cp.confirmando = false; pintarCarrito(); break;
      case 'vaciar-si': cp.confirmando = false; K.vaciar(); aviso('Carrito vaciado'); break;
      case 'paso-2': cp.paso = 2; cp.intentado = false; cp.enviado = false; pintarCarrito(); { var h2 = byId('carTitulo'); if (h2) h2.focus({ preventScroll: true }); } break;
      case 'paso-1': cp.paso = 1; cp.intentado = false; pintarCarrito(); { var h1 = byId('carTitulo'); if (h1) h1.focus({ preventScroll: true }); } break;
      case 'ir-campo': e.preventDefault(); { var tg = byId(t.dataset.campo); if (tg) { tg.focus(); tg.scrollIntoView({ block: 'center' }); } } break;
      case 'enviar':
        if (!K.validar().ok) {                                                      // faltan datos: no se abre WhatsApp y se explican los errores
          e.preventDefault(); cp.intentado = true; pintarCarrito();
          var sm = byId('carErrores'); if (sm && !sm.hidden) { sm.focus(); var cu = $('.carrito__cuerpo'); if (cu) cu.scrollTop = 0; }
        } else { setTimeout(function () { cp.enviado = true; if (!$('#capaCarrito').hidden) pintarCarrito(); }, 700); }   // el carrito NO se vacía: el cliente puede revisar y corregir
        break;
      case 'popup-cerrar': cerrarPopup(); break;
      case 'popup-ir': cerrarPopup(t.dataset.cat); break;
    }
  });
  document.addEventListener('change', function (e) { if (e.target.name === 'entrega') { cp.enviado = false; K.fijarEntrega(e.target.value); } });
  document.addEventListener('input', function (e) { var k = e.target.dataset && e.target.dataset.campo; if (k) { cp.enviado = false; K.fijarDato(k, e.target.value); } });
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
