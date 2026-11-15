#!/usr/bin/env python3
"""Etapa 3 - Genera beta/js/datos.js a partir de data/productos.json y data/manifiesto_imagenes.json.
NO modifica ninguno de los dos (solo lectura). datos.js es un archivo GENERADO: no se edita a mano.
Se usa un .js (y no fetch) para que la beta tambien abra con doble clic (file://) y en GitHub Pages.
Uso: python3 herramientas/etapa3_generar_datos.py"""
import json
J=json.load(open('data/productos.json',encoding='utf8'));M=json.load(open('data/manifiesto_imagenes.json',encoding='utf8'))['imagenes']
img={}
for r in M:
    if r['producto_id']:img.setdefault(r['producto_id'],{})[r['foto_n']]=r
prods=[]
for p in J['productos']:
    fs=[]
    for n,f in enumerate(p['fotos'],1):
        r=img[p['id']][n];assert r['original']['sha256']==f['sha256']
        fs.append({'m':r['miniatura']['archivo'],'c':r['completa']['archivo'],'w':r['miniatura']['ancho'],'h':r['miniatura']['alto']})
    prods.append({'id':p['id'],'orden':p['orden_global'],'categoria':p['categoria'],'nombre':p['nombre'],'descripcion':p['descripcion'],
                  'precio':p['precio'],'precio_texto':p['precio_texto'],'sin_foto':p['sin_foto'],'etiquetas':p['etiquetas'],'fotos':fs})
D={'whatsapp':J['meta']['whatsapp'],'portada':J['portada'],'ventanas_emergentes':J['ventanas_emergentes'],'mas_vendidos':J['mas_vendidos'],
   'categorias':J['categorias'],'logo':{'m':'img/miniaturas/_logo-marca.webp','c':'img/completas/_logo-marca.webp'},'productos':prods}
out='/* ARCHIVO GENERADO por herramientas/etapa3_generar_datos.py desde data/productos.json. NO EDITAR A MANO. */\nwindow.DANTESTORE_DATOS='+json.dumps(D,ensure_ascii=False,separators=(',',':'))+';\n'
open('beta/js/datos.js','w',encoding='utf8').write(out);print('datos.js',len(out)//1024,'KB',len(prods),'productos')
