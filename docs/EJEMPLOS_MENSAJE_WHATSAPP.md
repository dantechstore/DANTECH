# Ejemplos reales del mensaje de WhatsApp (etapa 4)

Generados por `herramientas/etapa4_pruebas.js` con el código real del carrito (no son maquetas). Número de destino único: **+57 313 472 4702**. Los datos del cliente son de prueba.

Formato: WhatsApp interpreta `*texto*` como negrita.

## 1. Domicilio en Bogotá (dirección, barrio e indicaciones)

```
*PEDIDO DANTESTORE*
Hola DANTESTORE 👋, quiero hacer este pedido.

*Cliente:* Ana Pérez

*Productos* (2 productos, 3 unidades):
1. AirPods 4
   2 × $100.000 = $200.000
2. Audifono Diadema Bose 700 Bluetooth
   1 × $120.000 = $120.000

*Subtotal:* $320.000
*Entrega:* Domicilio en Bogotá (+$10.000, pago contraentrega)
*Dirección:* Calle 100 # 15-20 apto 301, Chicó
*Indicaciones:* Torre 2, portería; llamar al llegar
*Domicilio:* $10.000
*TOTAL:* $330.000

Origen: catálogo web
```

Enlace generado (765 caracteres):

`https://wa.me/573134724702?text=*PEDIDO%20DANTESTORE*%0AHola%20DANTESTORE%20%F0%9F%91%8B%2C%20quiero%20hacer%20este%20pedido.%0A%0A*Cliente%3A*%20Ana%…`

## 2. Envío a otra ciudad (total pendiente de cotización)

```
*PEDIDO DANTESTORE*
Hola DANTESTORE 👋, quiero hacer este pedido.

*Cliente:* Ana Pérez

*Productos* (2 productos, 3 unidades):
1. AirPods 4
   2 × $100.000 = $200.000
2. Audifono Diadema Bose 700 Bluetooth
   1 × $120.000 = $120.000

*Subtotal:* $320.000
*Entrega:* Envío a otra ciudad (valor del envío por confirmar)
*Ciudad de destino:* Medellín, Antioquia
*Dirección o barrio de destino:* Laureles, Cra 70 # 44-10
*Envío:* por cotizar
*TOTAL:* pendiente de confirmar (envío por cotizar)
Productos con precio: $320.000

Origen: catálogo web
```

Enlace generado (859 caracteres):

`https://wa.me/573134724702?text=*PEDIDO%20DANTESTORE*%0AHola%20DANTESTORE%20%F0%9F%91%8B%2C%20quiero%20hacer%20este%20pedido.%0A%0A*Cliente%3A*%20Ana%…`

## 3. Recoger en tienda

```
*PEDIDO DANTESTORE*
Hola DANTESTORE 👋, quiero hacer este pedido.

*Cliente:* Ana Pérez

*Productos* (2 productos, 3 unidades):
1. AirPods 4
   2 × $100.000 = $200.000
2. Audifono Diadema Bose 700 Bluetooth
   1 × $120.000 = $120.000

*Subtotal:* $320.000
*Entrega:* Recoger en tienda (gratis)
*TOTAL:* $320.000

Origen: catálogo web
```

Enlace generado (541 caracteres):

`https://wa.me/573134724702?text=*PEDIDO%20DANTESTORE*%0AHola%20DANTESTORE%20%F0%9F%91%8B%2C%20quiero%20hacer%20este%20pedido.%0A%0A*Cliente%3A*%20Ana%…`

## 4. Domicilio con caracteres especiales (&, #, +, %, ?, tildes) para verificar la codificación

```
*PEDIDO DANTESTORE*
Hola DANTESTORE 👋, quiero hacer este pedido.

*Cliente:* Luz Ángela Gómez

*Productos* (3 productos, 6 unidades):
1. AirPods 4
   2 × $100.000 = $200.000
2. Audifono Diadema Bose 700 Bluetooth
   1 × $120.000 = $120.000
3. Audífonos JKMX JK1
   3 × $90.000 = $270.000

*Subtotal:* $590.000
*Entrega:* Domicilio en Bogotá (+$10.000, pago contraentrega)
*Dirección:* Carrera 15 # 93-60, Torre B & Apto 502, El Retiro
*Indicaciones:* Dejar con portería (50% de descuento + otros) #1?
*Domicilio:* $10.000
*TOTAL:* $600.000

Origen: catálogo web
```

Enlace generado (914 caracteres):

`https://wa.me/573134724702?text=*PEDIDO%20DANTESTORE*%0AHola%20DANTESTORE%20%F0%9F%91%8B%2C%20quiero%20hacer%20este%20pedido.%0A%0A*Cliente%3A*%20Luz%…`

## 5. Otra ciudad con un producto de precio por consultar

```
*PEDIDO DANTESTORE*
Hola DANTESTORE 👋, quiero hacer este pedido.

*Cliente:* Luz Ángela Gómez

*Productos* (4 productos, 7 unidades):
1. AirPods 4
   2 × $100.000 = $200.000
2. Audifono Diadema Bose 700 Bluetooth
   1 × $120.000 = $120.000
3. Audífonos JKMX JK1
   3 × $90.000 = $270.000
4. Cepillo Alisador
   1 unidad — precio por consultar

*Subtotal (sin los productos por consultar):* $590.000
*Entrega:* Envío a otra ciudad (valor del envío por confirmar)
*Ciudad de destino:* Cali, Valle del Cauca
*Dirección o barrio de destino:* Barrio San Fernando
*Envío:* por cotizar
*TOTAL:* pendiente de confirmar (envío por cotizar y productos con precio por consultar)
Productos con precio: $590.000

Origen: catálogo web
```

