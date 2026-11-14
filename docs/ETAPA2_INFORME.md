# Etapa 2 - Optimizacion de imagenes (14-nov-2026)
Rama: renovacion-dantestore (base: commit d322af3 de la etapa 1). main, GitHub Pages e index.html NO se tocaron.

## Resultado
| | Archivos | Peso | vs originales |
|---|---|---|---|
| Originales (intactos) | 321 | 14,48 MiB (15.183.939 bytes) | - |
| Miniaturas WebP (max 400 px) | 321 | 4,27 MiB (4.473.182 bytes) | -70,5 % |
| Completas WebP (max 900 px) | 321 | 9,17 MiB (9.612.560 bytes) | -36,7 % |
| Miniaturas + completas | 642 | 13,43 MiB | -7,2 % (ambas juntas) |

Las primeras fotos de los 184 productos con foto (lo que carga la cuadricula del catalogo): 7,80 MiB originales -> 2,35 MiB en miniatura (-70 %).
Los originales ya eran JPEG pequenos (la mayoria <= 640 px), por eso la reduccion de las completas es moderada.

## Procedimiento reproducible
python3 herramientas/etapa2_optimizar.py   (convierte y escribe el manifiesto)
python3 herramientas/etapa2_validar.py     (21 verificaciones)
python3 herramientas/etapa2_comparar.py    (comparaciones visuales)
Parametros: LANCZOS, WebP calidad 80 (sube a 88 y 94 solo si SSIM < 0,95), metodo 6, nunca amplia, proporcion conservada.

## Excepciones
- Sin errores: 321 de 321 convertidas.
- Logo (PNG con paleta y transparencia): WebP sin perdida.
- 12 miniaturas y 1 completa necesitaron calidad 88 para llegar a SSIM >= 0,95.
- 4 versiones completas pesan algo mas que su original (ya estaba muy comprimido): mv1r471w4es0-1, mv1r471w4es0-2, mv62v8znp80x-1, mv79290qgvrf-3.
- 8 imagenes menores de 400 px y 266 menores de 900 px conservan su tamano (no se amplian). 313 miniaturas y 47 completas se redujeron.
