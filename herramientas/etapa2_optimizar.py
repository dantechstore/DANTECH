#!/usr/bin/env python3
"""Etapa 2 - Optimizacion de imagenes (WebP). Procedimiento reproducible.
Entrada (SOLO LECTURA): img/originales/*  +  data/productos.json
Salida: img/miniaturas/*.webp (max 400 px), img/completas/*.webp (max 900 px),
        data/manifiesto_imagenes.json y .csv
Reglas: nunca ampliar; conservar proporcion; no modifica originales ni productos.json.
Uso: python3 herramientas/etapa2_optimizar.py"""
import json,hashlib,io,os,csv,sys
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim
MAXT,MAXF=400,900
LADDER=[80,88,94]          # calidad WebP; sube solo si SSIM < UMBRAL
UMBRAL=0.95
OUT={'miniatura':'img/miniaturas','completa':'img/completas'}
sha=lambda b:hashlib.sha256(b).hexdigest()
def fit(w,h,m):
    if max(w,h)<=m:return w,h           # no ampliar
    s=m/max(w,h);return max(1,round(w*s)),max(1,round(h*s))
def encode(ref,size,logo):
    """ref: PIL RGB/RGBA original. Devuelve (bytes,calidad,ssim,psnr,dims)"""
    im=ref if size==ref.size else ref.resize(size,Image.LANCZOS)
    if logo:
        b=io.BytesIO();im.save(b,'WEBP',lossless=True,method=6);return b.getvalue(),'lossless',1.0,float('inf'),im.size
    last=None
    for q in LADDER:
        b=io.BytesIO();im.save(b,'WEBP',quality=q,method=6);data=b.getvalue()
        dec=Image.open(io.BytesIO(data)).convert('RGB')
        a=np.asarray(im.convert('RGB'),dtype=np.uint8);d=np.asarray(dec,dtype=np.uint8)
        s=ssim(a,d,channel_axis=2,data_range=255);mse=((a.astype(float)-d.astype(float))**2).mean()
        p=float('inf') if mse==0 else 10*np.log10(255**2/mse);last=(data,q,round(float(s),4),round(float(p),2),im.size)
        if s>=UMBRAL:break
    return last
def main():
    J=json.load(open('data/productos.json',encoding='utf8'))
    for d in OUT.values():os.makedirs(d,exist_ok=True)
    items=[];errors=[]
    for p in J['productos']:
        for i,f in enumerate(p['fotos'],1):items.append((p['id'],p['nombre'],i,f))
    if J.get('logo'):items.append(('_logo-marca','Logo de la marca',1,J['logo']))
    man=[]
    for pid,nombre,n,f in items:
        src=f['archivo'];raw=open(src,'rb').read()
        rec={'producto_id':pid if pid!='_logo-marca' else None,'nombre':nombre,'foto_n':n,'original':{'archivo':src,'sha256':sha(raw),'bytes':len(raw),'ancho':f['ancho'],'alto':f['alto']},'notas':[]}
        try:
            assert sha(raw)==f['sha256'],'hash del original no coincide con productos.json'
            im=Image.open(io.BytesIO(raw));im.load();logo=(pid=='_logo-marca')
            if logo:
                rec['notas'].append('Logo PNG con paleta/transparencia: convertido a RGBA y WebP SIN perdida (tratamiento especial)');im=im.convert('RGBA')
            else:im=im.convert('RGB')
            base=os.path.splitext(os.path.basename(src))[0]
            for key,mx in (('miniatura',MAXT),('completa',MAXF)):
                size=fit(*im.size,mx);data,q,s,ps,dims=encode(im,size,logo)
                path=f'{OUT[key]}/{base}.webp';open(path,'wb').write(data)
                rec[key]={'archivo':path,'sha256':sha(data),'bytes':len(data),'ancho':dims[0],'alto':dims[1],'calidad':q,'ssim':s,'psnr_db':ps,'redimensionada':dims!=im.size}
                if q not in ('lossless',LADDER[0]):rec['notas'].append(f'{key}: calidad subida a {q} para llegar a SSIM>={UMBRAL} (tratamiento especial)')
                if s<UMBRAL:rec['notas'].append(f'{key}: SSIM {s} bajo el umbral incluso a calidad maxima del procedimiento')
            if max(im.size)<MAXT:rec['notas'].append('Original menor que 400 px: no se amplio, miniatura y completa conservan el tamano original')
            elif max(im.size)<MAXF:rec['notas'].append('Original menor que 900 px: version completa conserva el tamano original (no se amplio)')
        except Exception as e:
            rec['error']=str(e);errors.append((src,str(e)))
        man.append(rec)
    ok=[r for r in man if 'error' not in r]
    tot=lambda k:sum(r[k]['bytes'] if k!='original' else r['original']['bytes'] for r in ok)
    meta={'parametros':{'miniatura_max_px':MAXT,'completa_max_px':MAXF,'calidad_inicial':LADDER[0],'escalera_calidad':LADDER,'umbral_ssim':UMBRAL,'metodo_webp':6,'remuestreo':'LANCZOS','no_ampliar':True},
          'totales':{'originales':len(items),'optimizadas_ok':len(ok),'errores':len(errors),'bytes_originales':tot('original'),'bytes_miniaturas':tot('miniatura'),'bytes_completas':tot('completa')}}
    json.dump({'meta':meta,'imagenes':man},open('data/manifiesto_imagenes.json','w',encoding='utf8'),ensure_ascii=False,indent=1)
    with open('data/manifiesto_imagenes.csv','w',newline='',encoding='utf8') as c:
        w=csv.writer(c);w.writerow(['producto_id','nombre','foto_n','original','original_bytes','original_px','miniatura','miniatura_bytes','miniatura_px','miniatura_ssim','completa','completa_bytes','completa_px','completa_ssim','notas'])
        for r in man:
            if 'error' in r:w.writerow([r['producto_id'],r['nombre'],r['foto_n'],r['original']['archivo'],'','','','','','','','','','','ERROR: '+r['error']]);continue
            o,m,c2=r['original'],r['miniatura'],r['completa']
            w.writerow([r['producto_id'] or '(logo)',r['nombre'],r['foto_n'],o['archivo'],o['bytes'],f"{o['ancho']}x{o['alto']}",m['archivo'],m['bytes'],f"{m['ancho']}x{m['alto']}",m['ssim'],c2['archivo'],c2['bytes'],f"{c2['ancho']}x{c2['alto']}",c2['ssim'],' | '.join(r['notas'])])
    print(json.dumps(meta['totales'],indent=1));print('errores:',errors)
main()
