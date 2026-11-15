# Etapa 3 - Catálogo beta (14-nov-2026)
Rama: renovacion-dantestore. Carpeta nueva: beta/. main, index.html, GitHub Pages y la URL pública NO se tocaron.

## Qué se construyó
Catálogo multimarca estático (HTML + CSS + JS sin dependencias): encabezado DANTESTORE con eslogan «Mucho más para ti», portada con botones rápidos
Navidad / Juguetería / Ver todo, buscador, 20 categorías en chips con contador, «Más vendidos» (los 8 originales), tarjetas con miniatura WebP,
detalle con galería de fotos completas, carrito con cantidades, opciones de entrega originales, mensaje de WhatsApp, persistencia en localStorage
y las dos ventanas emergentes (Navidad y Juguetería, una vez al día).

## Pruebas: 80 de 80 OK (docs/etapa3_resultado_pruebas.txt)
Datos (186 productos, 20 categorías, ids/nombres/precios/categorías/descripciones idénticos a productos.json), imágenes (0 rotas, miniaturas en tarjetas,
completas en detalle), buscador, filtros, detalle, carrito y cálculos, WhatsApp (único número 573134724702, mensaje verificado), persistencia, ventanas
emergentes, 5 tamaños de pantalla sin desbordes, controles táctiles >= 44 px, consola sin errores, apertura con file://, archivos protegidos intactos.

## Rendimiento
Primera carga en móvil: ~250 KB (156 KB de código sin comprimir, ~36 KB comprimido, + ~95 KB de las primeras miniaturas). El catálogo publicado pesa 20 MB.

## Pendientes y límites conocidos
- Probado en Chromium (Playwright). Falta probar en un iPhone/Android real y en Safari.
- Accesibilidad: revisada con pruebas propias (contraste >= 4.5:1, foco, Esc, enlace de salto, etiquetas). No se pudo correr axe-core/Lighthouse (sin red para instalarlo).
- Sin ampliación táctil (zoom) más allá de la foto completa de 900 px; las fotos de baja resolución (26) se verán blandas.
- Sin vista previa enriquecida al compartir el enlace (og:image con URL absoluta): se agrega al publicar.
- La beta no es visible en línea hasta que se autorice publicar; se prueba abriendo beta/index.html desde el ZIP de la rama.
