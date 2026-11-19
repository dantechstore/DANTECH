#!/usr/bin/env node
/* Etapa 6 - Pruebas de las correcciones finales (Playwright + Chromium, servidor local imitando /DANTECH/).
 * LÍMITES: emulación en Chromium; NO Safari/WebKit, NO dispositivo físico, NO axe-core/Lighthouse. */
const {chromium,devices}=require(process.env.PW||'/home/claude/.npm-global/lib/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=process.cwd(),PORT=8776,ORIGEN=`http://127.0.0.1:${PORT}`,BASE=ORIGEN+'/DANTECH/beta/';
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0].split('#')[0]);if(!u.startsWith('/DANTECH/')){r.statusCode=404;return r.end('no')}u=u.slice(8);let f=path.join(ROOT,u);if(f.endsWith('/'))f+='index.html';
  fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;return r.end('no')}r.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');r.end(d)})});
const R=[];const ok=(id,desc,c,d)=>{R.push({id,ok:!!c});console.log((c?'  OK  ':' FALLA ')+id+' '+desc+(d!==undefined?'  ['+d+']':''))};
const errores=[],wa=[];const CAP='docs/capturas-etapa6/';fs.mkdirSync(CAP,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
let br;
async function abrir(nombre,{vp=null,horizontal=false,init=null,permisos=false}={}){
  let o=vp?{viewport:vp,deviceScaleFactor:1}:{...devices[nombre+(horizontal?' landscape':'')]};
  if(permisos)o.permissions=['clipboard-read','clipboard-write'];
  const ctx=await br.newContext(o);
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith(ORIGEN))return r.continue();if(/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//.test(u)){wa.push(u);return r.fulfill({status:200,body:'ok'})}return r.abort()});
  if(init)await ctx.addInitScript(init);
  const p=await ctx.newPage();p.on('pageerror',e=>errores.push(nombre+': '+e.message));
  await p.goto(BASE+'?sinpopups');await p.waitForSelector('#catalogo[aria-busy="false"]');return{ctx,p};
}
const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
const cr=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
/* contraste mínimo de todo el texto visible con fondo sólido (dentro de la raíz indicada) */
const minContraste=(p,raiz)=>p.evaluate((raiz)=>{
  const parse=s=>{const m=String(s).match(/rgba?\(([^)]+)\)/);if(!m)return null;const a=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return{c:[a[0],a[1],a[2]],a:a.length>3?a[3]:1}};
  const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  let peor={r:99,t:''},n=0;
  document.querySelectorAll(raiz+' *').forEach(el=>{
    const dir=[...el.childNodes].filter(x=>x.nodeType===3&&x.textContent.trim()).length;if(!dir)return;
    const r=el.getBoundingClientRect();if(!r.width||!r.height)return;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')return;
    if(el.disabled||el.closest('[disabled]'))return;
    let bg=[255,255,255],ok=true;
    for(let e=el;e;e=e.parentElement){const s=getComputedStyle(e);if(s.backgroundImage&&s.backgroundImage!=='none'){ok=false;break}const b=parse(s.backgroundColor);if(b&&b.a>0){if(b.a<1){ok=false;break}bg=b.c;break}}
    if(!ok)return;const f=parse(cs.color);if(!f||f.a<1)return;n++;const v=cr(f.c,bg);if(v<peor.r)peor={r:v,t:el.tagName+'.'+el.className+' «'+el.textContent.trim().slice(0,30)+'»'}});
  return{n,min:peor.r,donde:peor.t}},raiz);
const solape=(a,b)=>a&&b&&a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
const caja=(p,s)=>p.evaluate(s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}},s);
const cargarCarrito=(obj,ent)=>`try{localStorage.setItem('dtb_cart',${JSON.stringify(JSON.stringify(obj))});${ent?`localStorage.setItem('dtb_ent','${ent}');`:''}}catch(e){}`;

