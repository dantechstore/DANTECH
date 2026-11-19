# DANTESTORE beta — Etapa 6: calidad final y preparación para publicación

Rama: `renovacion-dantestore` · Código: `87724bd` + `a377a4e` · **Nada publicado, `main` y Pages intactos.**

> **Importante:** la beta **NO está validada físicamente en iPhone**. Esa prueba sigue **pendiente** (guía en `docs/ETAPA5_GUIA_IPHONE.md`). Todo lo medido aquí es emulación en Chromium.

## Correcciones (solo las justificadas por la auditoría de la Etapa 5)

| # | Hallazgo | Corrección | Prueba |
|---|---|---|---|
| 1 | Contraste con poco margen (peor 4.59:1; `--oro-osc` 3.82:1 sobre `--linea`) | Se oscurecieron 4 colores de texto: `--suave` #6B6154→#5A5144, `--oro-osc` #8A6A1F→#765912, `--wa` #0B7A6B→#09695C, `--wa-osc` #075E52→#064E45. Peor caso ahora 4.95:1 (y 5.02:1 medido en toda la página real). Mismo tono, solo más oscuro. | C1–C5 |
| 2 | Botón del nombre de producto ≈38 px | `padding:4px 0; margin:-4px 0`: área táctil real de 45.5 px **sin mover el diseño** (la caja del nombre sigue en 37.5 px; el botón «Agregar» no queda tapado). Medido en 31 tarjetas × 3 anchos (320, 390, 768). | T-* |
| 3 | Solo existía «Saltar al catálogo» | 3 accesos rápidos por teclado: catálogo, buscar/categorías y pie de página (con contacto). Llevan el foco al destino sin cambiar el hash ni el historial. | S1–S11 |
| 4 | Aviso (toast) tapaba el encabezado del carrito ~2 s | Con una capa abierta (carrito/detalle) el aviso se centra en vertical. Se vio que también ocurría en vertical en pantallas pequeñas (iPhone SE), no solo en horizontal. Verificado en 3 horizontales y 2 verticales: no tapa título, botón ✕ ni el pie con «Continuar/Enviar». | A-*, A2-* |
| 5 | Pedidos muy grandes → enlace de WhatsApp larguísimo | Medido: 186 productos ×99 = mensaje de 10.939 caracteres / enlace de 18.104. Sobre 4.000 caracteres de enlace (`urlAvisoLongitud`, precaución **no verificada** como límite real de WhatsApp) se muestra un aviso, el respaldo «¿No se abre WhatsApp?» queda abierto y hay un botón **Copiar mensaje** (con alternativa si el portapapeles falla). El mensaje no se recorta ni cambia; el pedido normal se comporta igual que antes. | G0–G8 |
| 6 | Revisión móvil / persistencia / checkout | Sin defectos nuevos: carrito sobrevive a recargar, datos del comprador solo en sessionStorage, validación antes de abrir WhatsApp, almacenamiento bloqueado no rompe el carrito, zoom permitido, campos ≥16 px (evita zoom de iOS), sin desborde a 320 px. | M1–M9 |

Sin cambios comerciales: domicilio Bogotá $10.000 contraentrega, otra ciudad por confirmar, recoger gratis, máximo 99, único WhatsApp 573134724702 (P4, P5). 186 productos, `index.html` y `catalogo-dantestore.html` intactos (P1–P3).

## Archivos modificados
`beta/css/estilos.css`, `beta/index.html`, `beta/js/app.js`, `beta/js/config.js` (nueva clave `urlAvisoLongitud`), `herramientas/etapa6_pruebas.js` (nuevo), `herramientas/etapa4_pruebas.js`, `herramientas/etapa5_pruebas.js`, `docs/capturas-etapa6/` (3 capturas), `docs/ETAPA6_INFORME.md`, `docs/ETAPA6_RESULTADO_PRUEBAS.txt`.

## Pruebas
Total **399/399** (28+21+66+33+94+102+55). Detalle literal en `docs/ETAPA6_RESULTADO_PRUEBAS.txt`.
Ajustes a pruebas antiguas, por cambios intencionales (no se relajó ninguna protección): Etapa 4 **C1** compara `config.js` ignorando la clave nueva; Etapa 4 **F2** ya no exige que el aviso esté arriba, solo que no tape botones; Etapa 5 **C11** deja de escanear los informes de resultados, que citan el texto que la prueba busca (falso positivo propio).

## Pruebas que NO se pudieron ejecutar
- Safari/WebKit y **iPhone físico** (pendiente, prioritario antes de publicar); Android físico.
- Teclado real de iOS/Android (se emula con viewport reducido).
- Apertura real de WhatsApp (la llamada a `wa.me` se intercepta); el límite real de longitud de enlace de WhatsApp no está verificado.
- Lighthouse y axe-core (sin red); lectores de pantalla reales (VoiceOver/TalkBack).
- Configuración de GitHub Pages y URL pública (no accesibles desde la sesión; no se tocan).
- Vista previa al compartir en WhatsApp/Facebook.

## Pendiente antes de publicar (decisión exclusiva del dueño)
1. Prueba física en iPhone. 2. Quitar `noindex` y cambiar las URL `og:` de `/DANTECH/beta/` a `/DANTECH/` solo al autorizar. 3. Decidir publicación/merge.
