# Cómo probar la beta en un iPhone (sin publicar nada)

Ninguna de estas opciones toca GitHub Pages, `main` ni la URL oficial.

## Opción A (recomendada): servidor local por Wi-Fi — gratis, sin Internet, sin cuentas
Necesitas: tu computador y tu iPhone en **la misma red Wi-Fi**, y Python (gratis; en Mac ya viene instalado).

1. En GitHub abre la rama `renovacion-dantestore` → **Code → Download ZIP**. Descomprímelo (queda una carpeta `DANTECH-renovacion-dantestore`).
2. **Windows:** si no tienes Python, instálalo desde https://www.python.org/downloads/ y marca la casilla **«Add python.exe to PATH»**.
3. Abre la carpeta `herramientas` y haz **doble clic en `PROBAR_BETA_EN_IPHONE.bat`** (Mac/Linux: en Terminal, dentro de la carpeta, `python3 herramientas/servir_beta.py`).
4. Si Windows pregunta por el Firewall, elige **«Redes privadas» → Permitir acceso**.
5. En la ventana negra aparecen dos direcciones. La que dice **«En tu iPhone»** es del estilo `http://192.168.1.25:8000/beta/`.
6. En el iPhone, abre **Safari**, escribe esa dirección exacta y listo.
7. Al terminar, cierra la ventana (o Ctrl+C). El servidor es de solo lectura y solo muestra `beta/`, `img/` y `data/`.

Si no abre: comprueba que ambos estén en el mismo Wi-Fi (no «red de invitados»), que no haya VPN activa, y que Windows permitió Python en el Firewall. Para ver tu IP en Windows: `ipconfig` (línea «Dirección IPv4»).
Tip: agrega `#sinpopups` al final de la dirección para ocultar las ventanas emergentes mientras pruebas.

## Opción B: copia temporal gratuita en Netlify Drop (si tu iPhone está en otra red)
Entra a https://app.netlify.com/drop, arrastra una carpeta que contenga **`beta/`, `img/` y `data/`** (juntas, sin `_respaldo`) y abre la dirección que te da, terminando en `/beta/`.
Aviso: esa copia queda **pública con un enlace** hasta que la borres; úsala solo si te sirve y bórrala después. No afecta GitHub.

## Opción C: túnel temporal (avanzado)
Con el servidor de la opción A encendido, `cloudflared tunnel --url http://localhost:8000` (gratis, https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) da una dirección temporal; añade `/beta/`. Se cierra al detener el comando.

## Qué revisar en el iPhone (5 minutos)
1. Encabezado: se ve el logo del perro Dante junto a «DANTESTORE · Mucho más para ti», sin recortes bajo la isla dinámica.
2. Portada y botones Navidad / Juguetería / Ver todo.
3. Las dos ventanas emergentes (la primera vez) y que se cierran.
4. Buscar «airpods» con el teclado del iPhone; el teclado no tapa nada.
5. Tocar una categoría y volver a «Todo».
6. Abrir un producto, pasar fotos deslizando, y volver con el gesto/botón Atrás (debe cerrar el detalle, no salir de la página).
7. Agregar 2 productos, abrir el carrito, cambiar cantidades y elegir entrega.
8. **Enviar pedido por WhatsApp**: debe abrir WhatsApp con el mensaje completo (productos, cantidades, total) hacia +57 313 472 4702. No envíes el mensaje si es solo prueba.
9. Cerrar Safari, volver a abrir la dirección: el carrito debe seguir ahí.
10. Girar el teléfono (horizontal) y comprobar que nada se desborda.

Anota cualquier cosa rara con una captura de pantalla.

## Vista previa al compartir (Open Graph)
Está preparada en `beta/index.html`, pero WhatsApp/Facebook solo la leen desde una dirección pública. Con la beta en el servidor local **no se ve**; se comprueba al publicar (WhatsApp, o https://developers.facebook.com/tools/debug/ para refrescar la caché).
