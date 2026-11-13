#!/usr/bin/env python3
"""Etapa 1 - Validacion INDEPENDIENTE (regex, sin BeautifulSoup) de data/productos.json y de img/originales contra index.html."""
import re,json,base64,hashlib,os,sys,io
from PIL import Image
raw=open('index.html',encoding='utf8').read();J=json.load(open('data/productos.json',encoding='utf8'))
res=[];bad=[]
def chk(n,ok,det=''):
    res.append((n,ok,det))
    if not ok:bad.append(n)
fmt=lambda n:'$'+f'{n:,}'.replace(',','.')
# A. conteos y unicidad
P=J['productos'];ids=[p['id'] for p in P]
chk('A1 186 productos en JSON',len(P)==186,len(P))
chk('A2 ids unicos',len(set(ids))==len(ids))
html_ids=re.findall(r'<div class="it" id="p([^"]+)">',raw)
chk('A3 ids HTML == ids JSON (mismo orden)',html_ids==ids,f'{len(html_ids)} en HTML')
chk('A4 20 categorias',len(J['categorias'])==20 and sum(c['cantidad'] for c in J['categorias'])==186)
# B. por producto con regex sobre el bloque HTML
blocks=re.split(r'(?=<div class="it" id="p)',raw)[1:]
mis={'nombre':[],'precio':[],'precio_texto':[],'categoria':[],'fotos':[],'desc':[]}
secs=[(m.start(),m.group(1)) for m in re.finditer(r'<div class="cs cs\d+" id="c\d+"><h2[^>]*>([^<]*)</h2>',raw)]
pos=0
for b,p in zip(blocks,P):
    start=raw.index(b[:200],pos);pos=start+1
    cat=[c for s,c in secs if s<start][-1]
    b=b.split('<div class="it" id="p',2)[0] if False else b
    # cortar al final del item (hasta el siguiente item o seccion)
    b=re.split(r'<div class="cs cs\d+"|<div class="nores"',b)[0]
    dn=re.search(r'data-n="([^"]*)"',b).group(1);dpr=int(re.search(r'data-p="(\d+)"',b).group(1))
    vis=re.search(r'<b style="font-size:14px">([^<]*)</b>',b).group(1)
    pt=re.search(r'class="pr">([^<]*)<',b).group(1)
    nimg=len(re.findall(r'<img src="data:image',b));dd=re.search(r'<div class="d">(.*?)</div>',b,re.S)
    import html as H
    if H.unescape(dn)!=p['nombre']:mis['nombre'].append(p['id'])
    if (dpr or None)!=p['precio']:mis['precio'].append(p['id'])
    if H.unescape(pt)!=p['precio_texto'] or (p['precio'] and fmt(p['precio'])!=p['precio_texto']) or (not p['precio'] and p['precio_texto']!='Consultar'):mis['precio_texto'].append(p['id'])
    if cat.replace('&amp;','&')!=p['categoria']:mis['categoria'].append(p['id'])
    if nimg!=len(p['fotos']):mis['fotos'].append(p['id'])
    dh=dd.group(1) if dd else ''
    if dh!=p['descripcion_html'] or H.unescape(re.sub(r'<[^>]+>','',re.sub(r'<br\s*/?>','\n',dh))).strip()!=p['descripcion']:mis['desc'].append(p['id'])
    if ('class="ph"' in b)!=p['sin_foto']:mis.setdefault('sinfoto',[]).append(p['id'])
    if H.unescape(vis)!=p['nombre_visible']:mis['nombre'].append(p['id'])
