# Etapa 5 - Auditoría técnica de la beta (18-nov-2026)
Base: commit 0a06836 (rama renovacion-dantestore). Alcance: carpeta beta/ servida como lo haría GitHub Pages (ruta /DANTECH/beta/, gzip) desde 127.0.0.1. Nada se publicó ni se tocó en main, Pages, index.html, catalogo-dantestore.html, Catalogo ni dantechstore-catalogo.
Método: script propio `herramientas/etapa5_pruebas.js` (102 verificaciones, Playwright + Chromium) + las suites de las etapas 1 a 4 + lectura del código.

## Límites de honestidad (qué NO es esta auditoría)
- **Sin dispositivos físicos ni Safari real.** «iPhone» y «Android» son emulaciones sobre Chromium (tamaño, píxeles, tacto, agente de usuario). WebKit/Safari no está instalado en este entorno. El comportamiento real de Safari iOS (teclado, barra de direcciones, gestos, apertura de WhatsApp) **no se probó**; por eso existe la guía para tu iPhone.
- **Sin Lighthouse ni axe-core.** No hay red para instalarlos (sin npm/pip). No se inventó ningún puntaje. Lo que se hizo en su lugar son mediciones y comprobaciones propias (LCP/FCP/CLS/TBT con CPU y red limitadas; contraste WCAG calculado sobre estilos reales; nombres accesibles; foco; áreas táctiles). **No equivalen** a una auditoría Lighthouse/axe; conviene correrlas en tu navegador (Chrome → F12 → Lighthouse) cuando se publique.
- **Teclado virtual emulado** reduciendo el alto visible; Safari iOS no reduce la ventana igual. Hay que confirmarlo en el iPhone (guía, puntos 6 y 9).
- **GitHub Pages:** la API de Pages está bloqueada desde esta sesión (403) y la URL pública no está en la lista de acceso, así que **no pude leer su configuración ni abrirla**. La evidencia indirecta es: main sin cambios (9ef8bc9), ningún archivo de publicación en la rama (sin CNAME, .github, _config.yml, .nojekyll) y que no se ejecutó ninguna orden sobre Pages. Cómo comprobarlo tú: guía, parte D.

## Qué se revisó y resultado
| Área | Comprobaciones (id) | Resultado |
|---|---|---|
| Catálogo: 186 productos, 20 categorías, ids/nombres/precios/descripciones/orden idénticos a productos.json; 8 más vendidos; etiquetas NUEVO (36) | A1-A3, A8-A9, H7 | OK |
| Casos especiales: 2 sin foto («Foto próximamente», abribles), 1 «Consultar», 131 sin descripción sin texto inventado | A3, A4, A6b | OK |
| Imágenes: 642 WebP existen y coinciden con el manifiesto; 0 rotas; width/height; sin carga de originales; carga diferida 192/192 | A5, G2-G4, E3-E6 | OK |
| Logo original del perro Dante: sha256 igual al publicado; sin filtros ni recortes; visible en los 18 tamaños probados | H5, D:* | OK |
| Búsqueda (15 consultas), filtros (20 categorías), enlaces directos y hashes hostiles | A10-A12 | OK |
| Compra: agregar/quitar, cantidades 1-99, subtotales, persistencia, validaciones, 3 entregas (Bogotá +$10.000, otra ciudad pendiente de cotización, tienda gratis), mensaje completo a 573134724702 | B1-B16 + etapa4 (94) | OK |
| Pedido extremo (186 productos × 99): no se rompe; mensaje 11.026 caracteres, enlace 18.252 | B15 | OK, ver «Pendientes» |
| Seguridad: XSS en buscador/campos/hash, almacenamiento local hostil, entradas de 10.000 caracteres, almacenamiento bloqueado, sin eval/fetch/on*=, sin cookies, noindex, rel=noopener | C1-C13 | OK |
| Privacidad: nombre/dirección/ciudad solo en sessionStorage (se borran al cerrar pestaña y al vaciar); nada personal en localStorage; sin correos ni teléfonos ajenos en el repositorio | B12, C4, C5, C11 | OK |
| Dispositivos (vertical y horizontal): iPhone SE, 14, 14 Pro Max, Pixel 7, Galaxy S9+, iPad, iPad Pro 11, Galaxy Tab S4, escritorio 1366 y 1920 = 18 casos: sin desbordes, popups dentro de pantalla, Continuar/Seguir/Enviar visibles y ≥44 px, campos ≥16 px, teclado emulado | D:* | OK (tras corrección 2) |
| Rendimiento (Pixel 7 emulado, 4G lenta, CPU ×4, sin caché): FCP 0,70 s · LCP 1,29 s · CLS 0 · TBT 5 ms; 152 KB totales en la primera carga (43 KB de código comprimido); recorrer todo el catálogo = 94 miniaturas, 957 KB, sin duplicados | E1-E8 | OK (laboratorio propio, no Lighthouse) |
| Accesibilidad: idioma, un h1, jerarquía sin saltos, landmarks, enlace «Saltar al catálogo», 631 controles con nombre, 193 imágenes con alt, contraste AA en 1.765 textos (peor 4,59:1), foco visible, modales con foco atrapado y Esc, reducir movimiento, modo oscuro | F1-F12 | OK |
| Compartir: Open Graph y Twitter Card completos, imagen 1200×630 de 88 KB sin fotos de producto; beta con noindex | F13, C13 | OK |
| Protección: main 9ef8bc9, dantechstore-catalogo b343f5a, index.html y catalogo-dantestore.html idénticos, 321 originales idénticos byte a byte, productos.json y respaldos sin cambios | H1-H9 | OK |

