#!/usr/bin/env python3
"""Etapa 1 - Extrae productos, categorias y fotos ORIGINALES de index.html (solo lectura del HTML).
Genera: data/productos.json, img/originales/*.jpg|png, _respaldo/... (se hace aparte).
No modifica index.html ni ningun archivo existente."""
import re,json,base64,hashlib,io,os,sys,subprocess
from bs4 import BeautifulSoup
from PIL import Image
SRC=sys.argv[1] if len(sys.argv)>1 else 'index.html'
raw=open(SRC,encoding='utf8').read()
soup=BeautifulSoup(raw,'html.parser')
ct=soup.select_one('div.ct')
wa=ct['data-wa']
os.makedirs('img/originales',exist_ok=True);os.makedirs('data',exist_ok=True)
def save_img(src,name):
    m=re.match(r'data:image/(\w+);base64,(.+)$',src,re.S);fmt,b64=m.group(1),m.group(2)
    d=base64.b64decode(b64);ext={'jpeg':'jpg','png':'png','webp':'webp'}[fmt]
    path=f'img/originales/{name}.{ext}'
    open(path,'wb').write(d)
    im=Image.open(io.BytesIO(d))
    return {'archivo':path,'sha256':hashlib.sha256(d).hexdigest(),'bytes':len(d),'ancho':im.size[0],'alto':im.size[1],'formato':fmt}
def desc_txt(it):
    d=it.select_one('div.d')
    if not d:return ''
    for br in d.find_all('br'):br.replace_with('\n')
    return d.get_text().strip()
cats=[];prods=[];g=0
for ci,sec in enumerate(ct.select('div.secs > div.cs'),1):
    h2=sec.find('h2');color=re.search(r'--ac:(#[0-9A-Fa-f]{3,8})',h2.get('style',''))
    items=sec.select('div.it')
    cats.append({'orden':ci,'nombre':h2.get_text(strip=True),'color':color.group(1) if color else None,'ancla':sec['id'],'cantidad':len(items)})
    for oi,it in enumerate(items,1):
        g+=1
        a=it.select_one('a.wb');pid=a['data-id']
        assert it['id']=='p'+pid,(it['id'],pid)
        fotos=[]
        for fi,img in enumerate(it.select('div.sls img'),1):
            fotos.append(save_img(img['src'],f'{pid}-{fi}'))
        price_txt=it.select_one('span.pr').get_text(strip=True)
        dp=int(a['data-p'])
        sc=it.select_one('div.sc')
        prods.append({'id':pid,'orden_global':g,'categoria':cats[-1]['nombre'],'orden_en_categoria':oi,
          'nombre':a['data-n'],'nombre_visible':it.find('b').get_text(strip=True),'descripcion':desc_txt(it),'descripcion_html':(it.select_one('div.d').decode_contents() if it.select_one('div.d') else ''),
          'precio':dp if dp>0 else None,'precio_texto':price_txt,'fotos':fotos,
          'sin_foto':bool(it.select_one('div.ph')) and not fotos,'etiquetas':{'mas_vendido':bool(it.select_one('span.tb')),'nuevo':bool(it.select_one('span.rbn')),'escasez':sc.get_text(strip=True) if sc else None}})
logo=ct.select_one('div.hd img');logo_i=save_img(logo['src'],'_logo-marca') if logo else None
mv=[a['href'][2:] for a in ct.select('div.mv .mvr a')]
pops={}
for k in ('nav','jug'):
    p=ct.select_one(f'#pm_{k}')
    if p:pops[k]={'titulo':p.select_one('.pmt').get_text(strip=True),'mensaje':p.select_one('.pmm').get_text(strip=True),'boton':p.select_one('.pmb').get_text(strip=True),'destino':p.select_one('.pmb')['href']}
hero=ct.select_one('div.hx');heroi={'kicker':hero.select_one('.hk').get_text(strip=True),'titulo':hero.select_one('.ht').get_text(' ',strip=True),'subtitulo':hero.select_one('.hs').get_text(strip=True)} if hero else None
commit=subprocess.run(['git','rev-parse','HEAD'],capture_output=True,text=True).stdout.strip()
out={'meta':{'fuente':SRC,'commit_main':commit,'sha256_fuente':hashlib.sha256(open(SRC,'rb').read()).hexdigest(),
 'whatsapp':wa,'total_productos':len(prods),'total_fotos_producto':sum(len(p['fotos']) for p in prods),'total_categorias':len(cats),
 'nota':'Extraido sin modificar el catalogo publicado. Etiquetas (mas_vendido/nuevo/escasez) son una captura del estado publicado.'},
 'categorias':cats,'mas_vendidos':mv,'portada':heroi,'ventanas_emergentes':pops,'logo':logo_i,'productos':prods}
json.dump(out,open('data/productos.json','w',encoding='utf8'),ensure_ascii=False,indent=1)
print('productos',len(prods),'categorias',len(cats),'fotos',out['meta']['total_fotos_producto'],'logo',bool(logo_i))
