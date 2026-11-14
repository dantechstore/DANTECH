#!/usr/bin/env python3
"""Etapa 2 - Validacion independiente. Codigo de salida 1 si algo falla."""
import json,hashlib,io,os,subprocess,sys
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim
BASE=sys.argv[1] if len(sys.argv)>1 else 'd322af3202f17a73a93f872065c425bbce7d33dd'   # commit de la etapa 1
res=[];bad=[]
def chk(n,ok,d=''):
    res.append((n,ok,d))
    if not ok:bad.append(n)
sh=lambda b:hashlib.sha256(b).hexdigest()
git=lambda *a:subprocess.run(['git',*a],capture_output=True).stdout
P=json.load(open('data/productos.json',encoding='utf8'));M=json.load(open('data/manifiesto_imagenes.json',encoding='utf8'));I=M['imagenes']
# 1 originales intactos
files=sorted(os.listdir('img/originales'))
chk('1.1 hay 321 archivos en img/originales',len(files)==321,len(files))
badb=[f for f in files if sh(open('img/originales/'+f,'rb').read())!=sh(git('show',f'{BASE}:img/originales/{f}'))]
chk('1.2 los 321 originales son IDENTICOS byte a byte a los del commit de la etapa 1',not badb,badb[:3])
want=[f['sha256'] for p in P['productos'] for f in p['fotos']]+[P['logo']['sha256']]
have=[sh(open('img/originales/'+f,'rb').read()) for f in files]
chk('1.3 hashes de los originales == hashes declarados en productos.json',sorted(want)==sorted(have))
chk('1.4 git: img/originales sin cambios respecto al commit de la etapa 1',subprocess.run(['git','diff','--quiet',BASE,'--','img/originales']).returncode==0 and not git('status','--porcelain','img/originales').strip())
chk('1.5 productos.json sin cambios (productos, precios, nombres, IDs, categorias, descripciones, WhatsApp)',subprocess.run(['git','diff','--quiet',BASE,'--','data/productos.json']).returncode==0)
# 2 cobertura
chk('2.1 manifiesto cubre los 321 originales',len(I)==321 and sorted(r['original']['archivo'] for r in I)==sorted('img/originales/'+f for f in files))
for k,d in (('miniatura','img/miniaturas'),('completa','img/completas')):
    fs=sorted(os.listdir(d));chk(f'2.2 {d}: 321 archivos y ninguno huerfano',fs==sorted(os.path.basename(r[k]['archivo']) for r in I) and len(fs)==321,len(fs))
pids={p['id'] for p in P['productos']};chk('2.3 cada producto tiene todas sus fotos optimizadas',all(sum(1 for r in I if r['producto_id']==p['id'])==len(p['fotos']) for p in P['productos']))
# 3 tecnicas
errs=[];tot={'miniatura':0,'completa':0};smin={'miniatura':1,'completa':1};up=[];ar=[];notwebp=[];hashbad=[]
for r in I:
    o=Image.open(r['original']['archivo']);ow,oh=o.size
    for k,mx in (('miniatura',400),('completa',900)):
        p=r[k]['archivo'];raw=open(p,'rb').read();tot[k]+=len(raw)
        if sh(raw)!=r[k]['sha256']:hashbad.append(p)
        try:
            im=Image.open(io.BytesIO(raw));im.load()
            if im.format!='WEBP':notwebp.append(p)
            w,h=im.size
            if max(w,h)>mx:errs.append((p,'excede',w,h))
            if w>ow or h>oh:up.append(p)
            if abs(w/h-ow/oh)>0.01*(ow/oh)+ 1.5/min(w,h):ar.append(p)
            # SSIM independiente: referencia = original reducido con BICUBIC (metodo distinto al de la conversion)
            ref=o.convert('RGB')
            if (w,h)!=(ow,oh):ref=ref.resize((w,h),Image.BICUBIC)
            if r['producto_id'] is None:continue
            s=ssim(np.asarray(ref),np.asarray(im.convert('RGB')),channel_axis=2,data_range=255);smin[k]=min(smin[k],s)
        except Exception as e:errs.append((p,str(e)))
chk('3.1 los 642 WebP abren y son WebP validos',not errs and not notwebp,(errs+notwebp)[:3])
chk('3.2 ninguno excede 400 px (miniatura) / 900 px (completa)',not [e for e in errs if e[1]=='excede'])
chk('3.3 no se amplio ninguna imagen',not up,up[:3]);chk('3.4 proporcion conservada',not ar,ar[:3])
chk('3.5 hashes de los WebP coinciden con el manifiesto',not hashbad,hashbad[:3])
chk('3.6 SSIM minimo recalculado (metodo independiente) >= 0.94 en ambas versiones',smin['miniatura']>=0.94 and smin['completa']>=0.94,{k:round(float(v),4) for k,v in smin.items()})
chk('3.7 sin errores de conversion en el manifiesto',not any('error' in r for r in I))
# 4 proteccion
ls=subprocess.run(['git','ls-remote','--heads','origin'],capture_output=True,text=True).stdout
chk('4.1 main remoto sigue en 9ef8bc95f5023ec2160e8590c643e26605a5db32','9ef8bc95f5023ec2160e8590c643e26605a5db32\trefs/heads/main' in ls)
chk('4.2 rama dantechstore-catalogo remota sin cambios','b343f5a5e06dc71f93e72006e3a1ae54ea081561\trefs/heads/dantechstore-catalogo' in ls)
chk('4.3 index.html == main publicado',sh(open('index.html','rb').read())=='9b4ac063095243e6efa00925ad42da7eb0f9c0bbf5451323224265a4a5efd685')
chk('4.4 catalogo-dantestore.html sin cambios',sh(open('catalogo-dantestore.html','rb').read())=='820e1d5f50b681d53ec44016f2935e2e73cdaa8c26c1a29153f426c680647569')
chg=subprocess.run(['git','diff','--name-status',BASE],capture_output=True,text=True).stdout.strip()
chk('4.5 ningun archivo del commit de la etapa 1 fue modificado o borrado (solo se agregan archivos)',not [l for l in chg.splitlines() if not l.startswith('A')],chg.splitlines()[:3])
print('\n'.join(('OK    ' if o else 'FALLA ')+n+(f'  -> {d}' if d not in ('',None,True,False) else '') for n,o,d in res))
print(f'\nRESULTADO: {len(res)-len(bad)} de {len(res)} OK'+('' if not bad else '  FALLAS: '+'; '.join(bad)));print('bytes miniaturas',tot['miniatura'],'completas',tot['completa'])
sys.exit(1 if bad else 0)