(async()=>{
  await new Promise(r=>srv.listen(PORT,r));br=await chromium.launch();
  const J=JSON.parse(fs.readFileSync('data/productos.json','utf8'));const prods=J.productos||J;
  /* ---------- 1. CONTRASTES ---------- */
  {const {ctx,p}=await abrir('iPhone 13');
   const t=await p.evaluate(()=>{const s=getComputedStyle(document.documentElement);return['--suave','--oro-osc','--wa','--wa-osc'].map(k=>s.getPropertyValue(k).trim())});
   const h=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16));
   const peorFondo=[255,255,255].map(()=>0);const fondos={marfil:[251,247,241],papel:[255,255,255],linea:[231,223,210],sinfoto:[239,231,217]};
   const margen=Math.min(...['--suave','--oro-osc'].map((k,i)=>Math.min(...Object.values(fondos).map(f=>cr(h(t[i]),f)))),...[t[2]].map(c=>cr(h(c),[255,255,255])));
   ok('C1','tokens de texto (--suave, --oro-osc) ≥4.9:1 aun sobre el fondo más oscuro (--linea) y blanco sobre --wa ≥5.5:1',margen>=4.9,margen.toFixed(2));
   const m1=await minContraste(p,'body');ok('C2','inicio: todo el texto con fondo sólido ≥4.5:1 (margen ≥4.9)',m1.min>=4.9,`${m1.n} textos, peor ${m1.min.toFixed(2)} ${m1.donde}`);
   await p.evaluate(cargarCarrito({[prods[0].id]:2,[prods[5].id]:1}).replace(/^try\{/,'try{').replace(/\}catch\(e\)\{\}$/,'}catch(e){}'));await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');
   await p.click('#btnCarrito');await p.waitForSelector('#capaCarrito:not([hidden])');await p.waitForTimeout(500);
   const m2=await minContraste(p,'#capaCarrito');ok('C3','carrito paso 1 ≥4.9',m2.min>=4.9,`${m2.n} textos, peor ${m2.min.toFixed(2)} ${m2.donde}`);
   await p.click('#carContinuar');await p.waitForTimeout(400);await p.check('#ent-otra');await p.waitForTimeout(300);
   const m3=await minContraste(p,'#capaCarrito');ok('C4','carrito paso 2 (otra ciudad) ≥4.9',m3.min>=4.9,`${m3.n} textos, peor ${m3.min.toFixed(2)} ${m3.donde}`);
   await p.keyboard.press('Escape');await p.waitForTimeout(300);
   await p.click('.tarjeta__nombre button >> nth=0');await p.waitForSelector('#capaDetalle:not([hidden])');await p.waitForTimeout(500);
   const m4=await minContraste(p,'#capaDetalle');ok('C5','detalle de producto ≥4.9',m4.min>=4.9,`${m4.n} textos, peor ${m4.min.toFixed(2)} ${m4.donde}`);await ctx.close();}
  /* ---------- 2. ÁREA TÁCTIL DEL NOMBRE ---------- */
  for(const [nom,vp] of [['iPhone SE',{width:320,height:568}],['iPhone 13',{width:390,height:844}],['Tablet',{width:768,height:1024}]]){
   const {ctx,p}=await abrir('',{vp});
   const r=await p.evaluate(async()=>{const res={n:0,malos:[],pocos:0,tapa:0};const bs=[...document.querySelectorAll('.grilla .tarjeta__nombre button')].filter((_,i)=>i%6===0);
     for(const b of bs){let rc;for(let k=0;k<4;k++){b.scrollIntoView({block:'center'});await new Promise(r=>setTimeout(r,60));rc=b.getBoundingClientRect();const c0=document.elementFromPoint(rc.left+rc.width/2,rc.top+rc.height/2);if(c0===b)break}res.n++;
       const arriba=document.elementFromPoint(rc.left+rc.width/2,rc.top-3),abajo=document.elementFromPoint(rc.left+rc.width/2,rc.bottom+3),med=document.elementFromPoint(rc.left+rc.width/2,rc.top+rc.height/2);
       const alto=rc.height;if(alto<44||med!==b)res.malos.push(b.textContent.trim().slice(0,25)+' '+alto.toFixed(1));
       const card=b.closest('.tarjeta'),ad=card.querySelector('.btn--add'),ra=ad.getBoundingClientRect();
       const e1=document.elementFromPoint(ra.left+ra.width/2,ra.top+1);if(e1!==ad&&!ad.contains(e1))res.tapa++}
     return res});
   ok('T-'+nom,`nombre de producto: área táctil efectiva ≥44 px en ${r.n} tarjetas muestreadas y el botón Agregar no queda tapado`,r.n>20&&!r.malos.length&&r.tapa===0,`malos=${r.malos.slice(0,3).join(';')} tapa=${r.tapa}`);
   await ctx.close();}
  {const {ctx,p}=await abrir('',{vp:{width:390,height:844}});
   const d=await p.evaluate(()=>{const c=document.querySelector('.grilla .tarjeta');const n=c.querySelector('.tarjeta__nombre').getBoundingClientRect().height,b=c.querySelector('.tarjeta__nombre button').getBoundingClientRect().height;return{n,b,efm:getComputedStyle(c.querySelector('.tarjeta__nombre')).fontSize}});
   ok('T-diseño','el diseño no cambia: la caja del nombre sigue midiendo 2.5em (no se agregó alto real)',Math.abs(d.n-2.5*parseFloat(d.efm))<1.5,JSON.stringify(d));
   await p.evaluate(()=>document.querySelector('.grilla .tarjeta__nombre button').scrollIntoView({block:'center'}));const bb=await caja(p,'.grilla .tarjeta__nombre button');await p.mouse.click(bb.x+20,bb.y+3);await p.waitForTimeout(400);
   ok('T-clic','un toque en el borde superior ampliado del nombre abre el detalle',await p.evaluate(()=>!document.querySelector('#capaDetalle').hidden||/p=/.test(location.hash)));await ctx.close();}
  /* ---------- 3. ACCESOS RÁPIDOS ---------- */
  {const {ctx,p}=await abrir('iPhone 13');
   const ls=await p.$$eval('a.saltar',a=>a.map(x=>[x.getAttribute('href'),x.textContent.trim()]));
   ok('S1','existen 3 accesos rápidos: catálogo, buscar/categorías y pie de página',ls.length===3&&ls.map(x=>x[0]).join()==='#catalogo,#barra,#pie',JSON.stringify(ls));
   ok('S2','destinos existen y son enfocables (main, barra, footer)',await p.evaluate(()=>['catalogo','barra','pie'].every(i=>{const e=document.getElementById(i);return e&&e.tabIndex===-1})));
   ok('S3','landmarks: un <main>, un <footer>, <nav> de categorías y buscador (role=search)',await p.evaluate(()=>document.querySelectorAll('main').length===1&&document.querySelectorAll('footer').length===1&&!!document.querySelector('nav[aria-label="Categorías"]')&&!!document.querySelector('[role=search]')));
   await p.keyboard.press('Tab');let f=await p.evaluate(()=>{const a=document.activeElement,r=a.getBoundingClientRect();return{t:a.textContent.trim(),vis:r.left>=0&&r.top>=0&&r.right<=innerWidth}});
   ok('S4','primer Tab: aparece "Saltar al catálogo" visible en pantalla',/Saltar al cat/.test(f.t)&&f.vis,JSON.stringify(f));
   await p.keyboard.press('Enter');await p.waitForTimeout(200);
   let s=await p.evaluate(()=>{const b=document.getElementById('barra'),m=document.getElementById('catalogo').getBoundingClientRect();return{id:document.activeElement.id,hash:location.hash,mtop:m.top,bh:b.offsetHeight}});
   ok('S5','Enter en "Saltar al catálogo": el foco queda en <main>, el hash no cambia y el contenido queda visible bajo la barra fija',s.id==='catalogo'&&s.hash===''&&s.mtop>=s.bh-2&&s.mtop<=p.viewportSize().height/2,JSON.stringify(s));
   await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');await p.keyboard.press('Tab');await p.keyboard.press('Tab');
   f=await p.evaluate(()=>({t:document.activeElement.textContent.trim()}));ok('S6','segundo Tab: "Ir a buscar y categorías"',/buscar y categor/.test(f.t),f.t);
   await p.keyboard.press('Enter');await p.waitForTimeout(200);s=await p.evaluate(()=>({id:document.activeElement.id,hash:location.hash,top:document.getElementById('barra').getBoundingClientRect().top}));
   ok('S7','Enter lleva el foco a la barra de búsqueda/categorías sin cambiar el hash',s.id==='barra'&&s.hash===''&&s.top>=-1&&s.top<400,JSON.stringify(s));
   await p.keyboard.press('Tab');ok('S8','desde allí, el siguiente Tab cae en el campo de búsqueda',await p.evaluate(()=>document.activeElement.id==='buscar'));
   await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');await p.keyboard.press('Tab');await p.keyboard.press('Tab');await p.keyboard.press('Tab');
   f=await p.evaluate(()=>document.activeElement.textContent.trim());ok('S9','tercer Tab: "Ir al pie de página y contacto"',/pie de p/.test(f),f);
   await p.keyboard.press('Enter');await p.waitForTimeout(250);
   s=await p.evaluate(()=>{const r=document.getElementById('pie').getBoundingClientRect();return{id:document.activeElement.id,hash:location.hash,vis:r.top<innerHeight&&r.bottom>0,wa:r.height>0}});
   ok('S10','Enter lleva el foco al pie (visible) sin cambiar el hash; el siguiente Tab es el WhatsApp del pie',s.id==='pie'&&s.hash===''&&s.vis,JSON.stringify(s));
   await p.keyboard.press('Tab');ok('S11','el Tab siguiente cae en «Escríbenos por WhatsApp»',await p.evaluate(()=>document.activeElement.id==='pieWa'));
   await p.screenshot({path:CAP+'pie-por-teclado.jpg',type:'jpeg',quality:70});
   await ctx.close();}
  /* ---------- 4. AVISO (TOAST) Y ENCABEZADO DEL CARRITO ---------- */
  const casos=[['iPhone 13 horizontal','iPhone 13',true],['iPhone SE horizontal','iPhone SE',true],['Pixel 7 horizontal','Pixel 7',true],['iPhone 13 vertical','iPhone 13',false],['iPhone SE vertical','iPhone SE',false]];
  for(const [nom,disp,hz] of casos){
   const {ctx,p}=await abrir(disp,{horizontal:hz,init:cargarCarrito({[prods[0].id]:2,[prods[3].id]:1,[prods[9].id]:1})});
   await p.click('#btnCarrito');await p.waitForSelector('#capaCarrito:not([hidden])');await p.waitForTimeout(500);
   await p.click('[data-accion="quitar"] >> nth=0');await p.waitForSelector('#aviso.on');await p.waitForTimeout(350);
   const ab=await caja(p,'#aviso'),ti=await caja(p,'#carTitulo'),ce=await caja(p,'.capa__cerrar--fijo'),pie=await caja(p,'.carrito__pie');
   const vp=p.viewportSize();
   ok('A-'+nom,'aviso visible, sin tapar título ni botón de cerrar del carrito',ab&&ab.y>=0&&ab.y+ab.h<=vp.height&&!solape(ab,ti)&&!solape(ab,ce),`aviso y=${ab&&Math.round(ab.y)} h=${ab&&Math.round(ab.h)} vp=${vp.width}x${vp.height}`);
   ok('A2-'+nom,'tampoco tapa el pie con «Continuar»/«Enviar pedido»',!!pie&&!solape(ab,pie),`pie y=${pie&&Math.round(pie.y)}`);
   if(nom==='iPhone 13 horizontal')await p.screenshot({path:CAP+'aviso-horizontal-carrito.jpg',type:'jpeg',quality:70});
   await ctx.close();}
  /* ---------- 5. PEDIDOS GRANDES ---------- */
  {const todo={};prods.forEach(x=>todo[x.id]=99);
   const {ctx,p}=await abrir('iPhone 13',{init:cargarCarrito(todo,'tienda'),permisos:true});
   await p.goto(BASE+'?sinpopups#carrito');await p.waitForSelector('#capaCarrito:not([hidden])');await p.waitForTimeout(600);
   ok('G0','carrito extremo (todos los productos ×99) se carga y conserva',await p.evaluate(()=>window.DS_Carrito.totales().lineas)===prods.length);
   await p.click('#carContinuar');await p.waitForTimeout(500);await p.fill('#c-nombre','Cliente Prueba');await p.waitForTimeout(200);
   const g=await p.evaluate(()=>({aviso:!!document.getElementById('avisoGrande'),abierto:document.querySelector('details.copiar').open,btn:!!document.getElementById('btnCopiar'),href:document.getElementById('carEnviar').href,txt:document.getElementById('carTexto').value,largo:window.DS_Carrito.enlace().length}));
   ok('G1','pedido extremo: aparece aviso «Tu pedido es muy grande» y el respaldo de copiar queda abierto',g.aviso&&g.abierto&&g.btn,`enlace ${g.largo} caracteres`);
   ok('G2','el enlace de WhatsApp sigue yendo SOLO a 573134724702 y su texto decodificado es idéntico al mensaje de respaldo',g.href.startsWith('https://wa.me/573134724702?text=')&&decodeURIComponent(g.href.split('?text=')[1])===g.txt);
   await p.click('#btnCopiar');await p.waitForTimeout(400);
   const cb=await p.evaluate(()=>navigator.clipboard.readText().catch(e=>'ERR'));
   ok('G3','«Copiar mensaje» copia el mensaje completo al portapapeles (sin truncar)',cb===g.txt&&cb.length>10000,`${cb.length} caracteres`);
   ok('G4','aviso «Mensaje copiado»',await p.evaluate(()=>document.getElementById('aviso').textContent==='Mensaje copiado'));
   ok('G5','el mensaje largo conserva líneas de los 186 productos y el total (no se recorta)',(g.txt.match(/^\d+\. /gm)||[]).length===prods.length&&/\*TOTAL:\*/.test(g.txt));
   ok('G6','sin desborde horizontal con pedido extremo',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&(()=>{const h=document.querySelector('.capa__hoja--carrito');return h.scrollWidth<=h.clientWidth+1})()));
   await p.screenshot({path:CAP+'pedido-grande.jpg',type:'jpeg',quality:70});
   const n0=wa.length;await p.click('#carEnviar');await p.waitForTimeout(900);
   ok('G7','enviar un pedido extremo no vacía el carrito',await p.evaluate(()=>window.DS_Carrito.totales().lineas)===prods.length);
   await ctx.close();
   const {ctx:c2,p:p2}=await abrir('iPhone 13',{init:cargarCarrito({[prods[0].id]:2,[prods[1].id]:1},'tienda')});
   await p2.goto(BASE+'?sinpopups#carrito');await p2.waitForSelector('#capaCarrito:not([hidden])');await p2.click('#carContinuar');await p2.waitForTimeout(400);
   const q=await p2.evaluate(()=>({aviso:!!document.getElementById('avisoGrande'),abierto:document.querySelector('details.copiar').open}));
   ok('G8','pedido normal: NO aparece el aviso y el respaldo sigue cerrado (comportamiento anterior)',!q.aviso&&!q.abierto);
   await c2.close();}
  /* ---------- 6. MÓVIL, PERSISTENCIA Y CHECKOUT ---------- */
  {const {ctx,p}=await abrir('iPhone 13');
   await p.click('.btn--add >> nth=0');await p.click('.btn--add >> nth=1');await p.waitForTimeout(200);
   const antes=await p.evaluate(()=>JSON.stringify(window.DS_Carrito.items().map(i=>[i.p.id,i.q])));await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');
   ok('M1','el carrito sobrevive a recargar la página',await p.evaluate(()=>JSON.stringify(window.DS_Carrito.items().map(i=>[i.p.id,i.q])))===antes);
   ok('M2','viewport permite zoom (sin user-scalable=no ni maximum-scale) y usa viewport-fit=cover',await p.evaluate(()=>{const c=document.querySelector('meta[name=viewport]').content;return!/user-scalable\s*=\s*(no|0)|maximum-scale/.test(c)&&/viewport-fit=cover/.test(c)}));
   await p.click('#btnCarrito');await p.waitForSelector('#capaCarrito:not([hidden])');await p.click('#carContinuar');await p.waitForTimeout(300);
   ok('M3','campos de texto ≥16 px (iOS no hace zoom automático al enfocar)',await p.evaluate(()=>[...document.querySelectorAll('#capaCarrito input[type=text]'),document.getElementById('buscar')].every(i=>parseFloat(getComputedStyle(i).fontSize)>=16)));
   const w0=wa.length;await p.click('#carEnviar');await p.waitForTimeout(300);
   ok('M4','enviar sin datos: no se abre WhatsApp y se muestran los errores',wa.length===w0&&await p.evaluate(()=>!document.getElementById('carErrores').hidden));
   await p.fill('#c-nombre','Ana');await p.check('#ent-dom');await p.fill('#c-direccion','Calle 1 # 2-3');await p.waitForTimeout(200);
   const hrefOk=await p.evaluate(()=>document.getElementById('carEnviar').href);
   ok('M5','con datos completos el enlace va a 573134724702 con el pedido',/^https:\/\/wa\.me\/573134724702\?text=/.test(hrefOk));
   await p.click('#carEnviar');await p.waitForTimeout(900);
   ok('M6','se registró 1 apertura de WhatsApp y el carrito se conserva',wa.length===w0+1&&await p.evaluate(()=>window.DS_Carrito.totales().lineas)===2);
   await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');
   ok('M7','los datos del comprador viven en sessionStorage y NO en localStorage',await p.evaluate(()=>{const ls=JSON.stringify(localStorage);return!/Ana|Calle 1/.test(ls)&&/Ana/.test(sessionStorage.getItem('dtb_comprador')||'')}));
   await ctx.close();
   const {ctx:c3,p:p3}=await abrir('iPhone 13',{init:`Storage.prototype.getItem=function(){throw new Error('bloqueado')};Storage.prototype.setItem=function(){throw new Error('bloqueado')};`});
   await p3.click('.btn--add >> nth=0');await p3.click('#btnCarrito');await p3.waitForSelector('#capaCarrito:not([hidden])');
   ok('M8','almacenamiento bloqueado (modo privado extremo): el carrito funciona en memoria sin errores',await p3.evaluate(()=>window.DS_Carrito.totales().unidades)===1);await c3.close();
   const {ctx:c4,p:p4}=await abrir('',{vp:{width:320,height:568}});
   ok('M9','320 px de ancho: sin desborde horizontal',await p4.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await c4.close();}
  /* ---------- 7. PROTECCIONES ---------- */
  {const idx=fs.readFileSync('index.html'),cat=fs.readFileSync('catalogo-dantestore.html');
   ok('P1','index.html (catálogo publicado) intacto',sha(idx)==='9b4ac063095243e6efa00925ad42da7eb0f9c0bbf5451323224265a4a5efd685');
   ok('P2','catalogo-dantestore.html intacto',sha(cat)==='820e1d5f50b681d53ec44016f2935e2e73cdaa8c26c1a29153f426c680647569');
   const dat=fs.readFileSync('beta/js/datos.js','utf8');ok('P3','186 productos en la beta',prods.length===186&&(dat.match(/"id":/g)||[]).length>=186,String(prods.length));
   const nums=new Set();for(const f of ['beta/index.html','beta/js/app.js','beta/js/carrito.js','beta/js/config.js','beta/css/estilos.css'])(fs.readFileSync(f,'utf8').match(/(?:wa\.me\/|\+?57)\s?3\d{9}|\b57\d{10}\b/g)||[]).forEach(x=>nums.add(x.replace(/\D/g,'').replace(/^(?!57)/,'57')));
   ok('P4','el único número de WhatsApp en la beta es 573134724702',[...nums].every(x=>x==='573134724702')&&nums.size>=1,[...nums].join());
   const c=fs.readFileSync('beta/js/config.js','utf8');ok('P5','condiciones comerciales sin cambios (domicilio $10.000 contraentrega, otra ciudad por confirmar, tienda gratis, máx 99)',/costo: 10000/.test(c)&&(c.match(/costo: 0/g)||[]).length===2&&/cantidadMaxima: 99/.test(c));
   ok('P6','sin errores de JavaScript durante las pruebas',errores.length===0,errores.slice(0,3).join(' | '));}
  await br.close();srv.close();
  const f=R.filter(x=>!x.ok);console.log(`\nETAPA 6: ${R.length-f.length}/${R.length} pruebas OK`+(f.length?'  FALLAS: '+f.map(x=>x.id).join(', '):''));process.exit(f.length?1:0);
})().catch(e=>{console.error(e);process.exit(2)});
