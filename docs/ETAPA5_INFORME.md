# Etapa 5 - Pruebas finales, auditoría y preparación de publicación (18-nov-2026)
**Rama:** `renovacion-dantestore` · **Base:** commit 0a06836 (etapa 4) · **Commit con las correcciones, pruebas y guía:** `83074796850edd87645ff3ef241cb4e47539830b` · **Commit final de la etapa (agrega este informe y los resultados finales):** el hash exacto se indica en la entrega, porque un commit no puede contener su propio hash.
No se publicó nada. No se hizo merge. No se inició la etapa 6.

## Veredicto: ¿está lista para publicación?
**Técnicamente lista para tu revisión; todavía NO recomiendo publicarla.** Todas las pruebas automáticas pasan (344 de 344), pero faltan tres cosas que yo no puedo cerrar:
1. **Tu prueba en un iPhone real con Safari** (guía lista: `docs/ETAPA5_GUIA_IPHONE.md`). Todo lo que probé fue emulación en Chromium.
2. **Lighthouse y axe-core no se ejecutaron** (sin red para instalarlos). Se hicieron mediciones propias, que no son equivalentes.
3. **Tu autorización de la etapa 6**: la URL oficial sirve el `index.html` de la raíz; publicar la beta como catálogo oficial exige reemplazarlo, ajustar las direcciones de vista previa (`/beta/` → raíz) y quitar `noindex`. No se tocó nada de eso.
La decisión de publicar es tuya.

## Qué se revisó
Catálogo (186 productos, 20 categorías, ids/nombres/precios/descripciones/orden, imágenes, logo, casos especiales, búsqueda, filtros, destacados) · compra completa (agregar/quitar, cantidades 1-99, totales, persistencia, validaciones, las 3 entregas, mensaje de WhatsApp al número autorizado) · seguridad y estabilidad (datos locales dañados, entradas extremas, XSS, privacidad, errores de consola, enlaces y rutas) · **18 casos de dispositivos emulados** (iPhone SE, 14, 14 Pro Max, Pixel 7, Galaxy S9+, iPad, iPad Pro 11, Galaxy Tab S4, cada uno en vertical y horizontal, y escritorio 1366 y 1920) con teclado virtual emulado, desplazamiento y botones · rendimiento · accesibilidad · compartir (Open Graph/Twitter) · noindex · protección de lo que no debía tocarse. Detalle en `docs/ETAPA5_AUDITORIA.md`.

## Qué se corrigió (4 hallazgos; ninguno toca datos comerciales, identidad, fotos originales ni condiciones comerciales)
1. **Manifiesto de imágenes con JSON inválido** (`"psnr_db": Infinity`, 2 líneas). Cambiado a `null` en el archivo y en el generador. No se regeneró ninguna imagen.
2. **Teléfonos en horizontal con el teclado abierto:** el pie fijo del carrito (≈110 px) tapaba el campo que se escribe en 5 de 5 teléfonos emulados. Ahora, con menos de 260 px de alto visible, la hoja del carrito se desplaza completa. No cambia nada en pantallas normales.
3. **Zona táctil del nombre de cada producto:** de 19 a ≈38 px de alto (mínimo WCAG 2.2 AA: 24 px), sin cambio visual.
4. **Recorrido con teclado:** la foto de cada tarjeta sale del orden de Tab porque duplicaba al nombre (≈630 → ≈437 paradas).
Cada corrección se verificó con la prueba que la detectó y luego se repitieron todas las suites.

## Pruebas
| Suite | Resultado |
|---|---|
| Etapa 5 · auditoría final (nueva) | **102 de 102** |
| Etapa 4 · carrito y pedido | 94 de 94 |
| Etapa 3 · catálogo | 66 de 66 |
| Etapa 3b · logo, servidor local, Open Graph | 33 de 33 |
| Etapa 2 · imágenes | 21 de 21 |
| Etapa 1 · datos y respaldo | 28 de 28 |
| **Total** | **344 aprobadas, 0 fallidas** |
Detalle completo: `docs/ETAPA5_RESULTADO_PRUEBAS.txt`.

**Cómo llegué a 0 fallos, con transparencia:** la primera ejecución de la etapa 5 dio 92 de 102. Se resolvieron así: 4 defectos reales de la beta/datos (los de arriba) y 6 problemas de **mis propias pruebas** (un falso positivo por una huella sha256, un límite de recorrido demasiado bajo, una exención de WCAG para el botón desactivado, una medición a mitad de animación, la medición de las opciones de entrega por el círculo y no por la fila, y las guardas que debían aceptar la corrección del manifiesto). Al revisar mi trabajo encontré además un error mío (un comentario `//` que dejó sin efecto las exclusiones de la prueba C11), lo corregí y verifiqué con pruebas negativas que la prueba **sí** detecta un correo o un teléfono ajeno. Las guardas aceptan únicamente el cambio `Infinity` → `null` del manifiesto: se comprobó que cualquier otro cambio las hace fallar.

