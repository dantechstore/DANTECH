/* DANTESTORE beta - Carrito (lógica sin interfaz).
 * Guarda SOLO {id: cantidad}; nombre y precio se leen siempre de los datos, así un cambio de precio
 * nunca deja precios viejos en un carrito guardado. Mensaje de WhatsApp = mismo formato del catálogo publicado. */
(function () {
  'use strict';
  var C = window.DS_CONFIG, D = window.DANTESTORE_DATOS;
  var K = { cart: C.prefijo + 'cart', ent: C.prefijo + 'ent', nom: C.prefijo + 'nombre' };
  var porId = {}; D.productos.forEach(function (p) { porId[p.id] = p; });
  var cart = {}, entrega = '', nombre = '';
  var oyentes = [];

  function leer(k, def) { try { var v = localStorage.getItem(k); return v === null ? def : v; } catch (e) { return def; } }
  function escribir(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento: el carrito vive solo en memoria */ } }
  function guardar() { escribir(K.cart, JSON.stringify(cart)); escribir(K.ent, entrega); escribir(K.nom, nombre); oyentes.forEach(function (f) { f(); }); }

  // Formato de dinero: $1.234.567 (punto como separador de miles, igual al catálogo publicado).
  function dinero(n) { return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  function cargar() {
    var raw = {}; try { raw = JSON.parse(leer(K.cart, '{}')) || {}; } catch (e) { raw = {}; }
    cart = {};
    Object.keys(raw).forEach(function (id) {            // descarta ids que ya no existen y cantidades inválidas
      var q = parseInt(raw[id], 10);
      if (porId[id] && q > 0) cart[id] = Math.min(q, C.cantidadMaxima);
    });
    var e = leer(K.ent, ''); entrega = C.entregas[e] ? e : '';
    nombre = leer(K.nom, '');
  }

  function items() {
    return Object.keys(cart).map(function (id) { return { p: porId[id], q: cart[id], total: (porId[id].precio || 0) * cart[id] }; });
  }
  function totales() {
    var sub = 0, unidades = 0, sinPrecio = 0;
    items().forEach(function (i) { sub += i.total; unidades += i.q; if (!i.p.precio) sinPrecio += 1; });
    var env = entrega && C.entregas[entrega] ? C.entregas[entrega].costo : 0;
    return { subtotal: sub, envio: env, total: sub + env, unidades: unidades, lineas: Object.keys(cart).length, sinPrecio: sinPrecio };
  }
  function mensaje() {
    var t = totales(), E = entrega ? C.entregas[entrega] : null;
    var lineas = items().map(function (i) { return '• ' + i.q + ' × ' + i.p.nombre + (i.p.precio ? ' — ' + dinero(i.p.precio) + ' c/u' : ''); });
    return 'Hola DANTESTORE 👋, quiero pedir:\n' + lineas.join('\n') +
      '\nSubtotal: ' + dinero(t.subtotal) +
      '\nEntrega: ' + (E ? E.mensaje : 'por definir') +
      '\nTotal' + (entrega === 'otra' ? ' (sin envío)' : '') + ': ' + dinero(t.total) +
      '\nOrigen: catálogo web\nMi nombre: ' + nombre;
  }
  function enlace() { return 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(mensaje()); }
  function consulta(p) { return 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent('Hola DANTESTORE 👋, quiero información de: ' + p.nombre + (p.precio ? ' (' + dinero(p.precio) + ')' : '')); }

  window.DS_Carrito = {
    dinero: dinero, porId: porId,
    cantidad: function (id) { return cart[id] || 0; },
    agregar: function (id, q) { if (!porId[id]) return; cart[id] = Math.min((cart[id] || 0) + (q || 1), C.cantidadMaxima); guardar(); },
    cambiar: function (id, d) { if (!cart[id]) return; var n = cart[id] + d; if (n <= 0) delete cart[id]; else cart[id] = Math.min(n, C.cantidadMaxima); guardar(); },
    quitar: function (id) { delete cart[id]; guardar(); },
    vaciar: function () { cart = {}; guardar(); },
    items: items, totales: totales, mensaje: mensaje, enlace: enlace, consulta: consulta,
    entrega: function () { return entrega; },
    fijarEntrega: function (e) { entrega = C.entregas[e] ? e : ''; guardar(); },
    nombre: function () { return nombre; },
    fijarNombre: function (n) { nombre = String(n || '').slice(0, 60); escribir(K.nom, nombre); oyentes.forEach(function (f) { f(true); }); },
    alCambiar: function (f) { oyentes.push(f); },
    cargar: cargar
  };
  cargar();
})();
