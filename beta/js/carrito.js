/* DANTESTORE beta - Carrito (lógica sin interfaz). Etapa 4.
 * - Guarda SOLO {id: cantidad}; nombre y precio se leen siempre de los datos (nunca hay precios viejos en un carrito guardado).
 * - Cantidades: enteros de 1 a C.cantidadMaxima. Cualquier otro valor se rechaza o se corrige; nunca queda 0, negativo ni decimal.
 * - Datos del comprador: solo en memoria y sessionStorage (se borran al cerrar la pestaña y al vaciar el carrito). Nada en localStorage.
 * - Las tarifas y modalidades vienen de config.js (sin cambios respecto a las del catálogo publicado). */
(function () {
  'use strict';
  var C = window.DS_CONFIG, D = window.DANTESTORE_DATOS;
  var K = { cart: C.prefijo + 'cart', ent: C.prefijo + 'ent', comp: C.prefijo + 'comprador', viejoNombre: C.prefijo + 'nombre' };
  var tiene = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  var porId = Object.create(null); D.productos.forEach(function (p) { porId[p.id] = p; });   // sin prototipo: «constructor», «__proto__», etc. no existen
  var MAX = C.cantidadMaxima;

  /* Campos del comprador: etiqueta, longitud mínima (si es obligatorio), máxima y para qué entregas aplica. */
  var CAMPOS = {
    nombre:       { etiqueta: 'Tu nombre',                       max: 60,  min: 2, entregas: ['dom', 'otra', 'tienda'] },
    direccion:    { etiqueta: 'Dirección de entrega',            max: 120, min: 5, entregas: ['dom'] },
    barrio:       { etiqueta: 'Barrio o localidad',              max: 60,  min: 0, entregas: ['dom'] },
    indicaciones: { etiqueta: 'Indicaciones para la entrega',    max: 120, min: 0, entregas: ['dom'] },
    ciudad:       { etiqueta: 'Ciudad de destino',               max: 60,  min: 2, entregas: ['otra'] },
    departamento: { etiqueta: 'Departamento',                    max: 60,  min: 0, entregas: ['otra'] },
    destino:      { etiqueta: 'Dirección o barrio de destino',   max: 120, min: 0, entregas: ['otra'] }
  };
  var ORDEN = ['nombre', 'direccion', 'barrio', 'indicaciones', 'ciudad', 'departamento', 'destino'];

  var cart = {}, entrega = '', comp = {};
  var oyentes = [];

  function leerLS(k) { try { var v = localStorage.getItem(k); return v === null ? '' : v; } catch (e) { return ''; } }
  function escribirLS(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento: el carrito vive solo en memoria */ } }
  function leerSS(k) { try { var v = sessionStorage.getItem(k); return v === null ? '' : v; } catch (e) { return ''; } }
  function escribirSS(k, v) { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* ignorar */ } }
  function avisar(tipo) { oyentes.forEach(function (f) { try { f(tipo); } catch (e) { if (window.console) console.error(e); } }); }

  function dinero(n) { return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }   // $1.234.567

  /* Cantidad válida: entero entre 1 y MAX; si no, null. Acepta números o textos de solo dígitos. */
  function cantidadValida(q) {
    if (typeof q === 'string') { if (!/^\s*\d+\s*$/.test(q)) return null; q = Number(q); }
    if (typeof q !== 'number' || !isFinite(q) || Math.floor(q) !== q || q < 1) return null;
    return Math.min(q, MAX);
  }
  /* Texto de una sola línea: sin saltos ni caracteres de control, espacios colapsados (para el mensaje de WhatsApp). */
  function limpiar(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
  /* Mientras se escribe: se quitan saltos y controles y se limita la longitud, sin recortar espacios (para no molestar al teclear). */
  function enEdicion(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').slice(0, max); }

  function guardarCarrito() { escribirLS(K.cart, JSON.stringify(cart)); escribirLS(K.ent, entrega); }
  function guardarComprador() { var vacio = ORDEN.every(function (c) { return !comp[c]; }); escribirSS(K.comp, vacio ? null : JSON.stringify(comp)); }

  function cargar() {
    var raw = {};
    try { var o = JSON.parse(leerLS(K.cart) || '{}'); raw = (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; } catch (e) { raw = {}; }
    cart = {};
    Object.keys(raw).forEach(function (id) {            // descarta ids inexistentes (incluidas claves heredadas como «constructor») y cantidades inválidas
      var q = cantidadValida(raw[id]);
      if (porId[id] && q) cart[id] = q;
    });
    var e = leerLS(K.ent); entrega = tiene(C.entregas, e) ? e : '';
    comp = {};
    try { var c = JSON.parse(leerSS(K.comp) || '{}'); if (c && typeof c === 'object') ORDEN.forEach(function (k) { if (typeof c[k] === 'string') comp[k] = enEdicion(c[k], CAMPOS[k].max); }); } catch (err) { comp = {}; }
    try { localStorage.removeItem(K.viejoNombre); } catch (err2) { /* la beta anterior guardaba el nombre de forma permanente: se elimina */ }
  }

  function items() {
    return Object.keys(cart).map(function (id) { var p = porId[id]; return { p: p, q: cart[id], total: (p.precio || 0) * cart[id] }; });
  }
  function totales() {
    var sub = 0, unidades = 0, sinPrecio = 0, it = items();
    it.forEach(function (i) { sub += i.total; unidades += i.q; if (!i.p.precio) sinPrecio += 1; });
    var E = entrega ? C.entregas[entrega] : null, env = E ? E.costo : 0;
    var envioPorCotizar = entrega === 'otra';
    return {
      subtotal: sub, envio: env, total: sub + env, unidades: unidades, lineas: it.length, sinPrecio: sinPrecio,
      envioPorCotizar: envioPorCotizar,
      pendiente: envioPorCotizar || sinPrecio > 0          // el total definitivo aún no se puede dar
    };
  }

  /* Validación según la modalidad elegida: solo se exige lo necesario para esa entrega. */
  function validar() {
    var err = {}, E = entrega ? C.entregas[entrega] : null;
    if (!Object.keys(cart).length) err.carrito = 'Tu carrito está vacío.';
    if (!E) err.entrega = 'Elige cómo quieres recibir tu pedido.';
    ORDEN.forEach(function (k) {
      var def = CAMPOS[k]; if (k !== 'nombre' && (!E || def.entregas.indexOf(entrega) < 0)) return;      // el nombre se exige siempre; lo demás, según la entrega
      var v = limpiar(comp[k], def.max);
      if (def.min && v.length < def.min) err[k] = v.length ? def.etiqueta + ': escribe al menos ' + def.min + ' caracteres.' : (k === 'nombre' ? 'Escribe tu nombre.' : (k === 'direccion' ? 'Escribe la dirección de entrega.' : 'Escribe la ciudad de destino.'));
    });
    return { ok: Object.keys(err).length === 0, errores: err };
  }
  function camposVisibles() { return ORDEN.filter(function (k) { return k === 'nombre' || (entrega && CAMPOS[k].entregas.indexOf(entrega) >= 0); }); }

  /* Mensaje de WhatsApp (formato de WhatsApp: *negrita*). Solo incluye datos de la modalidad elegida. */
  function mensaje() {
    var t = totales(), E = entrega ? C.entregas[entrega] : null, L = [];
    L.push('*PEDIDO DANTESTORE*');
    L.push('Hola DANTESTORE 👋, quiero hacer este pedido.');
    L.push('');
    L.push('*Cliente:* ' + (limpiar(comp.nombre, 60) || '(sin nombre)'));
    L.push('');
    L.push('*Productos* (' + t.lineas + (t.lineas === 1 ? ' producto, ' : ' productos, ') + t.unidades + (t.unidades === 1 ? ' unidad)' : ' unidades)') + ':');
    items().forEach(function (i, n) {
      L.push((n + 1) + '. ' + i.p.nombre);
      L.push('   ' + (i.p.precio ? i.q + ' × ' + dinero(i.p.precio) + ' = ' + dinero(i.total) : i.q + (i.q === 1 ? ' unidad' : ' unidades') + ' — precio por consultar'));
    });
    L.push('');
    L.push('*Subtotal' + (t.sinPrecio ? ' (sin los productos por consultar)' : '') + ':* ' + dinero(t.subtotal));
    L.push('*Entrega:* ' + (E ? E.mensaje : 'por definir'));
    if (entrega === 'dom') {
      L.push('*Dirección:* ' + limpiar(comp.direccion, 120) + (limpiar(comp.barrio, 60) ? ', ' + limpiar(comp.barrio, 60) : ''));
      if (limpiar(comp.indicaciones, 120)) L.push('*Indicaciones:* ' + limpiar(comp.indicaciones, 120));
      L.push('*Domicilio:* ' + dinero(t.envio));
    } else if (entrega === 'otra') {
      var lugar = limpiar(comp.ciudad, 60) + (limpiar(comp.departamento, 60) ? ', ' + limpiar(comp.departamento, 60) : '');
      L.push('*Ciudad de destino:* ' + lugar);
      if (limpiar(comp.destino, 120)) L.push('*Dirección o barrio de destino:* ' + limpiar(comp.destino, 120));
      L.push('*Envío:* por cotizar');
    }
    if (t.pendiente) {
      var motivos = []; if (t.envioPorCotizar) motivos.push('envío por cotizar'); if (t.sinPrecio) motivos.push('productos con precio por consultar');
      L.push('*TOTAL:* pendiente de confirmar (' + motivos.join(' y ') + ')');
      L.push('Productos con precio: ' + dinero(t.subtotal));
    } else {
      L.push('*TOTAL:* ' + dinero(t.total));
    }
    L.push('');
    L.push('Origen: catálogo web');
    return L.join('\n');
  }
  function enlace() { return 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(mensaje()); }
  function consulta(p) { return 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent('Hola DANTESTORE 👋, quiero información de: ' + p.nombre + (p.precio ? ' (' + dinero(p.precio) + ')' : '')); }

  function fijar(id, q) { cart[id] = q; guardarCarrito(); avisar('carrito'); }

  window.DS_Carrito = {
    dinero: dinero, porId: porId, max: MAX, campos: CAMPOS, orden: ORDEN, cantidadValida: cantidadValida,
    cantidad: function (id) { return tiene(cart, id) ? cart[id] : 0; },
    /* Devuelve {ok, cantidad, tope}. Rechaza ids inexistentes y cantidades inválidas sin tocar el carrito. */
    agregar: function (id, q) {
      if (typeof id !== 'string' || !porId[id]) return { ok: false, cantidad: 0, tope: false, motivo: 'producto' };
      var n = cantidadValida(q === undefined ? 1 : q); if (!n) return { ok: false, cantidad: this.cantidad(id), tope: false, motivo: 'cantidad' };
      var antes = this.cantidad(id), nuevo = Math.min(antes + n, MAX);
      fijar(id, nuevo); return { ok: true, cantidad: nuevo, tope: antes + n > MAX };
    },
    /* Cambia en +1/−1 (o cualquier entero). Nunca baja de 1 ni pasa del máximo; para quitar un producto usar quitar(). */
    cambiar: function (id, d) {
      if (!tiene(cart, id) || typeof d !== 'number' || !isFinite(d) || Math.floor(d) !== d) return false;
      var n = Math.max(1, Math.min(cart[id] + d, MAX)); if (n === cart[id]) return false; fijar(id, n); return true;
    },
    fijarCantidad: function (id, q) { var n = cantidadValida(q); if (!n || !tiene(cart, id)) return false; fijar(id, n); return true; },
    quitar: function (id) { if (!tiene(cart, id)) return false; delete cart[id]; guardarCarrito(); avisar('carrito'); return true; },
    vaciar: function () { cart = {}; comp = {}; entrega = ''; guardarCarrito(); guardarComprador(); avisar('carrito'); },
    items: items, totales: totales, mensaje: mensaje, enlace: enlace, consulta: consulta, validar: validar, camposVisibles: camposVisibles,
    entrega: function () { return entrega; },
    fijarEntrega: function (e) { entrega = (typeof e === 'string' && tiene(C.entregas, e)) ? e : ''; guardarCarrito(); avisar('carrito'); },
    comprador: function (k) { return k ? (comp[k] || '') : Object.assign({}, comp); },
    fijarDato: function (k, v) { if (!tiene(CAMPOS, k)) return; comp[k] = enEdicion(v, CAMPOS[k].max); guardarComprador(); avisar('datos'); },
    alCambiar: function (f) { oyentes.push(f); },
    cargar: cargar
  };
  cargar();
  // Si el carrito cambia en otra pestaña, esta se actualiza.
  window.addEventListener('storage', function (e) { if (e.key === K.cart || e.key === K.ent || e.key === null) { cargar(); avisar('carrito'); } });
})();