Rendimiento medido en laboratorio propio (Pixel 7 emulado, red 4G lenta, CPU ×4, sin caché; **no es Lighthouse**): primera pintura 0,70 s · LCP 1,29 s · CLS 0 · TBT 5 ms · 152 KB en la primera carga (código comprimido 43 KB) frente a los 20 MB del catálogo actual; recorrer todo el catálogo descarga 94 miniaturas (957 KB) sin duplicados.

## Qué no pudo probarse
- Safari/WebKit real ni ningún iPhone, Android o tablet físicos (solo emulación).
- Lighthouse y axe-core (sin red).
- Teclado virtual real de iOS (se emuló reduciendo el alto visible).
- Apertura real de WhatsApp desde iPhone (se interceptó el enlace `wa.me` y se verificó su contenido).
- Vista previa al compartir (WhatsApp/Facebook solo leen direcciones públicas).
- **Configuración de GitHub Pages y URL pública:** la API está bloqueada (403) y la dirección no está accesible desde esta sesión. No pude confirmarlas en línea; la evidencia es indirecta (ver verificación de protección). Pasos para comprobarlo tú: guía, parte D.

## Problemas pendientes (ninguno corregido sin tu decisión; lista completa en la auditoría)
1. Prueba en iPhone real (tuya).
2. Nombre de producto en tarjetas ≈38 px (WCAG 2.2 AA ok; 44 px recomendados): subirlo agrega ≈6 px por tarjeta y cambia levemente el diseño.
3. Contraste con poco margen (peor caso 4,59:1; mínimo 4,5).
4. Mejoras de teclado: sin «saltar al pie»; ≈437 paradas hasta el final.
5. Un aviso «agregado» puede tapar ~2 s el encabezado del carrito en teléfonos horizontales (transitorio).
6. Enlaces de WhatsApp de pedidos extremos (186 × 99 productos) son muy largos; existe el texto de respaldo.
7. Decisiones comerciales anteriores sin cambios: 2 productos sin foto, 1 «Consultar», 131 sin descripción, 26 fotos de baja resolución.
8. Estructura de publicación (reemplazo del `index.html`, direcciones de vista previa, `noindex`) = etapa 6.

## Guía para tu iPhone
`docs/ETAPA5_GUIA_IPHONE.md`: abrir la beta con un servidor local gratuito por Wi-Fi (sin publicar nada), y los 10 recorridos pedidos (categorías, búsqueda, fotografías, carrito, cantidades, domicilio en Bogotá, otra ciudad, tienda, y cómo ver el mensaje de WhatsApp **sin enviarlo**), más giro horizontal, tabla para reportarme y cómo comprobar que Pages no cambió.

## Archivos
**Modificados (8):** `beta/LEEME.md`, `beta/css/estilos.css`, `beta/js/app.js`, `data/manifiesto_imagenes.json` (2 líneas), `herramientas/etapa2_optimizar.py`, `herramientas/etapa3_pruebas.js`, `herramientas/etapa3b_verificaciones.js`, `herramientas/etapa4_pruebas.js`.
**Nuevos (43, contando este informe):** `docs/ETAPA5_INFORME.md`, `docs/ETAPA5_AUDITORIA.md`, `docs/ETAPA5_GUIA_IPHONE.md`, `docs/ETAPA5_RESULTADO_PRUEBAS.txt`, 36 capturas en `docs/capturas-etapa5/` (inicio, ventanas emergentes, detalle y carrito en pasos 1 y 2, en varios dispositivos vertical/horizontal, y teclado en horizontal), `herramientas/etapa5_pruebas.js`, `herramientas/etapa5_capturas_teclado.js`, `herramientas/excepcion_manifiesto.js`.
Único archivo fuera de `beta/`, `herramientas/` y `docs/` que cambió: `data/manifiesto_imagenes.json` (hallazgo 1). No cambió nada en la raíz, `img/`, `_respaldo/` ni `data/productos.json`.

## Verificación de protección (hecha al cierre, contra GitHub)
- `main` conserva su commit original `9ef8bc95f5023ec2160e8590c643e26605a5db32`.
- La rama `dantechstore-catalogo` sigue en `b343f5a5e06dc71f93e72006e3a1ae54ea081561`.
- `index.html` y `catalogo-dantestore.html` idénticos a los de `main` (sha256 `9b4ac063…` y `820e1d5f…`).
- Las 321 fotos originales (con el logo del perro Dante) idénticas byte a byte a las de la etapa 1; los respaldos y `data/productos.json` sin cambios.
- Los 186 productos de la beta (id, nombre, categoría, precio, descripción) idénticos a `data/productos.json`.
- Único WhatsApp en toda la beta: 573134724702; sin otros teléfonos ni correos en el repositorio.
- Sin archivos de publicación (CNAME, `.github/workflows`, `_config.yml`, `.nojekyll`) ni dependencias; el repositorio `Catalogo` no se tocó.
- **GitHub Pages / URL oficial:** no se ejecutó ninguna acción sobre Pages y `main` no cambió, así que Pages sigue publicando `main` en `https://dantechstore.github.io/DANTECH/`; **no pude confirmarlo en línea** (límite arriba).
