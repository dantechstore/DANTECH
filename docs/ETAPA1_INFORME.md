# Etapa 1 - Respaldo y extraccion de datos (13-nov-2026)
Rama local: renovacion-dantestore (base: main @ 9ef8bc9). main e index.html NO se modificaron.

## Que se agrego (solo archivos nuevos)
- `_respaldo/2026-11-13_main-9ef8bc9/` copia exacta de index.html y catalogo-dantestore.html + SHA256SUMS.txt
- `data/productos.json` 186 productos, 20 categorias, 8 mas vendidos, portada y ventanas emergentes (captura del estado publicado)
- `img/originales/` 320 fotos de producto + logo, copia byte a byte (hash verificado)
- `herramientas/` scripts de extraccion y validacion (repetibles)

## Resultado de validaciones: 28 de 28 OK (ver etapa1_resultado_validacion.txt)

## Hallazgos para decidir (no se corrigio nada)
1. Sin foto (se ven con recuadro vacio): Bombox 3 LED (muj15tw83a8t) y Cepillo Alisador (muu1q26ymrsg).
2. Sin precio: Cepillo Alisador muestra "Consultar" (unico).
3. Nombre repetido: "Carro control remoto" (muu9yh6p7hb2 $95.000 y muvx6jdc95c0 $50.000), ambos en Jugueteria.
4. 26 productos con foto de menos de 400 px de lado menor (se ven borrosas): las mas pequenas Cepillo Straight 168 px, Castillo Navideno 214, Audifonos JKMX JK 51 225, Casa Navidad Pesebre 229.
5. 131 de 186 productos sin descripcion.
6. Productos nuevos (9: 4 rifles, Triciclo Dragon, 4 de Navidad) estan en el catalogo pero no en la copia de la base de datos usada para el cruce.
