#!/usr/bin/env python3
"""Etapa 2 - Genera comparaciones visuales original vs WebP en docs/comparaciones/ (solo lectura de originales)."""
import json,random,unicodedata
sa=lambda t:unicodedata.normalize('NFKD',t).encode('ascii','ignore').decode()
from PIL import Image,ImageDraw,ImageFont
M=json.load(open('data/manifiesto_imagenes.json',encoding='utf8'))['imagenes']
by={r['original']['archivo'].split('/')[-1]:r for r in M}
F=lambda s:ImageFont.load_default(size=s)
kb=lambda b:f'{b/1024:.0f} KB'
def panel(img,title,sub,H):
    w=round(img.width*H/img.height) if img.height else H;im=img.convert('RGB').resize((w,H),Image.LANCZOS if H<img.height else Image.BICUBIC)
    p=Image.new('RGB',(max(w,300),H+64),'white');p.paste(im,((p.width-w)//2,0));d=ImageDraw.Draw(p)
    d.text((6,H+4),title,fill='black',font=F(15));d.text((6,H+26),sub,fill=(90,90,90),font=F(13));return p
def sheet(name,fn,caption):
    r=by[fn];o=Image.open(r['original']['archivo']);f=Image.open(r['completa']['archivo']);t=Image.open(r['miniatura']['archivo'])
    H=430
    ps=[panel(o,'ORIGINAL',f"{o.width}x{o.height} px · {kb(r['original']['bytes'])}",H),
        panel(f,'COMPLETA (WebP, max 900)',f"{f.width}x{f.height} px · {kb(r['completa']['bytes'])} · SSIM {r['completa']['ssim']}",H),
        panel(t,'MINIATURA (WebP, max 400) a tamano real',f"{t.width}x{t.height} px · {kb(r['miniatura']['bytes'])} · SSIM {r['miniatura']['ssim']}",min(H,t.height))]
    # zoom 100% del centro: original vs completa
    cs=170;cx,cy=o.width//2,o.height//2;box=(max(0,cx-cs//2),max(0,cy-cs//2),min(o.width,cx+cs//2),min(o.height,cy+cs//2))
    fw,fh=f.size;fb=(round(box[0]*fw/o.width),round(box[1]*fh/o.height),round(box[2]*fw/o.width),round(box[3]*fh/o.height))
    z1=o.convert('RGB').crop(box).resize((340,340),Image.NEAREST);z2=f.convert('RGB').crop(fb).resize((340,340),Image.NEAREST)
    zz=Image.new('RGB',(700,404),'white');zz.paste(z1,(0,0));zz.paste(z2,(360,0));d=ImageDraw.Draw(zz);d.text((4,346),'Zoom del centro (x2): ORIGINAL',fill='black',font=F(14));d.text((364,346),'Zoom del centro (x2): COMPLETA WebP',fill='black',font=F(14))
    W=sum(p.width for p in ps)+20*(len(ps)+1)+zz.width+20;Hh=max(max(p.height for p in ps),zz.height)+90
    S=Image.new('RGB',(W,Hh),'white');d=ImageDraw.Draw(S);d.text((20,10),f"{sa(r['nombre'])}  ({r['original']['archivo'].split('/')[-1]})  -  {caption}",fill='black',font=F(18))
    x=20
    for p in ps:S.paste(p,(x,50));x+=p.width+20
    S.paste(zz,(x,50));S.save(f'docs/comparaciones/{name}.jpg',quality=88);print(name,S.size)
low=sorted(M,key=lambda r:r['completa']['ssim'])[0];lowt=sorted(M,key=lambda r:r['miniatura']['ssim'])[0]
import statistics
mid=sorted([r for r in M if r['producto_id']],key=lambda r:r['completa']['ssim'])[len(M)//2]
big=max([r for r in M if r['producto_id']],key=lambda r:r['original']['ancho']*r['original']['alto'])
small=min([r for r in M if r['producto_id']],key=lambda r:min(r['original']['ancho'],r['original']['alto']))
sheet('1_peor-caso-completa',low['original']['archivo'].split('/')[-1],'PEOR caso de calidad (version completa)')
sheet('2_peor-caso-miniatura',lowt['original']['archivo'].split('/')[-1],'PEOR caso de calidad (miniatura)')
sheet('3_caso-tipico',mid['original']['archivo'].split('/')[-1],'caso tipico (mediana)')
sheet('4_imagen-mas-grande',big['original']['archivo'].split('/')[-1],'la mas grande (se reduce a 900)')
sheet('5_imagen-mas-pequena',small['original']['archivo'].split('/')[-1],'la mas pequena (NO se amplia)')
# muestra aleatoria: 16 productos, original vs miniatura (a tamano de tarjeta de catalogo)
random.seed(7);S=random.sample([r for r in M if r['producto_id'] and r['foto_n']==1],16);cell=190
G=Image.new('RGB',(4*(2*cell+30)+10,4*(cell+44)+40),'white');d=ImageDraw.Draw(G);d.text((10,8),'Muestra aleatoria (16): izquierda ORIGINAL - derecha MINIATURA WebP (ambas a 190 px)',fill='black',font=F(16))
for i,r in enumerate(S):
    gx,gy=10+(i%4)*(2*cell+30),40+(i//4)*(cell+44)
    for j,p in enumerate((r['original']['archivo'],r['miniatura']['archivo'])):
        im=Image.open(p).convert('RGB');im.thumbnail((cell,cell),Image.LANCZOS);G.paste(im,(gx+j*(cell+6),gy))
    d.text((gx,gy+cell+4),f"{sa(r['nombre'])[:30]}  {kb(r['original']['bytes'])} -> {kb(r['miniatura']['bytes'])}",fill=(60,60,60),font=F(12))
G.save('docs/comparaciones/6_muestra-aleatoria.jpg',quality=88);print('muestra',G.size)
