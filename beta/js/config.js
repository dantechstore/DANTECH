/* DANTESTORE beta - Configuración editable (única fuente de números y textos de pedido). */
window.DS_CONFIG = {
  // Único WhatsApp autorizado. No agregar otros números.
  whatsapp: '573134724702',
  // Las rutas de datos.js son relativas a la raíz del repositorio; la beta vive en /beta/.
  rutaRaiz: '../',
  // Prefijo de las claves de almacenamiento local. Distinto del catálogo publicado (dtcart/dtent)
  // porque comparten dominio: así la beta no interfiere con el carrito del catálogo actual.
  prefijo: 'dtb_',
  esBeta: true,
  moneda: 'COP',
  // Opciones de entrega (mismas del catálogo publicado, mismo texto en el mensaje de WhatsApp).
  entregas: {
    dom:    { titulo: 'Domicilio en Bogotá', icono: '🛵', detalle: '+$10.000 · pago contraentrega', costo: 10000, mensaje: 'Domicilio en Bogotá (+$10.000, pago contraentrega)' },
    otra:   { titulo: 'Envío a otra ciudad', icono: '🚚', detalle: 'Te confirmamos el valor del envío', costo: 0, mensaje: 'Envío a otra ciudad (valor del envío por confirmar)' },
    tienda: { titulo: 'Recoger en tienda', icono: '🏪', detalle: 'Gratis', costo: 0, mensaje: 'Recoger en tienda (gratis)' }
  },
  cantidadMaxima: 99,
  // Precaución (no es un límite verificado de WhatsApp): sobre esta longitud de enlace se avisa al cliente y se ofrece copiar el mensaje.
  urlAvisoLongitud: 4000,
  // Las ventanas emergentes se muestran una vez al día por visitante.
  popupsUnaVezAlDia: true
};