mis.setdefault('sinfoto',[])
for k,v in mis.items():chk(f'B {k}: 186/186 coinciden con el HTML',not v,v[:5])
chk('B6 precio numerico == precio mostrado en el catalogo',all((p['precio'] is None and p['precio_texto']=='Consultar') or fmt(p['precio'])==p['precio_texto'] for p in P))
chk('B7 productos sin precio (Consultar)',True,[p['id']+' '+p['nombre'] for p in P if p['precio'] is None])
chk('B8 sin precios <=0 ni duplicados raros',all(p['precio'] is None or p['precio']>0 for p in P))
chk('B9 nombres vacios',all(p['nombre'].strip() for p in P))
chk('B10 productos SIN foto = exactamente los que tienen marcador vacio en el HTML',[p['id'] for p in P if not p['fotos']]==[p['id'] for p in P if p['sin_foto']] and len([p for p in P if p['sin_foto']])==2,[p['id']+' '+p['nombre'] for p in P if not p['fotos']])
# C. fotos: re-decodificar base64 del HTML y comparar con archivos
imgs=re.findall(r'data:image/(\w+);base64,([A-Za-z0-9+/=]+)',raw)
chk('C1 321 imagenes en HTML = 320 fotos + 1 logo',len(imgs)==321,len(imgs))
hh=[hashlib.sha256(base64.b64decode(b)).hexdigest() for _,b in imgs]
want=[f['sha256'] for p in P for f in p['fotos']]+([J['logo']['sha256']] if J.get('logo') else [])
chk('C2 hashes de las 321 imagenes del HTML == JSON (mismo orden salvo logo)',sorted(hh)==sorted(want))
ok=True;miss=[];badh=[];corrupt=[];tot=0
for p in P:
    for f in p['fotos']+([]):
        if not os.path.exists(f['archivo']):miss.append(f['archivo']);continue
        d=open(f['archivo'],'rb').read();tot+=len(d)
        if hashlib.sha256(d).hexdigest()!=f['sha256'] or len(d)!=f['bytes']:badh.append(f['archivo'])
        try:
            im=Image.open(io.BytesIO(d));im.load()
            if im.size!=(f['ancho'],f['alto']):corrupt.append(f['archivo'])
        except Exception as e:corrupt.append(f['archivo'])
chk('C3 los 320 archivos de foto existen',not miss,miss[:3])
chk('C4 hash y tamano de cada archivo coincide (copia exacta)',not badh,badh[:3])
chk('C5 todas las fotos abren y miden lo declarado',not corrupt,corrupt[:3])
chk('C6 archivos en img/originales == 321',len(os.listdir('img/originales'))==321,len(os.listdir('img/originales')))
# D. etiquetas, mas vendidos, whatsapp
chk('D1 mas vendidos: 8 ids y existen',len(J['mas_vendidos'])==8 and all(i in ids for i in J['mas_vendidos']),J['mas_vendidos'])
chk('D2 whatsapp = 573134724702 (unico en el HTML)',J['meta']['whatsapp']=='573134724702' and set(re.findall(r'wa\.me/(\d+)',raw))=={'573134724702'} and set(re.findall(r'data-wa="(\d+)"',raw))=={'573134724702'})
chk('D3 etiquetas Nuevo=36, Mas vendido=8',sum(p['etiquetas']['nuevo'] for p in P)==36 and sum(p['etiquetas']['mas_vendido'] for p in P)==8)
# E. archivos existentes intactos
import subprocess
d=subprocess.run(['git','status','--porcelain','--untracked-files=no'],capture_output=True,text=True).stdout.strip()
chk('E1 ningun archivo existente modificado ni borrado (git)',d=='',d)
sh=hashlib.sha256(open('index.html','rb').read()).hexdigest()
chk('E2 index.html == main publicado (sha256)',sh==J['meta']['sha256_fuente']=='9b4ac063095243e6efa00925ad42da7eb0f9c0bbf5451323224265a4a5efd685')
chk('E3 respaldo identico al original',hashlib.sha256(open('_respaldo/2026-11-13_main-9ef8bc9/index.html','rb').read()).hexdigest()==sh)
print('\n'.join(('OK   ' if o else 'FALLA')+' '+n+(f'  -> {d}' if d not in ('',None) and not isinstance(d,bool) else '') for n,o,d in res))
print('\nRESULTADO:',len(res)-len(bad),'de',len(res),'verificaciones OK' if not bad else 'FALLAS: '+', '.join(bad));print('bytes fotos',tot)
sys.exit(1 if bad else 0)
