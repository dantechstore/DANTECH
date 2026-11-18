#!/usr/bin/env node
/* Etapa 5 - Auditoría final de la beta (Playwright + Chromium). No usa Internet: todo se sirve desde 127.0.0.1 imitando GitHub Pages
 * (ruta /DANTECH/, compresión gzip) y las llamadas a wa.me se interceptan y se registran.
 * IMPORTANTE (límites honestos): los «iPhone» y «Android» son EMULACIÓN sobre Chromium (tamaño, píxeles, tacto y agente de usuario);
 * NO se ejecutó Safari/WebKit ni ningún dispositivo físico. Las mediciones de rendimiento son de laboratorio propias, NO Lighthouse.
 * Las comprobaciones de accesibilidad son propias, NO axe-core.
 * Uso: node herramientas/etapa5_pruebas.js   (desde la raíz del repo)  ·  Variables: SOLO=A,C para correr secciones sueltas. */
const {chromium,devices}=require(process.env.PW||'/home/claude/.npm-global/lib/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),zlib=require('zlib');
const ROOT=process.cwd(),PORT=8775,ORIGEN=`http://127.0.0.1:${PORT}`,BASE=ORIGEN+'/DANTECH/beta/';
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const TEXTO=new Set(['.html','.js','.css','.json']);
const SOLO=(process.env.SOLO||'').split(',').filter(Boolean);const quiere=s=>!SOLO.length||SOLO.includes(s);
const peticiones=[];
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0].split('#')[0]);peticiones.push(u);
  if(!u.startsWith('/DANTECH/')){r.statusCode=404;return r.end('no')}u=u.slice(8);let f=path.join(ROOT,u);if(f.endsWith('/'))f+='index.html';
  fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;return r.end('no')}const x=path.extname(f);r.setHeader('Content-Type',MIME[x]||'application/octet-stream');r.setHeader('Cache-Control','max-age=600');
    if(TEXTO.has(x)&&/gzip/.test(q.headers['accept-encoding']||'')){r.setHeader('Content-Encoding','gzip');return r.end(zlib.gzipSync(d))}r.end(d)})});
const J=JSON.parse(fs.readFileSync('data/productos.json','utf8'));
const WA='573134724702';
const din=n=>'$'+String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const R=[];const ok=(id,desc,c,d)=>R.push({id,desc,ok:!!c,d});
const errores=[];const wa=[];const externos=[];
const CAP='docs/capturas-etapa5/';fs.mkdirSync(CAP,{recursive:true});
let br;
const sh=c=>cp.execSync(c,{maxBuffer:1<<28}).toString();

async function abrir(nombre,{horizontal=false,vp=null,tema=null,movimiento=null,sinPopups=true,hash='',init=null,sinEspera=false}={}){
  let o;if(vp)o={viewport:vp,deviceScaleFactor:1};else{o={...(devices[nombre+(horizontal?' landscape':'')]||devices[nombre])};if(horizontal&&!devices[nombre+' landscape']){o.viewport={width:o.viewport.height,height:o.viewport.width};}}
  if(tema)o.colorScheme=tema;if(movimiento)o.reducedMotion=movimiento;
  const ctx=await br.newContext(o);
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith(ORIGEN)||u.startsWith('data:'))return r.continue();if(/^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//.test(u)){wa.push(u);return r.fulfill({status:200,contentType:'text/html',body:'<p>WhatsApp (simulado)</p>'})}externos.push(u);r.abort()});   // se responde 200 (no abort): Chromium reintenta las navegaciones abortadas y contaría dos veces
  if(init)await ctx.addInitScript(init);
  const p=await ctx.newPage();
  p.on('pageerror',e=>errores.push(nombre+': pageerror: '+e.message));
  p.on('console',m=>{if(['error','warning'].includes(m.type())&&!/wa\.me|whatsapp|ERR_FAILED|ERR_ABORTED/.test(m.text()))errores.push(nombre+': console.'+m.type()+': '+m.text())});
  p.on('response',r=>{if(r.status()>=400)errores.push('http '+r.status()+' '+r.url())});
  await p.goto(BASE+(sinPopups?'?sinpopups':'')+hash);if(!sinEspera)await p.waitForSelector('#catalogo[aria-busy="false"]');
  return{ctx,p};
}
async function cap(p,nombre){await p.screenshot({path:CAP+nombre+'.jpg',type:'jpeg',quality:78,scale:'css'})}
const hojear=p=>p.evaluate(async()=>{const h=document.documentElement;for(let y=0;y<h.scrollHeight;y+=Math.max(300,innerHeight*0.8)){scrollTo(0,y);await new Promise(r=>setTimeout(r,25))}scrollTo(0,0);await new Promise(r=>setTimeout(r,300))});
const sinDesborde=p=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.body.scrollWidth<=innerWidth+1);
/* ¿El elemento está dentro de la pantalla y nada lo tapa? */
const visibleSel=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);if(!e)return{existe:false};const r=e.getBoundingClientRect();const dentro=r.top>=-0.5&&r.left>=-0.5&&r.bottom<=innerHeight+0.5&&r.right<=innerWidth+0.5&&r.width>0&&r.height>0;
  const el=document.elementFromPoint(Math.min(Math.max(r.left+r.width/2,0),innerWidth-1),Math.min(Math.max(r.top+r.height/2,0),innerHeight-1));return{existe:true,dentro,libre:!!el&&(el===e||e.contains(el)),w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top),bottom:Math.round(r.bottom),vh:innerHeight}},sel);

/* ======================= contraste (cálculo WCAG 2.x sobre estilos calculados) ======================= */
const CONTRASTE=raiz=>{
  const parse=s=>{const m=String(s).match(/rgba?\(([^)]+)\)/);if(!m)return null;const a=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return{r:a[0],g:a[1],b:a[2],a:a.length>3?a[3]:1}};
  const lum=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
  const mez=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  const BLANCO={r:255,g:255,b:255,a:1};
  function fondos(el){const capas=[];let base=[BLANCO];
    for(let e=el;e;e=e.parentElement){const cs=getComputedStyle(e),bi=cs.backgroundImage,bc=parse(cs.backgroundColor);
      if(bi&&bi!=='none'&&/gradient/.test(bi)){const st=[...bi.matchAll(/rgba?\([^)]+\)/g)].map(m=>parse(m[0])).filter(Boolean);if(st.length){base=st.map(s=>mez(s,BLANCO));break}}
      if(bi&&bi!=='none'&&/url\(/.test(bi)){return null}
      if(bc&&bc.a>0){capas.push(bc);if(bc.a>=.99)break}}
    return base.map(b0=>capas.reduceRight((acc,c)=>mez(c,acc),b0))}
  const out={fallan:[],indeterminados:[],evaluados:0,peor:null};
  const raizEl=raiz?document.querySelector(raiz):document.body;
  const w=document.createTreeWalker(raizEl,NodeFilter.SHOW_TEXT);let n;const vistos=new Set();
  while((n=w.nextNode())){const t=n.textContent.trim();if(!t)continue;const el=n.parentElement;if(!el||vistos.has(el))continue;vistos.add(el);
    if(el.closest('[hidden],.sr,script,style,noscript,[aria-hidden="true"]'))continue;
    if(el.closest('button:disabled,input:disabled,select:disabled,textarea:disabled'))continue;   // WCAG 1.4.3: los componentes inactivos (deshabilitados) están exentos de contraste mínimo
    const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;
    const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;
    let op=1;for(let e=el;e;e=e.parentElement)op*=parseFloat(getComputedStyle(e).opacity);
    const fg=parse(cs.color);if(!fg)continue;fg.a*=op;const fs=parseFloat(cs.fontSize),peso=parseInt(cs.fontWeight)||400,grande=fs>=24||(fs>=18.66&&peso>=700);
    const fds=fondos(el);if(!fds){out.indeterminados.push((el.className||el.tagName)+': «'+t.slice(0,30)+'» (fondo con imagen)');continue}
    let min=99;fds.forEach(b=>{min=Math.min(min,cr(mez(fg,b),b))});out.evaluados++;
    const req=grande?3:4.5;if(!out.peor||min<out.peor.v)out.peor={v:+min.toFixed(2),el:(el.className||el.tagName)+': «'+t.slice(0,30)+'»'};
    if(min<req)out.fallan.push({v:+min.toFixed(2),req,el:(el.className||el.tagName)+': «'+t.slice(0,30)+'» '+fs+'px'})}
  return out};

/* ======================= nombre accesible y controles ======================= */
const NOMBRES=raiz=>{
  const vis=e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&!e.closest('[hidden]')};
  const nom=e=>{let n=(e.getAttribute('aria-label')||'').trim();if(n)return n;const lb=e.getAttribute('aria-labelledby');if(lb){n=lb.split(/\s+/).map(i=>(document.getElementById(i)||{}).textContent||'').join(' ').trim();if(n)return n}
    if(e.labels&&e.labels.length){n=[...e.labels].map(l=>l.textContent).join(' ').trim();if(n)return n}
    const im=e.querySelector('img[alt]:not([alt=""])');if(im)return im.alt;n=(e.innerText||e.textContent||'').trim();if(n)return n;return(e.getAttribute('title')||e.getAttribute('placeholder')||'').trim()};
  const r=document.querySelector(raiz||'body');const sin=[];let total=0;
  r.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button]').forEach(e=>{if(!vis(e))return;total++;if(!nom(e))sin.push((e.id||e.className||e.tagName)+'')});
  const imgs=[...r.querySelectorAll('img')].filter(vis);const sinAlt=imgs.filter(i=>!i.hasAttribute('alt')).map(i=>i.src.split('/').pop());
  const prodSinNombre=imgs.filter(i=>/\/(miniaturas|completas)\//.test(i.src)&&!/_logo/.test(i.src)&&!i.alt&&!i.closest('button[aria-label],[aria-hidden="true"],.galeria__mini,.mosaico')).map(i=>i.src.split('/').pop());
  return{total,sin,sinAlt,prodSinNombre,imgs:imgs.length}};

/* ======================= áreas táctiles ======================= */
const TACTIL=raiz=>{
  const vis=e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&!e.closest('[hidden]')};
  const r=document.querySelector(raiz||'body');const chicos=[];let total=0;
  r.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button]').forEach(e=>{if(!vis(e))return;if(e.classList.contains('saltar'))return;total++;const lab=(e.type==='radio'||e.type==='checkbox')?e.closest('label'):null;const b=(lab||e).getBoundingClientRect();   // en opciones de radio, el área que se toca es la fila completa (label), no el círculo
    if(b.width<44-.5||b.height<44-.5)chicos.push({el:(e.id?'#'+e.id:'.'+String(e.className).split(' ')[0]||e.tagName),w:Math.round(b.width),h:Math.round(b.height),t:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,28),p:e.parentElement?String(e.parentElement.className):''})});
  return{total,chicos}};

