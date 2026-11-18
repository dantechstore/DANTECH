# DANTESTORE beta · Guía para probar en tu iPhone (paso a paso)

**Para qué sirve:** que tú mismo veas la beta en tu iPhone real, con Safari, antes de decidir si se publica. Es la única prueba que yo no puedo hacer por ti: mis pruebas fueron en emulación, no en un iPhone ni en Safari reales.

**Qué NO hace esta guía:** no publica nada, no cambia GitHub Pages y no toca tu catálogo actual. La beta solo se ve mientras el computador esté encendido con la ventana negra abierta.

Tiempo estimado: 15 minutos. Ten a mano un computador con Windows (o Mac) y tu iPhone, **ambos en el mismo Wi-Fi**.

---

## PARTE A · Cómo abrir la beta en tu iPhone

### Paso A1 · Descargar la rama (en el computador)
1. Abre esta dirección: https://github.com/dantechstore/DANTECH/archive/refs/heads/renovacion-dantestore.zip
2. Se descarga un ZIP de unos 60 MB. Descomprímelo (clic derecho → «Extraer todo»). Queda la carpeta `DANTECH-renovacion-dantestore`.

### Paso A2 · Tener Python (gratis)
1. Menú Inicio → escribe `cmd` → Enter. En la ventana escribe `py --version` y Enter.
2. Si aparece un número (por ejemplo `Python 3.12`), ya lo tienes. Si no, instálalo desde https://www.python.org/downloads/ y **marca «Add python.exe to PATH»**. (En Mac ya viene instalado.)

### Paso A3 · Encender la beta (en el computador)
1. Abre la carpeta descomprimida → entra a `herramientas`.
2. **Doble clic en `PROBAR_BETA_EN_IPHONE.bat`** (en Mac: abre Terminal en la carpeta y escribe `python3 herramientas/servir_beta.py`).
3. Si Windows pregunta por el Firewall, elige **«Redes privadas» → Permitir acceso**.
4. Aparece una ventana negra con una línea así:
   `En tu iPhone (mismo Wi-Fi):   http://192.168.1.25:8000/beta/`
   (los números cambian en cada casa). **Déjala abierta.**

### Paso A4 · Abrirla en el iPhone
1. Abre **Safari** (no la app de GitHub ni otro navegador).
2. Escribe la dirección exacta de la ventana negra, con `http://` y terminando en `/beta/`.
3. Debe aparecer DANTESTORE con el perro Dante arriba y una franja que dice **«VERSIÓN BETA DE PRUEBA · no es el catálogo oficial»**.

**Primera vez:** deben salir dos ventanas emergentes seguidas (Navidad y Juguetería). Ciérralas con la X. Salen una vez al día; para verlas otra vez, abre la dirección en una pestaña privada. Si quieres ocultarlas, agrega `#sinpopups` al final de la dirección.

> **Si no abre:** comprueba que iPhone y computador estén en el mismo Wi-Fi (no «red de invitados»), que no haya VPN, que Windows haya permitido Python en el Firewall y que la dirección empiece con `http://` (no `https://`). Para ver la IP del computador: `ipconfig` en `cmd` → «Dirección IPv4».

**Sin computador:** hay alternativas en `docs/PROBAR_EN_IPHONE.md`. La del servidor local (esta) es la más segura porque la beta nunca sale de tu casa. La copia en Netlify Drop queda pública con un enlace hasta que la borres; úsala solo si no hay otra opción.

---

## PARTE B · Qué recorrer (marca cada punto)

### 1. Recorrer las categorías
- Debajo del buscador hay botones redondos con las categorías (Todo 186, Audífonos 14, …). **Desliza con el dedo hacia la izquierda** para verlas todas: son 20 más «Todo».
- Toca **Juguetería**: la lista debe mostrar solo juguetes. Toca **Todo** para volver.
- Toca el botón rojo **Navidad** de la portada: debe mostrar solo los productos de Navidad (igual que con el botón de categoría). Toca **Todo** para volver.
- ✔ Debe: no moverse hacia los lados toda la página; el botón activo se ve resaltado.

### 2. Buscar productos
- Toca el cuadro «Buscar producto…» y escribe `airpods`. Deben salir los AirPods.
- Prueba `AUDIFONOS` (en mayúsculas y sin tilde) y `perfume`.
- Escribe `zzzz`: debe decir que no hay resultados y ofrecer **«Ver todo»** y un enlace de WhatsApp.
- ✔ Debe: el teclado del iPhone no tapar los resultados; al borrar el texto vuelve la lista completa.

### 3. Abrir fotografías
- Toca la foto (o el nombre) de **AirPods 4**: se abre el detalle con la foto grande.
- **Desliza** la foto a los lados o usa las flechas ‹ ›; abajo están las miniaturas.
- Cierra con la **X** o con el **gesto de volver** (deslizar desde el borde izquierdo): debe cerrar el detalle y no sacarte de la página.
- Busca `Cepillo alisador`: debe mostrar «Foto próximamente» y precio **Consultar**. Es normal: no tiene foto ni precio fijado.
- ✔ Debe: la imagen verse nítida (algunas fotos antiguas son pequeñas y se ven más suaves; ya lo sabíamos).

### 4. Agregar productos al carrito
- En el detalle, toca **«Agregar al carrito»**. Aparece un aviso arriba y abajo una barra con el carrito.
- Agrega 2 o 3 productos distintos desde las tarjetas con el botón amarillo.
- ✔ Debe: el aviso no tapar ningún botón; la barra del carrito mostrar unidades y subtotal.

