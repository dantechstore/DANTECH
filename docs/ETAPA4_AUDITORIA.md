# Etapa 4 - Auditoría del carrito (antes de modificar código)
Fecha: 17-nov-2026 · Base: commit 69b8e4c (rama renovacion-dantestore) · Código auditado: beta/js/carrito.js, beta/js/app.js (sección carrito), beta/js/config.js, beta/css/estilos.css.
Método: lectura del código y sondeo con Chromium (scripts de prueba reales contra la beta, 390×844). Nada del catálogo publicado se tocó.

## Lo que funciona bien (se conserva)
- Carrito guarda solo {id: cantidad}; nombre y precio se leen siempre de los datos.
- Persistencia al recargar, tope de 99 por producto, 3 modalidades de entrega con los textos originales, enlace a wa.me con el único número autorizado.
- Datos locales rotos (JSON inválido, texto, números, null, cantidades no numéricas) se descartan sin error.

## Problemas encontrados
| # | Gravedad | Problema | Evidencia |
|---|---|---|---|
| 1 | Alta | **Datos locales con claves como `constructor` o `toString` rompen el carrito**: se cargan como si fueran productos (`SIN-PRODUCTO`), suman unidades y el panel del carrito lanza error y queda vacío. | `localStorage dtb_cart={"constructor":2}` → `unidades:2`, `Cannot read properties of undefined (reading '0')`, panel sin contenido |
| 2 | Alta | **Cantidades inválidas por la API**: `agregar(id,-5)` deja cantidad −5 y total −$500.000; `agregar(id,2.5)` deja 2,5 unidades; `agregar(id,'abc')` deja cantidad `null`. | Sondeo en consola |
| 3 | Alta | **Se puede enviar el pedido sin nombre y sin elegir entrega**: el botón siempre está activo y el mensaje sale con «Entrega: por definir» y «Mi nombre: » vacío. | Enlace generado con carrito de 1 producto, sin datos |
| 4 | Alta | **No hay dirección ni ciudad**: para domicilio en Bogotá o envío a otra ciudad el pedido no lleva datos de destino. | `carrito.js` solo conoce `nombre` |
| 5 | Alta | **Envío a otra ciudad se presenta como «Total (sin envío): $X»**: ambiguo; el total no dice que está pendiente de cotización (el costo interno es 0). Lo mismo si el carrito incluye un producto «Consultar». | Resumen y mensaje |
| 6 | Media | El mensaje de WhatsApp no trae el total por producto (solo precio unitario), ni cantidad de unidades, ni aviso de productos «Consultar». | Mensaje generado |
| 7 | Media | **Datos personales guardados en localStorage sin necesidad**: el nombre queda guardado de forma permanente (`dtb_nombre`). Con dirección sería peor. | `localStorage.dtb_nombre = "Ana"` |
| 8 | Media | Un nombre con saltos de línea (`Ana\nPérez`) rompe el formato del mensaje; no hay límites de longitud para otros campos ni limpieza de espacios. | Mensaje con `\r` intermedio |
| 9 | Media | **El botón «Enviar pedido» queda fuera de pantalla** con carritos de 3+ productos (con 6 productos: a 1345 px en una pantalla de 844). No hay botón «Continuar» ni pasos. | Medición de posición |
| 10 | Media | No se muestra cuántos productos distintos ni cuántas unidades hay dentro del panel del carrito (solo la insignia de unidades). | Revisión de la interfaz |
| 11 | Media | «Vaciar carrito» pide confirmación cambiando el texto del botón durante 3 s; frágil (se repinta con cualquier cambio) y poco claro. | `app.js`, acción `vaciar` |
| 12 | Baja | El botón «+» sigue activo en 99 y no explica por qué no suma más. | Sondeo: `disabled:false` |
| 13 | Baja | No hay validación de campos ni mensajes de error accesibles (aria-live / aria-invalid). | Revisión |
| 14 | Baja | El carrito no se sincroniza entre pestañas abiertas (sin evento `storage`). | Revisión |
| 15 | Baja | Tras abrir WhatsApp no hay indicación de que el carrito se conserva ni forma clara de vaciarlo cuando el cliente ya envió. (No se vacía antes: correcto.) | Revisión |

## Plan de implementación (todo dentro de beta/, sin tocar datos ni configuración de pedidos)
1. `carrito.js`: normalizar cantidades (enteros 1–99; ignora NaN/negativos/decimales), ignorar claves heredadas (`constructor`, `__proto__`…), validar datos del comprador, construir mensaje completo y estado «total pendiente».
2. Datos del comprador solo en memoria + sessionStorage (se borra al cerrar la pestaña y al vaciar); se elimina la clave antigua `dtb_nombre`.
3. Panel en 2 pasos (Carrito → Entrega y datos) con barra inferior fija con «Continuar» / «Enviar pedido» siempre visible; resumen completo; confirmación propia para vaciar.
4. Campos según modalidad: Bogotá (dirección*, barrio/localidad, indicaciones); otra ciudad (ciudad*, departamento, dirección/barrio destino); tienda (solo nombre).
5. Mensaje de WhatsApp profesional con totales por producto, datos de entrega y «TOTAL: pendiente de cotización del envío» cuando aplique.
6. Pruebas automáticas (carrito, validaciones, mensaje, 5 tamaños de pantalla, consola, datos de 186 productos idénticos) y capturas.

Restricciones respetadas: 3 modalidades y tarifas sin cambios ($10.000 Bogotá, otra ciudad por confirmar, tienda gratis), único WhatsApp 573134724702, sin números de terceros, sin tarifas/políticas nuevas, sin dependencias.
