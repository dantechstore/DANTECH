# DANTESTORE · Catálogo BETA

Versión de prueba del nuevo catálogo. **No reemplaza** al catálogo publicado (`/index.html` en la raíz).
Sitio 100 % estático: sin servidores, sin bases de datos, sin servicios pagos ni librerías externas.

## Cómo abrirla
- **En tu computador:** descarga la rama como ZIP, descomprime y abre `beta/index.html` con doble clic.
- **Con GitHub Pages:** quedaría en `https://dantechstore.github.io/DANTECH/beta/` solo cuando se autorice publicar (hoy Pages sirve solo `main`).
- Agrega `#sinpopups` a la dirección para ocultar las ventanas emergentes al probar.

## Probar en iPhone
Guía paso a paso: `docs/ETAPA5_GUIA_IPHONE.md` (servidor local gratuito por Wi-Fi: `herramientas/PROBAR_BETA_EN_IPHONE.bat` en Windows; otras alternativas en `docs/PROBAR_EN_IPHONE.md`).

## Estructura
```
beta/
├── index.html        Estructura de la página (encabezado, portada, buscador, categorías, pie)
├── img/og-dantestore.jpg   Imagen de vista previa al compartir (1200×630): logo original + eslogan, sin fotos de productos
├── css/estilos.css   Todos los estilos (móvil primero, adapta a tablet y escritorio)
└── js/
    ├── config.js     WhatsApp autorizado, opciones de entrega, claves de almacenamiento (editable)
    ├── datos.js      GENERADO desde data/productos.json (no editar a mano)
    ├── carrito.js    Lógica del carrito, validaciones y mensaje de WhatsApp (sin interfaz)
    └── app.js        Interfaz: tarjetas, búsqueda, filtros, detalle, carrito, ventanas emergentes
```
Las fotos se leen de `../img/miniaturas/` (tarjetas) y `../img/completas/` (detalle). Las originales no se usan ni se tocan.

## Cómo se actualizan los datos
1. Cambia `data/productos.json` (la fuente única).
2. Ejecuta `python3 herramientas/etapa3_generar_datos.py` para regenerar `beta/js/datos.js`.
3. Ejecuta `node herramientas/etapa3_pruebas.js` para verificar todo (66 comprobaciones), `node herramientas/etapa4_pruebas.js` (94 del carrito y el pedido) y `node herramientas/etapa5_pruebas.js` (102 de auditoría final: dispositivos emulados, seguridad, rendimiento, accesibilidad y protección).

## Notas importantes
- El carrito guarda solo `{id: cantidad}`; nombre y precio se leen siempre de los datos (nunca hay precios viejos).
- Los datos del comprador (nombre, dirección, ciudad) viven solo en `sessionStorage`: se borran al cerrar la pestaña o al vaciar el carrito y nunca van a `localStorage`.
- El carrito tiene 2 pasos (Carrito → Entrega y datos) con los botones principales siempre visibles. Las 3 modalidades de entrega y sus condiciones no cambiaron.
- Claves de almacenamiento propias (`dtb_*`): no se mezclan con el carrito del catálogo publicado (`dtcart`/`dtent`), aunque comparten dominio.
- La beta lleva `noindex` (Google no la indexa). Quitar esa línea solo al publicar.
- Las etiquetas «Pocas unidades» / «Unidades limitadas» son estrategia de marketing (el negocio es bajo pedido), no inventario real.
- **Logo:** se usa el logo original sin cambios (`img/originales/_logo-marca.png`; copia sin pérdida en WebP). No se recorta, enmarca ni filtra.
- **Al publicar:** en `beta/index.html` cambiar `/DANTECH/beta/` por `/DANTECH/` en `og:url`, `og:image` y `twitter:image`, y quitar `noindex`.
