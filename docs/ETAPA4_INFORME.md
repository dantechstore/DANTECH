# Etapa 4 - Mejora del carrito y del proceso de compra (18-nov-2026)
Rama: renovacion-dantestore (base: 69b8e4c). Cambios solo en beta/, herramientas/ y docs/. main, index.html raíz, catalogo-dantestore.html, GitHub Pages, `Catalogo` y `dantechstore-catalogo` NO se tocaron.
Auditoría previa (antes de programar): docs/ETAPA4_AUDITORIA.md (15 problemas encontrados: 5 altos, 6 medios, 4 bajos).

## Qué cambió
- **Carrito (A):** agregar/quitar, cantidades con − / ＋ (mínimo 1, máximo 99, con aviso al llegar al tope), subtotal por producto y general, quitar individual, «Vaciar carrito» con confirmación propia (cancelable con Esc), conteo de unidades y de productos diferentes, persistencia al recargar y sincronización entre pestañas.
- **Datos del comprador (B):** nombre siempre; Bogotá pide dirección (barrio e indicaciones opcionales); otra ciudad pide ciudad (departamento y destino opcionales); tienda solo el nombre. Los datos viven solo en sessionStorage (se borran al cerrar la pestaña o vaciar) y se elimina el nombre que la versión anterior dejaba guardado de forma permanente.
- **Entrega (C):** las 3 modalidades y sus condiciones quedan idénticas (Bogotá $10.000 contraentrega · otra ciudad por confirmar · tienda gratis). Otra ciudad muestra «Envío: por cotizar» y «Total definitivo: pendiente de cotización»; nunca como gratis ni como $0.
- **Resumen (D):** productos, cantidades, precio unitario y total por producto, subtotal, modalidad, domicilio y total o aviso de pendiente.
- **WhatsApp (E):** mensaje ordenado («PEDIDO DANTESTORE») con todo lo anterior, codificado con encodeURIComponent al único número autorizado. No se vacía el carrito al enviar; después se informa que se conserva y se ofrece vaciarlo. Ejemplos reales: docs/EJEMPLOS_MENSAJE_WHATSAPP.md.
- **Experiencia (F):** carrito en 2 pasos con barra inferior fija («Seguir comprando», «Continuar», «Enviar pedido» siempre visibles), avisos arriba para que no tapen botones, resumen de errores con enlaces a cada campo, campos de 16 px (sin zoom en iPhone), foco y teclado dentro del diálogo.

## Problemas graves que se corrigieron
1. Claves heredadas en el almacenamiento (`constructor`, `__proto__`) rompían el carrito.
2. Cantidades negativas, decimales o texto entraban por la API y daban totales negativos.
3. Se podía enviar el pedido sin nombre y sin entrega.
4. El envío a otra ciudad se mostraba como «Total (sin envío)».
5. Nombres con saltos de línea podían falsear líneas del mensaje (p. ej. un TOTAL).

## Resultados de pruebas (todas ejecutadas de nuevo al cierre)
| Suite | Resultado |
|---|---|
| etapa4_pruebas.js (carrito, pedido, 5 pantallas, consola, 186 productos intactos) | **94 de 94 OK, 0 fallos** |
| etapa3_pruebas.js (catálogo completo) | 66 de 66 OK |
| etapa3b_verificaciones.js (logo, servidor local, Open Graph) | 33 de 33 OK |
| etapa2_validar.py (imágenes) | 21 de 21 OK |
| etapa1_validar.py (datos y respaldo) | ver nota |
Nota: la suite de la etapa 3 pasó de 80 a 66 comprobaciones porque se retiraron las pruebas del carrito anterior (describían la interfaz que esta etapa reemplazó); esa lógica ahora se prueba con más detalle en la suite de la etapa 4. Etapa 1 verificada también después de guardar el commit (la comprobación E1 exige que no haya cambios sin guardar).
Cubre los 20 casos pedidos más extras: teclado, accesibilidad, HTML en el nombre, 18 variantes de datos locales rotos, sincronización entre pestañas y límite de longitud de campos.
Detalle: docs/etapa4_resultado_pruebas.txt. Capturas del proceso completo: docs/capturas-etapa4/ (13).

## Límites conocidos
- Probado en Chromium (Playwright, 5 tamaños: 320, 360, 390, 768, 1280); falta probarlo en un iPhone real (guía: docs/PROBAR_EN_IPHONE.md). El botón de WhatsApp abre wa.me en pestaña nueva; en iPhone depende de que WhatsApp esté instalado.
- No se agregaron tarifas, direcciones, políticas ni teléfonos nuevos. El campo «Indicaciones» es texto libre del cliente.
- No hay número de pedido ni confirmación del lado del negocio: el pedido se concreta cuando el cliente envía el mensaje en WhatsApp.
- Sin accesibilidad formal con axe/Lighthouse (sin red en esta sesión).