### 5. Cambiar cantidades
- Toca la barra del carrito. Verás «Paso 1 · Carrito».
- Usa **＋** y **−**: el subtotal cambia. Con 1 unidad el **−** está apagado (no hay cantidad cero).
- Toca **Quitar** en un producto. Toca **Vaciar carrito**: debe pedirte confirmación; toca **Cancelar** para no vaciar.
- ✔ Debe: los botones **«Seguir comprando»** y **«Continuar»** verse siempre abajo, sin hacer scroll.

### 6. Pedido con domicilio en Bogotá
- Toca **Continuar** (Paso 2 · Entrega y datos).
- Si tocas **Enviar pedido** sin llenar nada, debe avisar qué falta (nombre y entrega) y **no abrir WhatsApp**.
- Escribe un nombre de prueba, elige **Domicilio en Bogotá** y escribe una dirección (por ejemplo «Calle 100 # 15-20»).
- ✔ Debe: aparecer **+$10.000**, «pago contraentrega» y el **Total = subtotal + $10.000**. Al tocar un campo, el teclado no debe tapar lo que escribes.

### 7. Pedido a otra ciudad
- Cambia la entrega a **Envío a otra ciudad** y escribe una ciudad (por ejemplo «Medellín»).
- ✔ Debe: aparecer **«Envío: por cotizar»** y **«Total definitivo: Pendiente de cotización»**. No debe verse como gratis ni como $0.

### 8. Recoger en tienda
- Elige **Recoger en tienda**.
- ✔ Debe: decir **Gratis**; pedir solo el nombre (sin dirección ni ciudad); Total = subtotal.

### 9. Girar el teléfono
- Con el carrito abierto, gira el iPhone a **horizontal**. Debe seguir viéndose el botón de enviar y poder escribir en los campos con el teclado abierto (la hoja se desplaza). Vuelve a vertical.

### 10. Ver el mensaje de WhatsApp SIN enviarlo
**Opción segura (recomendada):**
1. En el paso 2, baja hasta **«¿No se abre WhatsApp?»** y ábrelo. Ahí está el mensaje completo.
2. Mantén el dedo sobre el texto → **Seleccionar todo → Copiar**.
3. Abre la app **Notas**, crea una nota nueva y **Pega**. Lee el mensaje: no se envió a nadie.

**Opción con WhatsApp:**
1. Toca **«Enviar pedido por WhatsApp»**. Se abre WhatsApp con la conversación al número **+57 313 472 4702** (el tuyo) y el mensaje ya escrito en la caja de texto.
2. **NO toques la flecha de enviar.** Revisa el texto y vuelve a Safari tocando «◀ Safari» arriba a la izquierda.
3. En Safari debe decir que el carrito **se conserva**. Si el pedido fuera real y ya lo enviaste, ahí mismo puedes vaciarlo.

**El mensaje debe verse así (con tus datos de prueba):**
```
*PEDIDO DANTESTORE*
Hola DANTESTORE 👋, quiero hacer este pedido.

*Cliente:* (tu nombre de prueba)

*Productos* (2 productos, 3 unidades):
1. AirPods 4
   2 × $100.000 = $200.000
...
*Subtotal:* $...
*Entrega:* Domicilio en Bogotá (+$10.000, pago contraentrega)
*Dirección:* ...
*Domicilio:* $10.000
*TOTAL:* $...
```
- ✔ Debe: tener todos los productos con cantidades y valores, la entrega, el total (o «pendiente de confirmar» si es otra ciudad), y **solo** el número +57 313 472 4702 como destino. Acentos y emojis bien.

### Extras rápidos (1 minuto cada uno)
- **Recargar la página:** el carrito sigue ahí.
- **Cerrar la pestaña y abrirla de nuevo:** el carrito sigue, pero **el nombre y la dirección ya no** (a propósito, por privacidad).
- **Modo oscuro del iPhone:** la página sigue clara y legible.
- **Vista rápida de velocidad:** la primera pantalla debe aparecer en pocos segundos; las fotos se cargan al bajar.

---

## PARTE C · Qué reportarme
Anota, con una captura de pantalla si puedes (la forma de tomarla depende de tu modelo de iPhone):
| Punto | ¿Bien? | Qué viste |
|---|---|---|
| 1 Categorías | | |
| 2 Búsqueda | | |
| 3 Fotografías | | |
| 4 Agregar | | |
| 5 Cantidades | | |
| 6 Domicilio Bogotá | | |
| 7 Otra ciudad | | |
| 8 Tienda | | |
| 9 Horizontal y teclado | | |
| 10 Mensaje WhatsApp | | |
Escribe también el modelo de tu iPhone y la versión de iOS (Ajustes → General → Información).

---

## PARTE D · Comprobar que nada se publicó (opcional, 1 minuto)
1. En GitHub abre el repositorio DANTECH → **Settings → Pages**. Debe decir que publica desde la rama **main** / carpeta **/(root)** y que el sitio está en `https://dantechstore.github.io/DANTECH/`.
2. Abre esa dirección: debe verse el catálogo de siempre (con «Navidad», etc.), **sin** la franja de «VERSIÓN BETA».
3. Abre `https://dantechstore.github.io/DANTECH/beta/`: debe dar **«404»** (no existe en línea). Eso confirma que la beta no está publicada.

## PARTE E · Terminar
Cierra la ventana negra del computador (o Ctrl+C). El servidor se apaga y la beta deja de verse. No queda nada guardado en internet.