## Hallazgos y correcciones (todas dentro de lo permitido: no tocan datos comerciales, identidad, fotos originales, condiciones comerciales ni el catálogo oficial)
| # | Gravedad | Hallazgo | Corrección | Prueba que lo verifica |
|---|---|---|---|---|
| 1 | Media | **Manifiesto de imágenes con JSON inválido.** `data/manifiesto_imagenes.json` (etapa 2) tenía `"psnr_db": Infinity` en 2 líneas (el logo, sin pérdida). Python lo acepta; cualquier lector JSON estricto (Node, navegadores, otras herramientas) lo rechaza. | `Infinity` → `null` en esas 2 líneas y en el generador `etapa2_optimizar.py`. No se regeneró ni se tocó ninguna imagen. | etapa5 G2, etapa2_validar (21/21); las guardas antiguas aceptan **solo** ese cambio (probado que rechazan cualquier otro) |
| 2 | Media | **Teléfono en horizontal con teclado abierto: el campo que se escribe quedaba tapado** por el pie fijo del carrito (≈110 px) en los 5 teléfonos (alto visible de 150-210 px). | CSS: con alto visible < 260 px la hoja del carrito se desplaza completa y el pie queda al final (`@media(max-height:260px)`). No cambia nada en pantallas normales. | etapa5 D:* horizontales (5 casos fallaban, ahora OK) + captura `teclado-horizontal_*` |
| 3 | Baja | **Zona táctil del nombre de cada tarjeta de 19 px de alto** (194 botones), bajo el mínimo de 24 px de WCAG 2.2 AA. | El botón ocupa el alto que el título ya reservaba (`min-height:2.5em` ≈ 38 px). Sin cambio visual ni de distribución. | etapa5 F14 |
| 4 | Baja | **Doble parada de Tab por producto** (foto y nombre abren el mismo detalle): ≈630 paradas hasta el pie de la página. | La foto sale del orden de Tab (`tabindex="-1"`); sigue funcionando con toque y ratón. Quedan ≈437 paradas. | etapa5 F7 |

### Ajustes a mis propias pruebas (para que se sepa exactamente qué se cambió y por qué)
No fueron defectos de la beta; se corrigió la prueba o su criterio, no el producto:
- **C11**: una huella sha256 que empieza con dígitos se leyó como teléfono (falso positivo). Ahora se ignoran las cadenas hexadecimales de 64 caracteres.
- **F7**: el recorrido con Tab se detenía en 420 paradas y la página tiene más; se amplió el límite a 1.000.
- **F4**: el botón «−» desactivado (1 unidad) sale con 2,25:1. WCAG 1.4.3 exime a los controles deshabilitados; se excluyen de esa medición. (El «−» sigue visible, solo atenuado.)
- **Popup (escritorio 1920)**: se midió el botón de cerrar a mitad de la animación de aparición de 0,35 s (39 px). Se mide con la animación terminada.
- **F14**: en las opciones de entrega se mide la fila completa (label), que es lo que se toca, no el círculo de 22 px.
- **H8 y guardas de etapas 3, 3b y 4**: aceptan la excepción del hallazgo 1 y solo esa.

## Pendientes y observaciones (sin corregir; ninguna bloquea, algunas requieren tu decisión)
1. **Prueba en iPhone/Safari real: pendiente** (tuya; guía lista). Es el principal riesgo no cubierto.
2. **Lighthouse y axe: no ejecutados** (sin red). Recomendado correrlos al publicar.
3. El nombre en las tarjetas mide ≈38 px (cumple WCAG 2.2 AA mínimo 24 px, no los 44 px recomendados). Subir a 44 px agregaría ≈6 px de alto a cada tarjeta; **cambia levemente el diseño, por eso no lo hice sin tu aprobación.**
4. Navegación con teclado: ≈437 paradas hasta el pie (hay «Saltar al catálogo», pero no «Saltar al pie» ni al carrito). Aceptable en catálogos largos; mejorable.
5. Un aviso «agregado al carrito» puede tapar ~2 s el encabezado del carrito si se abre justo después (se ve en teléfonos horizontales). Es transitorio y no tapa botones de acción.
6. Contraste: el peor caso es 4,59:1 (mínimo 4,5). Cumple, con poco margen; cualquier cambio de color de marca debe volver a medirse.
7. Pedido extremo (los 186 productos × 99): el enlace de WhatsApp mide 18.252 caracteres. Funciona en pruebas, pero algunos teléfonos pueden rechazar enlaces tan largos; para eso existe el texto de respaldo («¿No se abre WhatsApp?»). Un pedido real nunca se acerca a eso.
8. Decisiones comerciales previas que siguen igual: 2 productos sin foto, 1 «Consultar», 131 sin descripción, 26 fotos de baja resolución, 2 «Carro control remoto» con precios distintos.
9. La vista previa para compartir no puede probarse hasta que la beta sea pública (WhatsApp/Facebook leen solo direcciones públicas). Sus direcciones apuntan a `/DANTECH/beta/` y deben cambiarse a `/DANTECH/` y quitar `noindex` al publicar (etapa 6).
10. **Estructura de publicación (para tu decisión, no se tocó):** la URL oficial sirve el `index.html` de la raíz de main; la beta vive en `/beta/`. Publicarla como catálogo oficial implica reemplazar el index.html (y arreglar rutas relativas, Open Graph y noindex). Es la etapa 6 y requiere tu autorización.