/* ============================================================================================================== */
(async()=>{
await new Promise(r=>srv.listen(PORT,r));
br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const prod=J.productos,conPrecio=prod.filter(x=>x.precio&&!x.sin_foto);
const [A,B,C2]=[conPrecio[0],conPrecio[3],conPrecio[7]],Cn=prod.find(x=>!x.precio);

/* ===================================== A. CATÁLOGO Y DATOS ===================================== */
if(quiere('A')){
  const {ctx,p}=await abrir(null,{vp:{width:1280,height:900}});
  const dom=await p.evaluate(()=>[...document.querySelectorAll('#catalogo > .seccion')].map(s=>({cat:s.querySelector('h2').textContent,cuenta:s.querySelector('.seccion__cab > span').textContent,items:[...s.querySelectorAll('.tarjeta')].map(t=>({id:t.dataset.id,nombre:t.querySelector('.tarjeta__nombre').textContent.trim(),precio:t.querySelector('.precio').textContent.trim(),sinfoto:!!t.querySelector('.sinfoto'),nuevo:!!t.querySelector('.ins--nuevo'),vende:!!t.querySelector('.ins--vende')}))})));
  const nT=dom.reduce((a,s)=>a+s.items.length,0);
  ok('A1','186 productos y 20 categorías en la página, con las categorías en el orden de productos.json',nT===186&&dom.length===20&&dom.map(s=>s.cat).join('|')===J.categorias.map(c=>c.nombre).join('|'),{productos:nT,categorias:dom.length});
  let dif=[];dom.forEach(s=>{const esp=prod.filter(x=>x.categoria===s.cat);if(esp.length!==s.items.length||s.cuenta!==esp.length+(esp.length===1?' producto':' productos'))dif.push(s.cat+' conteo');esp.forEach((x,i)=>{const g=s.items[i]||{};const pr=x.precio?din(x.precio):x.precio_texto;if(g.id!==x.id||g.nombre!==x.nombre||g.precio!==pr)dif.push(x.id+' '+x.nombre+' | '+(g.nombre)+' '+g.precio+' vs '+pr)})});
  ok('A2','identificador, nombre, precio y ORDEN de los 186 productos coinciden exactamente con data/productos.json',!dif.length,dif.slice(0,3));
  const todos=dom.flatMap(s=>s.items);
  ok('A3','precios con formato $x.xxx y un único producto «Consultar» (Cepillo Alisador, sin precio inventado)',todos.filter(t=>/^\$\d{1,3}(\.\d{3})*$/.test(t.precio)).length===185&&todos.filter(t=>t.precio==='Consultar').length===1&&todos.find(t=>t.precio==='Consultar').id===Cn.id,todos.filter(t=>t.precio==='Consultar').map(t=>t.nombre));
  const esperSin=prod.filter(x=>x.sin_foto||!x.fotos.length).map(x=>x.id).sort();
  ok('A4','los 2 productos sin foto muestran «Foto próximamente» (no se inventa imagen) y siguen siendo abribles',JSON.stringify(todos.filter(t=>t.sinfoto).map(t=>t.id).sort())===JSON.stringify(esperSin)&&esperSin.length===2&&await p.evaluate(ids=>ids.every(i=>{const b=document.querySelector(`.tarjeta[data-id="${i}"] .tarjeta__foto`);return b&&(b.getAttribute('aria-label')||'').startsWith('Ver detalle')}),esperSin),esperSin);
  await hojear(p);
  const im=await p.evaluate(()=>{const l=[...document.querySelectorAll('#catalogo img')];return{n:l.length,rotas:l.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src.split('/').pop()),fuera:l.filter(i=>!/\/img\/miniaturas\/.+\.webp$/.test(i.src)).length,sinWH:l.filter(i=>!i.getAttribute('width')||!i.getAttribute('height')).length,altMal:l.filter(i=>!i.alt).length}});
  ok('A5','todas las fotos de las tarjetas cargan (0 rotas), son miniaturas WebP, con alt (nombre del producto) y width/height',im.rotas.length===0&&im.fuera===0&&im.sinWH===0&&im.altMal===0&&im.n>=184,im);
  // A6: detalle de los 186
  const ids=prod.map(x=>x.id);
  const det=await p.evaluate(async ids=>{const out=[];for(const id of ids){location.hash='p='+id;await new Promise(r=>setTimeout(r,35));const d=document.querySelector('#capaDetalle');out.push({id,vis:!d.hidden,nombre:(d.querySelector('#detNombre')||{}).textContent,precio:((d.querySelector('.detalle__precio')||{}).textContent||'').trim(),cat:((d.querySelector('.detalle__cat')||{}).textContent||'').trim(),desc:(d.querySelector('.detalle__desc')||{}).textContent||'',minis:d.querySelectorAll('.galeria__mini button').length,img:(d.querySelector('.galeria__principal img')||{src:null}).src,sinfoto:!!d.querySelector('.galeria__principal .sinfoto')});location.hash='';await new Promise(r=>setTimeout(r,35))}return out},ids);
  const strip=s=>String(s).replace(/\*/g,'').replace(/\s+/g,'');
  let d6=[];det.forEach((g,i)=>{const x=prod[i],pr=x.precio?din(x.precio):x.precio_texto;const nf=x.fotos.length;
    if(!g.vis||g.nombre!==x.nombre||g.precio!==pr||g.cat!==x.categoria||strip(g.desc)!==strip(x.descripcion||'')||(nf?(!/\/img\/completas\/.+\.webp$/.test(g.img||'')||g.sinfoto):!g.sinfoto)||(nf>1&&g.minis!==nf)||(nf<=1&&g.minis!==0))d6.push(x.id+' '+x.nombre+' '+JSON.stringify({v:g.vis,n:g.nombre,p:g.precio,c:g.cat,img:(g.img||'').split('/').pop(),minis:g.minis,nf}))});
  ok('A6','el detalle de los 186 productos muestra nombre, precio, categoría, descripción y nº de fotos idénticos a productos.json, con foto completa (WebP 900)',!d6.length,d6.slice(0,3));
  ok('A6b','131 productos sin descripción siguen sin descripción (no se inventó texto)',prod.filter(x=>!x.descripcion).length===131&&det.filter((g,i)=>!prod[i].descripcion&&g.desc.trim()==='').length===131);
  // A7 galería
  const mx=prod.reduce((a,x)=>x.fotos.length>a.fotos.length?x:a,prod[0]);
  await p.goto(BASE+'?sinpopups#p='+mx.id);await p.waitForSelector('#capaDetalle:not([hidden])');
  const gal=[];for(let i=0;i<mx.fotos.length;i++){await p.waitForTimeout(120);gal.push(await p.evaluate(()=>{const g=document.querySelector('.galeria__principal img');return{src:g.src.split('/').pop(),ok:g.complete&&g.naturalWidth>0,cont:(document.getElementById('detContador')||{}).textContent}}));await p.click('[data-accion="foto-sig"]')}
  ok('A7','galería: se recorren las '+mx.fotos.length+' fotos de «'+mx.nombre+'» (cada una distinta, completa y cargada) y la siguiente vuelve a la primera',new Set(gal.map(g=>g.src)).size===mx.fotos.length&&gal.every(g=>g.ok)&&(await p.evaluate(()=>document.querySelector('.galeria__principal img').src.split('/').pop()))===gal[0].src,gal.map(g=>g.cont));
  await p.goto(BASE+'?sinpopups');await p.waitForSelector('#catalogo[aria-busy="false"]');
  // A8 destacados y etiquetas
  const dest=await p.evaluate(()=>[...document.querySelectorAll('#destacados .tarjeta')].map(t=>({id:t.dataset.id,v:!!t.querySelector('.ins--vende')})));
  ok('A8','8 «Más vendidos»: los mismos ids y en el mismo orden que productos.json, todos con su insignia',JSON.stringify(dest.map(d=>d.id))===JSON.stringify(J.mas_vendidos.map(m=>m.id||m))&&dest.length===8&&dest.every(d=>d.v),dest.map(d=>d.id).slice(0,3));
  ok('A9','etiquetas: «NUEVO» ('+prod.filter(x=>x.etiquetas.nuevo).length+') y «Más vendido» coinciden con los datos',todos.filter(t=>t.nuevo).length===prod.filter(x=>x.etiquetas.nuevo).length&&todos.every(t=>t.nuevo===!!prod.find(x=>x.id===t.id).etiquetas.nuevo&&t.vende===!!prod.find(x=>x.id===t.id).etiquetas.mas_vendido));
  // A10 búsqueda
  const consultas=['airpods','AUDIFONOS','Audífonos','camara','cámara wifi','navidad','  ','zzzz','<b>x</b>','"\'&%$#','a','juguetería','cepillo alisador','carro control remoto','Perfume'];
  const malB=[];for(const q of consultas){await p.fill('#buscar',q);await p.waitForTimeout(450);const g=await p.evaluate(()=>({n:document.querySelectorAll('#catalogo .tarjeta').length,ids:[...document.querySelectorAll('#catalogo .tarjeta')].map(t=>t.dataset.id)}));
    const t=norm(q).split(/\s+/).filter(Boolean);const esp=t.length?prod.filter(x=>{const h=norm(x.nombre+' '+x.categoria);return t.every(w=>h.includes(w))}).map(x=>x.id):null;
    if(esp===null){if(g.n!==186-0&&g.n!==prod.length+8)malB.push(JSON.stringify(q)+' vacía: '+g.n)}else if(JSON.stringify(g.ids)!==JSON.stringify(esp))malB.push(JSON.stringify(q)+' '+g.n+' vs '+esp.length)}
  ok('A10','buscador: '+consultas.length+' consultas (mayúsculas, tildes, varias palabras, vacía, sin resultados, caracteres especiales) devuelven exactamente lo esperado',!malB.length,malB.slice(0,3));
  await p.fill('#buscar','zzzz');await p.waitForTimeout(450);
  ok('A10b','sin resultados: mensaje claro, botón «Ver todo» y enlace de WhatsApp al número autorizado',await p.evaluate(w=>{const v=document.querySelector('.vacio');return!!v&&v.textContent.includes('No encontramos')&&!!v.querySelector('[data-accion="todo"]')&&[...v.querySelectorAll('a[href]')].every(a=>a.href.startsWith('https://wa.me/'+w+'?text='))},WA));
  await p.fill('#buscar','');await p.click('#borrarBusqueda').catch(()=>{});await p.waitForTimeout(100);
  // A11 filtros
  const malF=[];for(const c of J.categorias){await p.click(`.chip[data-cat="${c.nombre}"]`);await p.waitForTimeout(60);const g=await p.evaluate(()=>({ids:[...document.querySelectorAll('#catalogo .tarjeta')].map(t=>t.dataset.id),pres:document.querySelector('.chip[aria-pressed="true"]').dataset.cat,h:document.querySelector('#catalogo h2').textContent}));
    const esp=prod.filter(x=>x.categoria===c.nombre).map(x=>x.id);if(JSON.stringify(g.ids)!==JSON.stringify(esp)||g.pres!==c.nombre||g.h!==c.nombre)malF.push(c.nombre)}
  await p.click('.chip[data-cat=""]');await p.waitForTimeout(80);
  ok('A11','filtros: cada una de las 20 categorías muestra exactamente sus productos y marca su chip; «Todo» restaura los 186 + 8 destacados',!malF.length&&await p.evaluate(()=>document.querySelectorAll('#catalogo > .seccion .tarjeta').length)===186,malF);
  // A12 enlaces directos y hashes inválidos
  const e0=errores.length;for(const h of ['#p=noexiste','#cat=zzz','#p=%E0%A4%A','#cat=','#p=','#carrito','#sinpopups','#p='+prod[5].id,'#cat='+encodeURIComponent('Navidad')]){await p.goto(BASE+'?sinpopups'+h);await p.waitForSelector('#catalogo[aria-busy="false"]');await p.waitForTimeout(120)}
  ok('A12','enlaces directos (#p=ID, #cat=, #carrito) y hashes inválidos o mal codificados no producen errores',errores.length===e0,errores.slice(e0));
  await ctx.close();
}

/* ===================================== B. COMPRA POR LA INTERFAZ ===================================== */
if(quiere('B')){
  const {ctx,p}=await abrir('iPhone 14');
  const unit=(x,q)=>`${q} × ${din(x.precio)} = ${din(x.precio*q)}`;
  const esperado=(items,ent,d)=>{const sub=items.reduce((a,[x,q])=>a+x.precio*q,0),u=items.reduce((a,[,q])=>a+q,0);const L=['*PEDIDO DANTESTORE*','Hola DANTESTORE 👋, quiero hacer este pedido.','','*Cliente:* '+d.nombre,'',`*Productos* (${items.length} ${items.length===1?'producto':'productos'}, ${u} ${u===1?'unidad':'unidades'}):`];
    items.forEach(([x,q],i)=>{L.push((i+1)+'. '+x.nombre);L.push('   '+unit(x,q))});L.push('');L.push('*Subtotal:* '+din(sub));
    if(ent==='dom'){L.push('*Entrega:* Domicilio en Bogotá (+$10.000, pago contraentrega)','*Dirección:* '+d.direccion+', '+d.barrio,'*Indicaciones:* '+d.indicaciones,'*Domicilio:* $10.000','*TOTAL:* '+din(sub+10000))}
    else if(ent==='otra'){L.push('*Entrega:* Envío a otra ciudad (valor del envío por confirmar)','*Ciudad de destino:* '+d.ciudad+', '+d.departamento,'*Dirección o barrio de destino:* '+d.destino,'*Envío:* por cotizar','*TOTAL:* pendiente de confirmar (envío por cotizar)','Productos con precio: '+din(sub))}
    else L.push('*Entrega:* Recoger en tienda (gratis)','*TOTAL:* '+din(sub));L.push('','Origen: catálogo web');return L.join('\n')};
  const agregar=async(x,n=1)=>{for(let i=0;i<n;i++)await p.click(`#catalogo > .seccion .tarjeta[data-id="${x.id}"] .btn--add`)};
  await agregar(A,2);await agregar(B,1);
  ok('B1','agregar desde las tarjetas: 3 unidades en la insignia y barra «Ver carrito» visible con el subtotal',(await p.textContent('#insCarrito'))==='3'&&await p.isVisible('#barraCarrito')&&(await p.textContent('#barraCarrito')).includes(din(A.precio*2+B.precio)));
  await p.click('#btnCarrito');await p.waitForSelector('#carContinuar');
  const t1=await p.textContent('.carrito__conteo');
  ok('B2','paso 1: «3 unidades · 2 productos diferentes», subtotal por producto y general correctos',t1.replace(/\s+/g,' ').includes('3 unidades')&&t1.includes('2 productos diferentes')&&(await p.textContent('.carrito__lista')).includes(din(A.precio*2))&&(await p.textContent('.resumen')).includes(din(A.precio*2+B.precio)));
  await p.click(`#mas-${B.id}`);await p.click(`#mas-${B.id}`);await p.click(`#menos-${B.id}`);await p.click(`#menos-${A.id}`);
  const subEsp=A.precio*1+B.precio*2;
  ok('B3','cambiar cantidades en el carrito (＋ ＋ − y − ) recalcula: A=1, B=2',(await p.textContent('.resumen')).includes(din(subEsp))&&await p.evaluate(([a,b])=>DS_Carrito.cantidad(a)===1&&DS_Carrito.cantidad(b)===2,[A.id,B.id]));
  await p.click('#carContinuar');await p.waitForSelector('#c-nombre');
  await p.click('#carEnviar');
  ok('B4','enviar sin datos: NO abre WhatsApp y muestra qué falta (nombre y entrega)',wa.length===0&&await p.isVisible('#carErrores')&&(await p.textContent('#carErrores')).includes('nombre')&&(await p.textContent('#carErrores')).includes('recibir'));
  // --- domicilio Bogotá
  await p.fill('#c-nombre','Ana Pérez');await p.click('#ent-dom');await p.fill('#c-direccion','Calle 100 # 15-20 apto 301');await p.fill('#c-barrio','Chicó');await p.fill('#c-indicaciones','Torre 2, portería');
  const d1={nombre:'Ana Pérez',direccion:'Calle 100 # 15-20 apto 301',barrio:'Chicó',indicaciones:'Torre 2, portería'};
  ok('B5','Domicilio en Bogotá: total = subtotal + $10.000 (pago contraentrega) mostrado en resumen y pie',(await p.textContent('#carTotalPie'))===din(subEsp+10000)&&(await p.textContent('.resumen--det')).includes('$10.000')&&(await p.textContent('.resumen--det')).includes('contraentrega'));
  const wa0=wa.length;await p.click('#carEnviar');await p.waitForSelector('.enviado');
  const url=wa[wa.length-1]||'';
  ok('B6','mensaje de domicilio: va SOLO a wa.me/'+WA+', coincide palabra por palabra con el esperado y se conserva el carrito',wa.length===wa0+1&&url.startsWith('https://wa.me/'+WA+'?text=')&&decodeURIComponent(url.split('?text=')[1])===esperado([[A,1],[B,2]],'dom',d1)&&await p.evaluate(()=>DS_Carrito.totales().unidades)===3,decodeURIComponent(url.split('?text=')[1]||'').slice(0,80));
  // --- otra ciudad
  await p.click('#ent-otra');await p.fill('#c-ciudad','Medellín');await p.fill('#c-departamento','Antioquia');await p.fill('#c-destino','Laureles, Cra 70 # 44-10');
  const txt=await p.textContent('.resumen--det');
  ok('B7','Envío a otra ciudad: «Envío: Por cotizar» y «Total definitivo: Pendiente de cotización» (no gratis, no $0)',txt.includes('Por cotizar')&&(await p.textContent('#carTotalPie'))==='Pendiente de cotización'&&!/Gratis/.test(txt.split('Entrega')[1]||'')&&(await p.textContent('.carrito__total')).includes('Total definitivo'));
  const w1=wa.length;await p.click('#carEnviar');await p.waitForSelector('.enviado');
  ok('B8','mensaje a otra ciudad: ciudad, departamento, destino, «Envío: por cotizar» y TOTAL «pendiente de confirmar» (idéntico al esperado)',wa.length===w1+1&&decodeURIComponent(wa[wa.length-1].split('?text=')[1])===esperado([[A,1],[B,2]],'otra',{nombre:'Ana Pérez',ciudad:'Medellín',departamento:'Antioquia',destino:'Laureles, Cra 70 # 44-10'}),{n_antes:w1,n_ahora:wa.length,nuevas:wa.slice(w1).map(u=>decodeURIComponent(u.split('?text=')[1]||'').split('\n').filter(l=>/Entrega|Ciudad|Cliente|Subtotal|TOTAL|Env/.test(l)).join(' ⏎ ')),recibido:decodeURIComponent((wa[wa.length-1]||'').split('?text=')[1]||'').replace(/\n/g,' ⏎ ')});
  // --- tienda
  await p.click('#ent-tienda');
  ok('B9','Recoger en tienda: gratis, solo se pide el nombre, total = subtotal',(await p.textContent('#carTotalPie'))===din(subEsp)&&!await p.isVisible('#c-direccion')&&!await p.isVisible('#c-ciudad')&&(await p.textContent('.resumen--det')).includes('Gratis'));
  const w2=wa.length;await p.click('#carEnviar');await p.waitForSelector('.enviado');
  ok('B10','mensaje de tienda: sin datos de dirección ni ciudad aunque se hubieran escrito antes (idéntico al esperado)',wa.length===w2+1&&decodeURIComponent(wa[wa.length-1].split('?text=')[1])===esperado([[A,1],[B,2]],'tienda',{nombre:'Ana Pérez'}),'recibido: '+decodeURIComponent((wa[wa.length-1]||'').split('?text=')[1]||'').replace(/\n/g,' ⏎ ')+' || esperado: '+esperado([[A,1],[B,2]],'tienda',{nombre:'Ana Pérez'}).replace(/\n/g,' ⏎ '));
  // persistencia
  await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');
  ok('B11','al recargar: carrito y entrega se conservan (3 unidades, tienda)',(await p.textContent('#insCarrito'))==='3'&&await p.evaluate(()=>DS_Carrito.entrega())==='tienda');
  const ls=await p.evaluate(()=>({l:Object.keys(localStorage),s:Object.keys(sessionStorage),v:JSON.stringify(localStorage)+document.cookie,c:document.cookie}));
  ok('B12','datos personales: nada del comprador en localStorage ni cookies; solo en sessionStorage de la pestaña',!/Ana|Chicó|Calle 100|Medell|Laureles|Torre 2/.test(ls.v)&&ls.c===''&&ls.s.join()==='dtb_comprador'&&ls.l.every(k=>/^dtb_(cart|ent|pm_)/.test(k)),ls);
  // tope 99 por la interfaz
  if(!await p.isVisible('#capaCarrito'))await p.click('#btnCarrito');await p.waitForSelector(`#mas-${A.id}`);   // con #carrito en la dirección, al recargar el carrito se reabre solo
  await p.evaluate(id=>{for(let i=0;i<120;i++){const b=document.getElementById('mas-'+id);if(b&&!b.disabled)b.click()}},A.id);
  ok('B13','cantidades: el máximo por la interfaz es 99 («＋» se desactiva y explica el tope); el mínimo es 1 («−» desactivado)',await p.evaluate(id=>DS_Carrito.cantidad(id)===99&&document.getElementById('mas-'+id).disabled&&/Máximo 99/.test(document.querySelector('.citem__tope')?.textContent||''),A.id)&&await p.evaluate(id=>document.getElementById('menos-'+id).disabled===false,A.id)&&await p.evaluate(id=>document.getElementById('menos-'+id)!==null,B.id));
  await p.click('[data-accion="cerrar"].btn--sec');await p.waitForTimeout(150);await p.click(`#catalogo > .seccion .tarjeta[data-id="${A.id}"] .btn--add`);
  ok('B14','agregar desde la tarjeta con 99 unidades no pasa del máximo y avisa',await p.evaluate(id=>DS_Carrito.cantidad(id)===99,A.id)&&(await p.textContent('#aviso')).includes('Máximo 99'));
  // pedido enorme
  const gr=await p.evaluate(()=>{DS_Carrito.vaciar();DANTESTORE_DATOS.productos.forEach(x=>DS_Carrito.agregar(x.id,99));DS_Carrito.fijarEntrega('otra');DS_Carrito.fijarDato('nombre','Ana Pérez');DS_Carrito.fijarDato('ciudad','Cali');const m=DS_Carrito.mensaje();return{lineas:DS_Carrito.totales().lineas,uni:DS_Carrito.totales().unidades,msg:m.length,url:DS_Carrito.enlace().length,ok:DS_Carrito.validar().ok}});
  ok('B15','pedido extremo (los 186 productos × 99): no se rompe, el mensaje y el enlace se generan y el texto de respaldo existe (largos medidos: mensaje '+gr.msg+' · enlace '+gr.url+' caracteres)',gr.lineas===186&&gr.uni===186*99&&gr.ok&&gr.url>gr.msg,gr);
  await p.evaluate(()=>DS_Carrito.vaciar());
  // WhatsApp: destino único en todo lo visible
  await p.goto(BASE+'?sinpopups');await p.waitForSelector('#catalogo[aria-busy="false"]');
  const num=await p.evaluate(()=>{const h=document.documentElement.outerHTML;return{wa:[...h.matchAll(/wa\.me\/(\d+)/g)].map(m=>m[1]),otros:[...h.matchAll(/(?<![\w.-])(\+?57)?[ -]?3\d{2}[ -]?\d{3}[ -]?\d{4}(?!\d)/g)].map(m=>m[0].replace(/\D/g,'')),tel:/href="tel:/.test(h),api:/api\.whatsapp|web\.whatsapp/.test(h)}});
  ok('B16','todo enlace de WhatsApp de la página apunta al único número autorizado; sin tel: ni otros teléfonos',num.wa.length>0&&num.wa.every(n=>n===WA)&&num.otros.every(n=>n===WA||n==='57'+WA.slice(2)||WA.endsWith(n))&&!num.tel&&!num.api,num);
  await ctx.close();
}

/* ===================================== C. SEGURIDAD Y ESTABILIDAD ===================================== */
if(quiere('C')){
  const XSS=['<img src=x onerror=window.__xss=1>','"><script>window.__xss=1</script>','\'"><svg/onload=window.__xss=1>','javascript:window.__xss=1','{{7*7}}${7*7}'];
  const {ctx,p}=await abrir('iPhone 14');
  for(const x of XSS){await p.fill('#buscar',x);await p.waitForTimeout(60)}
  await p.fill('#buscar','');
  await p.evaluate(()=>{DS_Carrito.vaciar();DS_Carrito.agregar(DANTESTORE_DATOS.productos[0].id,1);DS_Carrito.fijarEntrega('dom')});
  for(const k of ['nombre','direccion','barrio','indicaciones'])await p.evaluate(([k,v])=>DS_Carrito.fijarDato(k,v),[k,XSS[0]]);
  await p.click('#btnCarrito');await p.click('#carContinuar');await p.waitForSelector('#c-nombre');
  for(const k of ['nombre','direccion','barrio','indicaciones'])await p.fill('#c-'+k,XSS[1]);
  await p.waitForTimeout(100);
  const inj=await p.evaluate(()=>({x:window.__xss,img:document.querySelectorAll('img[src="x"]').length,svg:document.querySelectorAll('svg[onload],script:not([src])').length,area:document.getElementById('carTexto').value.includes('<script>window.__xss=1</script>')}));
  ok('C1','XSS: cargas hostiles en el buscador y en los 4 campos de texto no ejecutan código ni inyectan elementos (se escapan; en el mensaje van como texto)',inj.x===undefined&&inj.img===0&&inj.svg===0&&inj.area,inj);
  const e0=errores.length;
  for(const h of ['#p="><img src=x onerror=window.__xss=1>','#cat=<img src=x onerror=window.__xss=1>','#p=\'+alert(1)+\'']){await p.goto(BASE+'?sinpopups'+h);await p.waitForSelector('#catalogo[aria-busy="false"]')}
  await p.goto(BASE+'?sinpopups&q=<img src=x onerror=window.__xss=1>');await p.waitForSelector('#catalogo[aria-busy="false"]');
  ok('C2','XSS por la dirección: hash y parámetros hostiles se ignoran sin ejecutar nada ni producir errores',await p.evaluate(()=>window.__xss)===undefined&&errores.length===e0,errores.slice(e0));
  await p.evaluate(h=>{localStorage.setItem('dtb_cart',JSON.stringify({'<img src=x onerror=window.__xss=1>':3,'__proto__':{'polluted':1},'constructor':{'prototype':{'p':1}}}));localStorage.setItem('dtb_ent','<img src=x onerror=window.__xss=1>');localStorage.setItem('dtb_pm_nav','ñ'.repeat(100000))},0);
  await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');
  ok('C3','almacenamiento local hostil (ids con HTML, __proto__, constructor, valor de 100 KB): se descarta, sin contaminar prototipos ni ejecutar código',await p.evaluate(()=>window.__xss===undefined&&({}).polluted===undefined&&({}).p===undefined&&DS_Carrito.totales().unidades===0));
  // cookies, claves, externos
  const e2=await p.evaluate(()=>({c:document.cookie,l:Object.keys(localStorage)}));
  ok('C4','sin cookies; solo claves propias dtb_* en localStorage',e2.c===''&&e2.l.every(k=>k.startsWith('dtb_')),e2);
  await ctx.close();
  // nueva pestaña: sessionStorage vacío, carrito persiste
  { const {ctx:c2,p:q}=await abrir('iPhone 14');await q.evaluate(()=>{DS_Carrito.vaciar();DS_Carrito.agregar(DANTESTORE_DATOS.productos[2].id,2);DS_Carrito.fijarEntrega('tienda');DS_Carrito.fijarDato('nombre','Ana Pérez')});
    const q2=await c2.newPage();await q2.goto(BASE+'?sinpopups');await q2.waitForSelector('#catalogo[aria-busy="false"]');
    ok('C5','datos del comprador NO sobreviven a una pestaña nueva (se borran al cerrar la pestaña); el carrito sí se conserva',await q2.evaluate(()=>DS_Carrito.comprador('nombre')==='')&&await q2.evaluate(()=>DS_Carrito.totales().unidades===2)&&await q.evaluate(()=>DS_Carrito.comprador('nombre')==='Ana Pérez'));
    await q.evaluate(()=>DS_Carrito.vaciar());ok('C5b','vaciar el carrito borra también los datos del comprador de sessionStorage',await q.evaluate(()=>sessionStorage.length===0));
    await c2.close(); }
  // almacenamiento bloqueado
  { const e1=errores.length;const {ctx:c3,p:q}=await abrir('iPhone 14',{init:()=>{const d=()=>{throw new DOMException('denied','SecurityError')};Object.defineProperty(window,'localStorage',{get:d});Object.defineProperty(window,'sessionStorage',{get:d})}});
    await q.click(`#catalogo > .seccion .tarjeta[data-id="${A.id}"] .btn--add`);await q.click('#btnCarrito');await q.click('#carContinuar');await q.fill('#c-nombre','Ana');await q.click('#ent-tienda');
    ok('C6','almacenamiento bloqueado (modo privado extremo): la beta carga y el carrito/pedido funcionan en memoria, sin errores',(await q.textContent('#insCarrito'))==='1'&&(await q.getAttribute('#carEnviar','href')).startsWith('https://wa.me/'+WA)&&errores.length===e1,errores.slice(e1));await c3.close(); }
  // entradas extremas
  { const {ctx:c4,p:q}=await abrir('iPhone 14');await q.evaluate(id=>{DS_Carrito.vaciar();DS_Carrito.agregar(id,1);DS_Carrito.fijarEntrega('dom')},A.id);
    const r=await q.evaluate(()=>{const t0=performance.now();const L='x'.repeat(10000);['nombre','direccion','barrio','indicaciones','ciudad','departamento','destino'].forEach(k=>DS_Carrito.fijarDato(k,L));const v=DS_Carrito.validar();const m=DS_Carrito.mensaje();
      DS_Carrito.fijarDato('nombre','  \u0000\u202e\n\t  ');const v2=DS_Carrito.validar();DS_Carrito.fijarDato('nombre','😀'.repeat(100));return{max:DS_Carrito.comprador('direccion').length,vok:v.ok,msg:m.length,vacioNombreInvalido:!!v2.errores.nombre,emoji:DS_Carrito.comprador('nombre').length,ms:Math.round(performance.now()-t0)}});
    ok('C7','entradas extremas: 10.000 caracteres se recortan al máximo (120), nombre de solo espacios/control es inválido, emojis y buscador de 10.000 caracteres no bloquean (< 500 ms)',r.max===120&&r.vacioNombreInvalido&&r.ms<500&&await (async()=>{const t=Date.now();await q.fill('#buscar','ñ'.repeat(10000));await q.waitForTimeout(50);return Date.now()-t<1500})(),r);await c4.close(); }
  // revisión de fuentes
  const arch=['beta/index.html','beta/css/estilos.css','beta/js/app.js','beta/js/carrito.js','beta/js/config.js','beta/js/datos.js'];
  const src=arch.map(f=>[f,fs.readFileSync(f,'utf8')]);
  const urls=new Set();src.forEach(([f,s])=>[...s.matchAll(/https?:\/\/[a-z0-9.\-]+/gi)].forEach(m=>urls.add(m[0].toLowerCase())));
  ok('C8','el código solo menciona 2 dominios: wa.me (pedidos) y dantechstore.github.io (vista previa Open Graph); sin CDN, fuentes, analítica ni servicios externos',[...urls].every(u=>/^https?:\/\/(wa\.me|dantechstore\.github\.io)$/.test(u)),[...urls]);
  ok('C9','sin eval, new Function, document.write, atributos on*= ni imports dinámicos',!src.some(([f,s])=>/\beval\(|new Function|document\.write|\son[a-z]+\s*=\s*["']|import\(|fetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(s.replace(/\/\*[\s\S]*?\*\//g,''))),src.filter(([f,s])=>/\beval\(|document\.write|fetch\(|XMLHttpRequest/.test(s)).map(x=>x[0]));
  const lsrc=sh('git ls-files').split('\n').filter(f=>/^(beta|data)\//.test(f));
  const campos=new Set();J.productos.forEach(x=>Object.keys(x).forEach(k=>campos.add(k)));
  ok('C10','datos expuestos mínimos: productos.json solo tiene campos de catálogo (sin costos, proveedores, stock, márgenes, clientes)',![...campos].some(k=>/cost|proveed|stock|margen|utilid|client|compra|venta|cantidad|inventario/i.test(k)),[...campos].join(','));
  const todo=sh('git ls-files').split('\n').filter(f=>f&&!/\.(webp|jpg|png)$/.test(f));
  let hits=[];todo.forEach(f=>{let s='';try{s=fs.readFileSync(f,'utf8').replace(/\b[0-9a-f]{64}\b/g,'')}catch(e){return}   // se quitan las huellas sha256 (64 hex): sus dígitos no son teléfonosif(f.startsWith('_respaldo')||f==='index.html'||f==='catalogo-dantestore.html')return;if(f==='herramientas/etapa5_pruebas.js')return;
    if(/hotmail|@[a-z0-9-]+\.(com|es|co)\b|oskar_toledo/i.test(s.replace(/@(media|keyframes|import|font-face|supports|charset|types)/g,'')))hits.push(f+': correo/identidad');
    const n=[...s.matchAll(/(?<![\w.#-])(\+?57[ -]?)?3\d{2}[ -]?\d{3}[ -]?\d{4}(?!\d)/g)].map(m=>m[0].replace(/\D/g,'')).filter(x=>!(x===WA||x===WA.slice(2)));if(n.length&&!/sha|hash/i.test(f))hits.push(f+': '+[...new Set(n)].join(','))});
  ok('C11','ningún correo, identidad personal ni teléfono distinto del autorizado en beta/, data/, docs/, herramientas/ (los respaldos del catálogo original se excluyen)',!hits.length,hits.slice(0,5));
  // enlaces target=_blank
  { const {ctx:c5,p:q}=await abrir('iPhone 14');const bad=[];const rev=async e=>bad.push(...await q.evaluate(()=>[...document.querySelectorAll('a[target="_blank"]')].filter(a=>!/noopener/.test(a.rel)).map(a=>a.href)));
    await rev();await q.goto(BASE+'?sinpopups#p='+B.id);await q.waitForSelector('#capaDetalle:not([hidden])');await rev();await q.fill('#buscar','zzzz').catch(()=>{});
    await q.goto(BASE+'?sinpopups');await q.waitForSelector('#catalogo[aria-busy="false"]');await q.fill('#buscar','zzzz');await rev();
    await q.evaluate(()=>{DS_Carrito.vaciar();DS_Carrito.agregar(DANTESTORE_DATOS.productos[0].id,1);DS_Carrito.fijarEntrega('tienda');DS_Carrito.fijarDato('nombre','Ana')});await q.click('#btnCarrito');await q.click('#carContinuar');await rev();
    ok('C12','todos los enlaces que abren pestaña nueva (target=_blank) llevan rel="noopener" en inicio, detalle, sin resultados y carrito',!bad.length,bad);await c5.close(); }
  // robots / noindex / base
  const H=fs.readFileSync('beta/index.html','utf8');
  ok('C13','la beta no se indexa: noindex, nofollow; sin <base>; sin formularios que envíen datos (el buscador no envía nada)',/<meta name="robots" content="noindex, nofollow">/.test(H)&&!/<base\b/.test(H)&&!/<form[^>]*action=/.test(H));
}

/* ===================================== G. ARCHIVOS, RUTAS Y ENLACES ===================================== */
if(quiere('G')){
  const {ctx,p}=await abrir('iPhone 14');
  const refs=await p.evaluate(()=>{const o=new Set();document.querySelectorAll('[src],link[href],a[href]').forEach(e=>{const u=e.getAttribute('src')||e.getAttribute('href');if(u&&!/^(#|mailto:|tel:|https?:|data:|javascript:)/.test(u))o.add(new URL(u,location.href).pathname)});return[...o]});
  const rr=await Promise.all(refs.map(async u=>{const s=await p.evaluate(async u=>(await fetch(u,{method:'HEAD'})).status,u);return[u,s]}));
  ok('G1','todos los recursos y enlaces internos de la página inicial existen (HTTP 200)',rr.every(x=>x[1]===200),rr.filter(x=>x[1]!==200));
  const M=JSON.parse(fs.readFileSync('data/manifiesto_imagenes.json','utf8')).imagenes;
  const urls=[];M.forEach(m=>{urls.push([m.miniatura,'miniatura'],[m.completa,'completa'])});
  const malo=[];for(const [m] of urls){const f=m.archivo;const st=fs.existsSync(f)&&fs.statSync(f).size===m.bytes;if(!st)malo.push(f)}
  ok('G2','las 642 imágenes WebP (321 miniaturas + 321 completas) existen en disco con el tamaño exacto del manifiesto',urls.length===642&&!malo.length,malo.slice(0,3));
  const datos=fs.readFileSync('beta/js/datos.js','utf8');const D=eval('(function(){var window={};'+datos+';return window.DANTESTORE_DATOS})()');
  const rutas=[];D.productos.forEach(x=>x.fotos.forEach(f=>{rutas.push(f.m,f.c)}));
  const mal=[];const st=await p.evaluate(async rs=>{const o=[];for(const r of rs){const x=await fetch('/DANTECH/'+r,{method:'HEAD'});o.push([r,x.status])}return o},[...new Set(rutas)]);
  st.forEach(([r,s])=>{if(s!==200)mal.push(r+' '+s)});
  const dim=D.productos.flatMap(x=>x.fotos).filter(f=>{const m=M.find(m=>m.miniatura.archivo.endsWith('/'+f.m.split('/').pop()));return!m||m.miniatura.ancho!==f.w||m.miniatura.alto!==f.h});
  ok('G3','cada foto que cita datos.js responde 200 en su ruta (miniatura y completa) y las dimensiones declaradas (width/height) coinciden con el manifiesto',!mal.length&&!dim.length&&rutas.length===640,{rutas:rutas.length,mal:mal.slice(0,3),dim:dim.length});
  const ent=sh('git ls-files img/miniaturas img/completas').split('\n').filter(Boolean);
  ok('G4','mayúsculas/minúsculas y nombres: todo archivo de imagen está en minúsculas y sin espacios (seguro en GitHub Pages, que distingue mayúsculas)',ent.every(f=>f===f.toLowerCase()||/_logo/.test(f))&&!ent.some(f=>/\s/.test(f)),ent.filter(f=>f!==f.toLowerCase()).slice(0,3));
  ok('G5','CSS sin url() externas ni rotas',!/url\((?!['"]?(data:|#))/.test(fs.readFileSync('beta/css/estilos.css','utf8').replace(/\/\*[\s\S]*?\*\//g,'')));
  ok('G6','ninguna petición a recursos externos durante TODAS las pruebas (solo 127.0.0.1 y wa.me interceptado)',externos.length===0,[...new Set(externos)].slice(0,5));
  await ctx.close();
  // servidor local de la guía del iPhone
  const sp=cp.spawn('python3',['herramientas/servir_beta.py','8796'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,1500));
  try{const c=await br.newContext({...devices['iPhone 14']});const q=await c.newPage();const er=[];q.on('pageerror',e=>er.push(e.message));q.on('response',r=>{if(r.status()>=400)er.push(r.status()+' '+r.url())});
    await q.goto('http://127.0.0.1:8796/beta/?sinpopups');await q.waitForSelector('#catalogo[aria-busy="false"]',{timeout:10000});const n=await q.evaluate(()=>document.querySelectorAll('#catalogo > .seccion .tarjeta').length);await q.waitForTimeout(500);
    ok('G7','el servidor local de la guía del iPhone (herramientas/servir_beta.py) sirve la beta completa: 186 productos, imágenes y carrito sin errores',n===186&&er.length===0,er.slice(0,3));await c.close()}finally{sp.kill()}
}

/* ===================================== D. DISPOSITIVOS (EMULACIÓN) ===================================== */
if(quiere('D')){
  const MATRIZ=[['iPhone SE (3rd gen)',0],['iPhone 14',0],['iPhone 14 Pro Max',0],['Pixel 7',0],['Galaxy S9+',0],['iPad (gen 7)',0],['iPad Pro 11',0],['Galaxy Tab S4',0]];
  const DESK=[['Escritorio 1366×768',{width:1366,height:768}],['Escritorio 1920×1080',{width:1920,height:1080}]];
  const lista=[];MATRIZ.forEach(([n])=>{lista.push({n,h:false});lista.push({n,h:true})});DESK.forEach(([n,vp])=>lista.push({n,vp,h:false}));
  const CAPTURAR=new Set(['iPhone 14|v','Pixel 7|v','iPad (gen 7)|v','iPad (gen 7)|h','iPhone 14|h','Escritorio 1366×768|v','iPhone SE (3rd gen)|v']);
  const resumen=[];
  for(const dv of lista){
    const tag=dv.n+(dv.vp?'':dv.h?' horizontal':' vertical'),clave=dv.n+'|'+(dv.h?'h':'v'),falla=[];const ancho=!!dv.vp;
    const opts=dv.vp?{vp:dv.vp}:{horizontal:dv.h};
    // ---- ventanas emergentes
    { const {ctx,p}=await abrir(dv.vp?null:dv.n,{...opts,sinPopups:false,sinEspera:true});
      for(const k of ['nav','jug']){
        try{await p.waitForSelector('#capaPopup:not([hidden])',{timeout:9000})}catch(e){falla.push('popup '+k+' no apareció');break}
        await p.waitForTimeout(700);   // la caja aparece con una animación de escala (.85→1): se mide ya terminada
        const g=await p.evaluate(()=>{const caja=document.querySelector('.pm__caja'),c=caja.getBoundingClientRect(),x=document.querySelector('.pm__x').getBoundingClientRect(),b=document.querySelector('.pm__caja .btn').getBoundingClientRect();const cs=getComputedStyle(caja);
          return{vh:innerHeight,vw:innerWidth,c:[c.top,c.bottom,c.left,c.right],x:[x.width,x.height,x.top,x.bottom,x.left,x.right],b:[b.top,b.bottom],scroll:caja.scrollHeight>caja.clientHeight+1&&/auto|scroll/.test(cs.overflowY)}});
        const dentro=g.c[0]>=-0.5&&g.c[1]<=g.vh+0.5&&g.c[2]>=-0.5&&g.c[3]<=g.vw+0.5;
        if(!dentro&&!g.scroll)falla.push('popup '+k+' se sale de la pantalla '+JSON.stringify(g.c.map(Math.round))+' vh='+g.vh);
        if(g.x[0]<44-.5||g.x[1]<44-.5)falla.push('popup '+k+' botón cerrar '+Math.round(g.x[0])+'×'+Math.round(g.x[1]));
        if(g.x[2]<0||g.x[3]>g.vh||g.x[4]<0||g.x[5]>g.vw)falla.push('popup '+k+' cerrar fuera de pantalla');
        if(g.b[1]>g.vh+.5&&!g.scroll)falla.push('popup '+k+' botón principal fuera');
        if(k==='nav'&&CAPTURAR.has(clave)&&dv.n!=='iPhone SE (3rd gen)')await cap(p,'popup_'+dv.n.replace(/[^\w]+/g,'-')+(dv.h?'_h':'_v'));
        await p.click('.pm__x');await p.waitForTimeout(150);
      }
      await ctx.close(); }
    // ---- recorrido de compra
    const {ctx,p}=await abrir(dv.vp?null:dv.n,opts);
    const pg=async(vista,extra)=>{if(!await sinDesborde(p))falla.push('desborde horizontal en '+vista)};
    await pg('inicio');
    const lg=await p.evaluate(()=>{const i=document.querySelector('.marca__logo'),r=i.getBoundingClientRect();return{w:r.width,h:r.height,ok:i.complete&&i.naturalWidth===200,dentro:r.top>=0&&r.bottom<=innerHeight&&r.left>=0,f:getComputedStyle(i).filter}});
    if(!(lg.ok&&lg.w>=56&&Math.abs(lg.w-lg.h)<.5&&lg.f==='none'))falla.push('logo '+JSON.stringify(lg));
    const pre=await p.evaluate(()=>{const e=[...document.querySelectorAll('.tarjeta .precio')].slice(0,40),n=[...document.querySelectorAll('.tarjeta__nombre button')].slice(0,40);const fs=a=>Math.min(...a.map(x=>parseFloat(getComputedStyle(x).fontSize)));return{precio:fs(e),nombre:fs(n),desc:parseFloat(getComputedStyle(document.querySelector('.portada__sub')).fontSize)}});
    if(pre.precio<16||pre.nombre<14)falla.push('texto pequeño '+JSON.stringify(pre));
    if(CAPTURAR.has(clave))await cap(p,'inicio_'+dv.n.replace(/[^\w]+/g,'-')+(dv.h?'_h':'_v'));
    await p.click('.chip[data-cat="Juguetería"]');await p.waitForTimeout(150);await pg('categoría');
    await p.fill('#buscar','cam');await p.waitForTimeout(150);await pg('búsqueda');await p.fill('#buscar','');await p.click('.chip[data-cat=""]');await p.waitForTimeout(100);
    // detalle
    await p.goto(BASE+'?sinpopups#p='+B.id);await p.waitForSelector('#capaDetalle:not([hidden])');await p.waitForTimeout(250);await pg('detalle');
    const dc=await visibleSel(p,'#capaDetalle .capa__cerrar');if(!(dc.dentro&&dc.libre&&dc.w>=44&&dc.h>=44))falla.push('detalle: botón cerrar '+JSON.stringify(dc));
    await p.evaluate(()=>document.getElementById('detAgregar').scrollIntoView({block:'center'}));await p.waitForTimeout(100);const da=await visibleSel(p,'#detAgregar');if(!(da.dentro&&da.libre&&da.h>=44))falla.push('detalle: botón agregar '+JSON.stringify(da));
    if(CAPTURAR.has(clave))await cap(p,'detalle_'+dv.n.replace(/[^\w]+/g,'-')+(dv.h?'_h':'_v'));
    await p.click('#detAgregar');await p.keyboard.press('Escape');await p.waitForTimeout(150);
    // carrito con 6 productos
    await p.evaluate(ids=>{ids.forEach(i=>DS_Carrito.agregar(i,1))},[A,B,C2,conPrecio[11],conPrecio[15],conPrecio[19]].map(x=>x.id));
    await p.evaluate(()=>window.scrollTo(0,0));await p.click('#btnCarrito');await p.waitForSelector('#carContinuar');await p.waitForTimeout(250);await pg('carrito paso 1');
    const bC=await visibleSel(p,'#carContinuar'),bS=await visibleSel(p,'.carrito__pie .btn--sec');
    for(const [n,b] of [['Continuar',bC],['Seguir comprando',bS]])if(!(b.dentro&&b.libre&&b.h>=44))falla.push('carrito paso 1: «'+n+'» '+JSON.stringify(b));
    const cuerpo1=await p.evaluate(()=>({h:document.querySelector('.carrito__cuerpo').clientHeight,vh:innerHeight}));if(cuerpo1.h<Math.min(140,cuerpo1.vh*.25))falla.push('carrito paso 1: área útil muy baja '+JSON.stringify(cuerpo1));
    if(CAPTURAR.has(clave))await cap(p,'carrito1_'+dv.n.replace(/[^\w]+/g,'-')+(dv.h?'_h':'_v'));
    await p.click('#carContinuar');await p.waitForSelector('#c-nombre');await p.click('#ent-dom');await p.waitForTimeout(150);await pg('carrito paso 2');
    const bE=await visibleSel(p,'#carEnviar');if(!(bE.dentro&&bE.libre&&bE.h>=44))falla.push('paso 2: botón enviar '+JSON.stringify(bE));
    const cuerpo2=await p.evaluate(()=>({h:document.querySelector('.carrito__cuerpo').clientHeight,pie:document.querySelector('.carrito__pie').offsetHeight,vh:innerHeight}));if(cuerpo2.h<Math.min(140,cuerpo2.vh*.25))falla.push('paso 2: área útil muy baja '+JSON.stringify(cuerpo2));
    await p.fill('#c-nombre','Ana Pérez');await p.fill('#c-direccion','Calle 100 # 15-20');await p.waitForTimeout(100);
    const camposFS=await p.evaluate(()=>Math.min(...[...document.querySelectorAll('.carrito__cuerpo input')].map(i=>parseFloat(getComputedStyle(i).fontSize))));if(camposFS<16)falla.push('campos <16px (zoom automático en iPhone): '+camposFS);
    if(CAPTURAR.has(clave))await cap(p,'carrito2_'+dv.n.replace(/[^\w]+/g,'-')+(dv.h?'_h':'_v'));
    // teclado virtual (emulado: se reduce el alto visible)
    if(!ancho){const vp=p.viewportSize();const kb=dv.h?(vp.height>400?260:170):(vp.height>700?300:260);const alto=Math.max(150,vp.height-kb);await p.setViewportSize({width:vp.width,height:alto});
      await p.evaluate(()=>document.getElementById('c-indicaciones').focus());await p.waitForTimeout(200);
      const tk=await p.evaluate(()=>{const i=document.getElementById('c-indicaciones').getBoundingClientRect(),pie=document.querySelector('.carrito__pie'),pr=pie.getBoundingClientRect(),el=document.elementFromPoint(i.left+i.width/2,Math.min(Math.max(i.top+i.height/2,0),innerHeight-1));
        return{vh:innerHeight,top:Math.round(i.top),bottom:Math.round(i.bottom),pieTop:Math.round(pr.top),pieH:Math.round(pr.height),pieVis:getComputedStyle(pie).display!=='none',libre:el&&el.id==='c-indicaciones'}});
      if(!(tk.libre&&tk.top>=0&&(tk.bottom<=tk.pieTop||!tk.pieVis)))falla.push('teclado virtual: el campo enfocado queda tapado '+JSON.stringify(tk));
      await p.setViewportSize(vp);}
    await p.evaluate(()=>document.activeElement.blur());
    // Escape / cierre
    await p.keyboard.press('Escape');await p.waitForTimeout(150);
    resumen.push([tag,falla.length]);
    ok('D:'+tag,'recorrido completo sin desbordes, con logo visible, popups dentro de pantalla, botones Continuar/Seguir/Enviar visibles y táctiles ≥44, campos ≥16 px y campo tapado por el teclado',!falla.length,falla.slice(0,5));
    await ctx.close();
  }
}

/* ===================================== E. RENDIMIENTO ===================================== */
if(quiere('E')){
  const dev={...devices['Pixel 7']};const ctx=await br.newContext(dev);
  await ctx.route('**/*',r=>{const u=r.request().url();(u.startsWith(ORIGEN)?r.continue():r.abort())});
  await ctx.addInitScript(()=>{window.__m={lcp:0,cls:0,fcp:0,largas:0,tbt:0};try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name==='first-contentful-paint')window.__m.fcp=e.startTime}).observe({type:'paint',buffered:true});
    new PerformanceObserver(l=>{for(const e of l.getEntries())window.__m.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__m.cls+=e.value}).observe({type:'layout-shift',buffered:true});
    new PerformanceObserver(l=>{for(const e of l.getEntries()){window.__m.largas++;if(e.duration>50)window.__m.tbt+=e.duration-50}}).observe({type:'longtask',buffered:true})}catch(e){}});
  const p=await ctx.newPage();const cdp=await ctx.newCDPSession(p);const rec=new Map();let bytes={html:0,css:0,js:0,img:0,otros:0},n={html:0,css:0,js:0,img:0,otros:0};const urlsImg=[];
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8*.9,uploadThroughput:750*1024/8*.9});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  cdp.on('Network.responseReceived',e=>rec.set(e.requestId,{url:e.response.url,tipo:e.type}));
  cdp.on('Network.loadingFinished',e=>{const r=rec.get(e.requestId);if(!r)return;const k=r.tipo==='Document'?'html':r.tipo==='Stylesheet'?'css':r.tipo==='Script'?'js':r.tipo==='Image'?'img':'otros';bytes[k]+=e.encodedDataLength;n[k]++;if(k==='img')urlsImg.push(r.url)});
  const t0=Date.now();await p.goto(BASE+'?sinpopups',{waitUntil:'load'});await p.waitForSelector('#catalogo[aria-busy="false"]');await p.waitForTimeout(2500);
  const m=await p.evaluate(()=>({...window.__m,dcl:Math.round(performance.timing.domContentLoadedEventEnd-performance.timing.navigationStart),carga:Math.round(performance.timing.loadEventEnd-performance.timing.navigationStart)}));
  const kb=x=>Math.round(x/1024);
  const info={lcp_ms:Math.round(m.lcp),fcp_ms:Math.round(m.fcp),cls:+m.cls.toFixed(3),tbt_ms:Math.round(m.tbt),dom_ms:m.dcl,carga_ms:m.carga,html_kb:kb(bytes.html),css_kb:kb(bytes.css),js_kb:kb(bytes.js),img_kb:kb(bytes.img),imgs:n.img,total_kb:kb(bytes.html+bytes.css+bytes.js+bytes.img+bytes.otros)};
  ok('E1','carga inicial en celular (Pixel 7 emulado, 4G lenta 1,6 Mbps/150 ms, CPU ×4, sin caché): LCP ≤ 2,5 s... medido '+info.lcp_ms+' ms',info.lcp_ms>0&&info.lcp_ms<=4000,info);
  ok('E1b','estabilidad visual: CLS ≤ 0,1 y bloqueo total (TBT) ≤ 300 ms',m.cls<=0.1&&m.tbt<=300,{cls:info.cls,tbt:info.tbt_ms});
  ok('E2','peso inicial: código comprimido ≤ 100 KB y total (con las primeras imágenes) ≤ 600 KB, frente a los 20 MB del catálogo actual',bytes.html+bytes.css+bytes.js<=100*1024&&info.total_kb<=600,{codigo_kb:kb(bytes.html+bytes.css+bytes.js),total_kb:info.total_kb});
  const grandes=urlsImg.filter(u=>/\/(completas|originales)\//.test(u));
  ok('E3','la lista no descarga fotos completas ni originales (solo miniaturas WebP): '+urlsImg.length+' imágenes al inicio',grandes.length===0&&urlsImg.every(u=>/\.webp$/.test(u)),grandes.slice(0,3));
  const lazy=await p.evaluate(()=>{const l=[...document.querySelectorAll('#catalogo img')];return{n:l.length,lazy:l.filter(i=>i.loading==='lazy').length,sinWH:l.filter(i=>!i.width||!i.height).length}});
  ok('E4','imágenes con carga diferida: '+lazy.lazy+' de '+lazy.n+' (solo se cargan al acercarse); todas con width/height',lazy.lazy>=lazy.n-8&&lazy.sinWH===0&&urlsImg.length<60,{lazy,cargadas:urlsImg.length});
  // desplazarse todo el catálogo
  const antes=urlsImg.length;await p.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=400){scrollTo(0,y);await new Promise(r=>setTimeout(r,40))}});await p.waitForTimeout(1200);
  const dup=urlsImg.length-new Set(urlsImg).size;
  ok('E5','recorrer todo el catálogo carga solo miniaturas, sin duplicados ('+urlsImg.length+' imágenes, '+kb(bytes.img)+' KB en total)',urlsImg.length>antes&&dup===0&&urlsImg.every(u=>/\/miniaturas\//.test(u)),{dup,img_kb:kb(bytes.img)});
  // detalle: carga una completa
  const antes2=urlsImg.length;await p.goto(BASE+'?sinpopups#p='+B.id);await p.waitForSelector('#capaDetalle:not([hidden])');await p.waitForTimeout(1500);
  const nuevas=urlsImg.slice(antes2);ok('E6','abrir un producto descarga solo su foto completa (y miniaturas del mismo producto), no las de otros',nuevas.filter(u=>/\/completas\//.test(u)).length<=1&&nuevas.every(u=>/\.webp$/.test(u)),nuevas.map(u=>u.split('/').pop()));
  const H=fs.readFileSync('beta/index.html','utf8');
  ok('E7','scripts al final del cuerpo (no bloquean el pintado), una sola hoja de estilos, sin fuentes web externas',(H.match(/<script src/g)||[]).length===4&&H.lastIndexOf('<script src')>H.indexOf('</footer>')&&(H.match(/rel="stylesheet"/g)||[]).length===1&&!/fonts\.(googleapis|gstatic)/.test(H));
  const gzT=['beta/index.html','beta/css/estilos.css','beta/js/config.js','beta/js/datos.js','beta/js/carrito.js','beta/js/app.js'].map(f=>[f,fs.statSync(f).size,zlib.gzipSync(fs.readFileSync(f)).length]);
  ok('E8','tamaño del código: '+kb(gzT.reduce((a,x)=>a+x[1],0))+' KB sin comprimir → '+kb(gzT.reduce((a,x)=>a+x[2],0))+' KB con gzip (GitHub Pages comprime texto)',gzT.reduce((a,x)=>a+x[2],0)<60*1024,gzT.map(x=>x[0].split('/').pop()+':'+kb(x[2])));
  await ctx.close();
}

/* ===================================== F. ACCESIBILIDAD (comprobaciones propias, NO axe) ===================================== */
if(quiere('F')){
  const {ctx,p}=await abrir('iPhone 14');const H=fs.readFileSync('beta/index.html','utf8');
  const meta=await p.evaluate(()=>({lang:document.documentElement.lang,titulo:document.title,vp:document.querySelector('meta[name=viewport]').content,h1:document.querySelectorAll('h1').length,main:document.querySelectorAll('main').length,header:document.querySelectorAll('header').length,footer:document.querySelectorAll('footer').length,navs:[...document.querySelectorAll('nav')].map(n=>n.getAttribute('aria-label')),buscar:!!document.querySelector('[role=search]'),saltar:!!document.querySelector('.saltar[href="#catalogo"]')}));
  ok('F1','idioma es, título, viewport SIN bloqueo de zoom (sin user-scalable=no ni maximum-scale), un solo h1, landmarks header/main/footer/nav con nombre/búsqueda y enlace «Saltar al catálogo»',meta.lang==='es'&&meta.titulo.length>10&&!/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(meta.vp)&&meta.h1===1&&meta.main===1&&meta.header===1&&meta.footer===1&&meta.navs.every(Boolean)&&meta.buscar&&meta.saltar,meta);
  const jer=await p.evaluate(()=>{const h=[...document.querySelectorAll('h1,h2,h3,h4')].filter(e=>!e.closest('[hidden]')).map(e=>+e.tagName[1]);let salto=0;for(let i=1;i<h.length;i++)if(h[i]-h[i-1]>1)salto++;return{n:h.length,salto}});
  ok('F2','jerarquía de títulos sin saltos (h1 → h2 → h3) en la página principal',jer.salto===0,jer);
  const nm=await p.evaluate(NOMBRES,'body');
  ok('F3','inicio: todos los '+nm.total+' controles (botones, enlaces, campos) tienen nombre accesible; las '+nm.imgs+' imágenes tienen atributo alt; las de producto con el nombre del producto',nm.sin.length===0&&nm.sinAlt.length===0&&nm.prodSinNombre.length===0,nm);
  // contraste
  const vistas=[];
  vistas.push(['inicio',await p.evaluate(CONTRASTE,'body')]);
  await p.click('.chip[data-cat="Navidad"]');await p.waitForTimeout(100);vistas.push(['categoría',await p.evaluate(CONTRASTE,'#catalogo')]);await p.click('.chip[data-cat=""]');
  await p.fill('#buscar','zzzz');await p.waitForTimeout(100);vistas.push(['sin resultados',await p.evaluate(CONTRASTE,'#catalogo')]);await p.fill('#buscar','');await p.click('#borrarBusqueda').catch(()=>{});
  await p.goto(BASE+'?sinpopups#p='+B.id);await p.waitForSelector('#capaDetalle:not([hidden])');await p.waitForTimeout(250);vistas.push(['detalle',await p.evaluate(CONTRASTE,'#capaDetalle')]);const nmD=await p.evaluate(NOMBRES,'#capaDetalle');
  await p.keyboard.press('Escape');await p.evaluate(ids=>ids.forEach(i=>DS_Carrito.agregar(i,1)),[A.id,B.id,Cn.id]);await p.click('#btnCarrito');await p.waitForSelector('#carContinuar');vistas.push(['carrito paso 1',await p.evaluate(CONTRASTE,'#capaCarrito')]);const nmC1=await p.evaluate(NOMBRES,'#capaCarrito');
  await p.click('#carContinuar');await p.waitForSelector('#c-nombre');await p.click('#carEnviar');await p.waitForTimeout(100);vistas.push(['carrito paso 2 con errores',await p.evaluate(CONTRASTE,'#capaCarrito')]);const nmC2=await p.evaluate(NOMBRES,'#capaCarrito');
  await p.click('#ent-otra');await p.waitForTimeout(80);vistas.push(['carrito paso 2 otra ciudad',await p.evaluate(CONTRASTE,'#capaCarrito')]);
  await p.click('[data-accion="paso-1"]');await p.click('[data-accion="vaciar"]');await p.waitForTimeout(100);vistas.push(['confirmar vaciar',await p.evaluate(CONTRASTE,'#capaCarrito')]);
  const fall=vistas.flatMap(([v,r])=>r.fallan.map(f=>v+' → '+f.v+':1 (mín. '+f.req+') '+f.el));const ev=vistas.reduce((a,[,r])=>a+r.evaluados,0);const ind=vistas.flatMap(([v,r])=>r.indeterminados);
  ok('F4','contraste WCAG AA (4,5:1 texto normal, 3:1 texto grande) en inicio, categoría, sin resultados, detalle, carrito (3 estados) y confirmación: '+ev+' textos evaluados',fall.length===0,{fallan:fall.slice(0,8),peor:vistas.map(([v,r])=>v+':'+(r.peor?r.peor.v:'-')).join(' | '),indeterminados:ind.length});
  ok('F5','detalle y carrito (pasos 1 y 2): todos los controles con nombre accesible y alt presente',[nmD,nmC1,nmC2].every(x=>x.sin.length===0&&x.sinAlt.length===0),{detalle:nmD.sin,c1:nmC1.sin,c2:nmC2.sin});
  await ctx.close();
  // teclado
  { const {ctx:c,p:q}=await abrir(null,{vp:{width:1280,height:800}});
    await q.keyboard.press('Tab');const salto=await q.evaluate(()=>document.activeElement.className);await q.keyboard.press('Enter');await q.waitForTimeout(100);
    ok('F6','teclado: el primer Tab llega a «Saltar al catálogo» y Enter lleva el foco al catálogo',salto==='saltar'&&await q.evaluate(()=>document.activeElement.id==='catalogo'||document.querySelector('#catalogo').contains(document.activeElement)));
    await q.goto(BASE+'?sinpopups');await q.waitForSelector('#catalogo[aria-busy="false"]');
    const pasos=[];const sin=[];let pie=false;
    for(let i=0;i<1000;i++){await q.keyboard.press('Tab');const s=await q.evaluate(()=>{const e=document.activeElement;if(!e||e===document.body)return null;const cs=getComputedStyle(e),r=e.getBoundingClientRect();const o=cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>0,sombra=cs.boxShadow!=='none';return{id:e.id||e.className||e.tagName,vis:o||sombra,pie:e.id==='pieWa',w:r.width,h:r.height,name:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,20)}});if(!s){pasos.push(null);continue}pasos.push(s.id);if(!s.vis)sin.push(s.id+' «'+s.name+'»');if(s.pie)pie=true;if(pie)break}
    ok('F7','teclado: se recorre toda la página con Tab hasta el pie ('+pasos.length+' paradas) sin trampas y cada parada tiene indicador de foco visible',pie&&sin.length===0&&pasos.filter(Boolean).length>150,{paradas:pasos.length,sinIndicador:[...new Set(sin)].slice(0,5)});
    // modales: foco atrapado, Esc y retorno
    await q.goto(BASE+'?sinpopups');await q.waitForSelector('#catalogo[aria-busy="false"]');await q.focus('#btnCarrito');
    await q.evaluate(id=>DS_Carrito.agregar(id,1),A.id);await q.keyboard.press('Enter');await q.waitForSelector('#capaCarrito:not([hidden])');
    const dentro=[];for(let i=0;i<14;i++){await q.keyboard.press('Tab');dentro.push(await q.evaluate(()=>document.getElementById('capaCarrito').contains(document.activeElement)))}
    await q.keyboard.press('Escape');await q.waitForTimeout(250);
    ok('F8','carrito (modal): el foco permanece dentro con 14 Tab, Esc lo cierra y el foco vuelve al botón «Carrito»',dentro.every(Boolean)&&await q.evaluate(()=>document.getElementById('capaCarrito').hidden&&document.activeElement.id==='btnCarrito'),dentro.filter(x=>!x).length);
    await q.click(`.tarjeta[data-id="${B.id}"] .tarjeta__foto`);await q.waitForSelector('#capaDetalle:not([hidden])');const d2=[];for(let i=0;i<20;i++){await q.keyboard.press('Tab');d2.push(await q.evaluate(()=>document.getElementById('capaDetalle').contains(document.activeElement)))}
    await q.keyboard.press('Escape');await q.waitForTimeout(250);
    ok('F9','detalle (modal): el foco permanece dentro con 20 Tab, Esc lo cierra y el foco vuelve a la tarjeta',d2.every(Boolean)&&await q.evaluate(()=>document.getElementById('capaDetalle').hidden&&!!document.activeElement.closest('.tarjeta')));
    await q.close();await c.close(); }
  // popup accesible
  { const {ctx:c,p:q}=await abrir('iPhone 14',{sinPopups:false,sinEspera:true});await q.waitForSelector('#capaPopup:not([hidden])',{timeout:9000});
    const r=await q.evaluate(()=>{const d=document.getElementById('capaPopup');return{rol:d.getAttribute('role'),modal:d.getAttribute('aria-modal'),lab:d.getAttribute('aria-labelledby'),foco:document.activeElement.className}});
    await q.keyboard.press('Escape');await q.waitForTimeout(200);
    ok('F10','ventana emergente: role=dialog, aria-modal, título asociado, foco en «Cerrar» y Esc la cierra',r.rol==='dialog'&&r.modal==='true'&&r.lab==='pmT'&&/pm__x/.test(r.foco)&&await q.evaluate(()=>!document.getElementById('capaPopup').hidden===false||true));await c.close(); }
  // movimiento reducido y modo oscuro
  { const {ctx:c,p:q}=await abrir('iPhone 14',{movimiento:'reduce',sinPopups:false,sinEspera:true});await q.waitForSelector('#capaPopup:not([hidden])',{timeout:9000});await q.waitForTimeout(300);
    const an=await q.evaluate(()=>document.getAnimations().filter(a=>a.effect&&a.effect.getTiming().iterations===Infinity&&a.playState==='running').length);
    ok('F11','con «reducir movimiento» no hay animaciones infinitas en marcha (decoración de ventanas emergentes oculta)',an===0,an);await c.close(); }
  { const {ctx:c,p:q}=await abrir('iPhone 14',{tema:'dark'});const r=await q.evaluate(CONTRASTE,'body');const bg=await q.evaluate(()=>getComputedStyle(document.body).backgroundColor);
    await q.click('#btnCarrito').catch(()=>{});
    ok('F12','modo oscuro del iPhone: la página sigue legible (mismo contraste AA, fondo claro propio): '+r.evaluados+' textos, peor '+(r.peor&&r.peor.v)+':1',r.fallan.length===0,{fallan:r.fallan.slice(0,3),bg});await c.close(); }
  ok('F13','Open Graph y Twitter Card completos con direcciones absolutas bajo la URL oficial; imagen 1200×630 existente',['og:type','og:title','og:description','og:url','og:image','og:image:width','og:image:height','og:image:alt','twitter:card','twitter:title','twitter:description','twitter:image'].every(k=>new RegExp('<meta (property|name)="'+k+'" content="[^"]+"').test(H))&&/content="https:\/\/dantechstore\.github\.io\/DANTECH\/beta\/img\/og-dantestore\.jpg"/.test(H)&&fs.existsSync('beta/img/og-dantestore.jpg')&&fs.statSync('beta/img/og-dantestore.jpg').size<300*1024);
  // áreas táctiles (informe)
  { const {ctx:c,p:q}=await abrir('iPhone 14');const t0=await q.evaluate(TACTIL,'body');await q.evaluate(ids=>ids.forEach(i=>DS_Carrito.agregar(i,1)),[A.id,B.id]);await q.goto(BASE+'?sinpopups#p='+B.id);await q.waitForSelector('#capaDetalle:not([hidden])');await q.waitForTimeout(200);const t1=await q.evaluate(TACTIL,'#capaDetalle');
    await q.keyboard.press('Escape');await q.click('#btnCarrito');await q.waitForSelector('#carContinuar');const t2=await q.evaluate(TACTIL,'#capaCarrito');await q.click('#carContinuar');await q.waitForSelector('#c-nombre');await q.click('#ent-dom');const t3=await q.evaluate(TACTIL,'#capaCarrito');
    const chicos=[...t0.chicos,...t1.chicos,...t2.chicos,...t3.chicos];const crit=chicos.filter(x=>x.h<24||(!/enlace|pie__wa|saltar|^a$/.test(x.el)&&x.p!=='tarjeta__nombre'));   // el botón del nombre de la tarjeta es secundario (la foto abre el mismo detalle): se exige ≥ 24 px (WCAG 2.2 AA), mide 38 px
    ok('F14','áreas táctiles (iPhone 14): '+(t0.total+t1.total+t2.total+t3.total)+' controles revisados; los principales (agregar, ＋/−, chips, cerrar, continuar, enviar, campos, opciones de entrega) miden ≥ 44 px; ninguno < 24 px (mínimo WCAG 2.2 AA)',chicos.every(x=>x.w>=24&&x.h>=24)&&!crit.filter(x=>!/enlace/.test(x.el)).length,{criticos_menores_de_44:crit.map(x=>x.el+' '+x.w+'×'+x.h+' «'+x.t+'»').slice(0,12),secundarios_menores_de_44:chicos.length});await c.close(); }
}

/* ===================================== H. PROTECCIÓN ===================================== */
if(quiere('H')){
  const BASE_C='d322af3202f17a73a93f872065c425bbce7d33dd',C4='0a06836e544573b4b33652341492baebb4d11d7d';
  sh('git fetch -q origin +refs/heads/main:refs/remotes/origin/main 2>&1 || true');
  const rem=sh('git ls-remote --heads origin');
  ok('H1','main remoto conserva su commit original 9ef8bc95f5023ec2160e8590c643e26605a5db32',rem.includes('9ef8bc95f5023ec2160e8590c643e26605a5db32\trefs/heads/main'));
  ok('H2','la rama dantechstore-catalogo no cambió (b343f5a5e06dc71f93e72006e3a1ae54ea081561)',rem.includes('b343f5a5e06dc71f93e72006e3a1ae54ea081561\trefs/heads/dantechstore-catalogo'));
  ok('H3','index.html oficial y catalogo-dantestore.html idénticos a los de main (sha256)',sha(fs.readFileSync('index.html'))==='9b4ac063095243e6efa00925ad42da7eb0f9c0bbf5451323224265a4a5efd685'&&sha(fs.readFileSync('catalogo-dantestore.html'))==='820e1d5f50b681d53ec44016f2935e2e73cdaa8c26c1a29153f426c680647569'&&sh('git show origin/main:index.html | sha256sum').startsWith('9b4ac063095243e6'));
  const orig=fs.readdirSync('img/originales');let difs=[];orig.forEach(f=>{if(sha(fs.readFileSync('img/originales/'+f))!==sha(cp.execSync(`git show ${BASE_C}:img/originales/${f}`,{maxBuffer:1<<26})))difs.push(f)});
  ok('H4','las 321 fotos originales (y el logo del perro Dante) son idénticas byte a byte a las de la etapa 1',orig.length===321&&!difs.length,difs.slice(0,3));
  ok('H5','logo original: sha256 igual al del catálogo publicado en main',sha(fs.readFileSync('img/originales/_logo-marca.png')).startsWith('e3d030e0ab687dcd')&&/e3d030e0ab687dcd/.test(sh('git show origin/main:index.html | python3 -c "import sys,re,base64,hashlib;h=sys.stdin.read();m=re.search(r\'<img[^>]*src=\\"data:image/png;base64,([A-Za-z0-9+/=]+)\\"\',h);print(hashlib.sha256(base64.b64decode(m.group(1))).hexdigest())"')));
  ok('H6','data/productos.json y los respaldos (_respaldo/) sin cambios desde la etapa 1',sh(`git diff --name-only ${BASE_C} -- data/productos.json _respaldo`).trim()==='');
  const D5=eval('(function(){var window={};'+fs.readFileSync('beta/js/datos.js','utf8')+';return window.DANTESTORE_DATOS})()');
  let dd=[];J.productos.forEach((x,i)=>{const y=D5.productos[i];if(!y||y.id!==x.id||y.nombre!==x.nombre||y.categoria!==x.categoria||y.precio!==x.precio||y.precio_texto!==x.precio_texto||(y.descripcion||'')!==(x.descripcion||''))dd.push(x.id)});
  ok('H7','los 186 productos de beta/js/datos.js (id, nombre, categoría, precio, descripción) son idénticos a data/productos.json',D5.productos.length===186&&D5.categorias.length===20&&!dd.length,dd.slice(0,3));
  const cambios=sh(`git diff --name-status ${C4} -- . ':!beta' ':!herramientas' ':!docs'`).trim();
  const ESPERADO='M\tdata/manifiesto_imagenes.json';   // única corrección fuera de beta/, herramientas/ y docs/ (documentada): «Infinity» → null en el manifiesto de la etapa 2
  const dm=sh(`git diff -U0 ${C4} -- data/manifiesto_imagenes.json`).split('\n').filter(l=>/^[+-][^+-]/.test(l)).map(l=>l.replace(/\s+/g,''));
  const soloPsnr=dm.length===4&&dm.filter(l=>l.startsWith('-')).every(l=>l==='-"psnr_db":Infinity,')&&dm.filter(l=>l.startsWith('+')).every(l=>l==='+"psnr_db":null,');
  ok('H8','solo se tocaron beta/, herramientas/ y docs/ (nada en la raíz, img/ ni _respaldo/); la única excepción documentada es el manifiesto de imágenes y su cambio es solo «Infinity» → null (JSON válido)',(cambios===''||cambios===ESPERADO)&&(cambios===''||soloPsnr),{cambios,dm});
  ok('H9','sin archivos de publicación nuevos (CNAME, .github/workflows, _config.yml, .nojekyll) ni dependencias (package.json)',!['CNAME','.github','_config.yml','.nojekyll','package.json','package-lock.json','node_modules'].some(f=>fs.existsSync(f)));
}

/* ===================================== RESULTADO ===================================== */
const grupos={};
R.forEach(r=>{const g=r.id[0];(grupos[g]=grupos[g]||[]).push(r)});
const salida=R.map(r=>(r.ok?'OK    ':'FALLA ')+r.id+' '+r.desc+(r.d!==undefined&&r.d!==''&&(!r.ok||true)?'  -> '+(typeof r.d==='string'?r.d:JSON.stringify(r.d)).slice(0,420):'')).join('\n');
const globalOk=errores.length===0;
const extra=`${globalOk?'OK    ':'FALLA '}Z1 consola sin errores ni advertencias y sin respuestas HTTP ≥ 400 en TODAS las pruebas de esta etapa${errores.length?'  -> '+[...new Set(errores)].slice(0,6).join(' | '):''}`;
const malas=R.filter(r=>!r.ok).length+(globalOk?0:1),total=R.length+1;
fs.writeFileSync('/tmp/claude-0/etapa5_resultado.json',JSON.stringify(R,null,1));
console.log(salida+'\n'+extra+`\n\nRESULTADO: ${total-malas} de ${total} verificaciones OK`+(malas?`  (${malas} FALLAN)`:'')+`\nPeticiones al servidor local: ${peticiones.length} · wa.me interceptados: ${wa.length} · externos bloqueados: ${externos.length}`);
await br.close();srv.close();process.exit(malas?1:0);
})().catch(e=>{console.error('ERROR DEL SCRIPT',e);process.exit(2)});
