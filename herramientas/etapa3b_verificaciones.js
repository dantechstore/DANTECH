#!/usr/bin/env node
/* Etapa 3b - Evidencias: (1) identidad de marca/logo, (2) servidor local para iPhone, (3) Open Graph. Uso: node herramientas/etapa3b_verificaciones.js (desde la raíz) */
const {chromium,devices}=require(process.env.PW||'/home/claude/.npm-global/lib/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const ROOT=process.cwd(),PORT=8767,BASE=`http://127.0.0.1:${PORT}/DANTECH/beta/`;
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.startsWith('/DANTECH'))u=u.slice(8);let f=path.join(ROOT,u);if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;return r.end('no')}r.setHeader('Content-Type',MIME[path.extname(f)]||'x');r.end(d)})});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');const res=[];const ok=(n,c,d)=>res.push([n,!!c,d===undefined?'':d]);
const logoDe=h=>{const m=h.match(/<div class="hd">[\s\S]*?<img[^>]*src="data:image\/png;base64,([A-Za-z0-9+\/=]+)"/)||h.match(/src="data:image\/png;base64,([A-Za-z0-9+\/=]+)"/);return m?Buffer.from(m[1],'base64'):null};
(async()=>{await new Promise(r=>srv.listen(PORT,r));
// ===== 1. LOGO =====
const orig=fs.readFileSync('img/originales/_logo-marca.png');const hO=sha(orig);
const pub=logoDe(cp.execSync('git show origin/main:index.html',{maxBuffer:1<<30}).toString('utf8'));
const vie=logoDe(fs.readFileSync('catalogo-dantestore.html','utf8'));
ok('1.1 el logo del catálogo PUBLICADO (index.html de main) es byte a byte igual a img/originales/_logo-marca.png',pub&&sha(pub)===hO,sha(pub||Buffer.alloc(0)).slice(0,16));
ok('1.2 el logo de catalogo-dantestore.html (versión anterior) también es idéntico (misma identidad en todas las versiones)',vie&&sha(vie)===hO);
const py=`from PIL import Image,ImageChops
o=Image.open('img/originales/_logo-marca.png').convert('RGBA')
for t in ('miniaturas','completas'):
    w=Image.open('img/%s/_logo-marca.webp'%t).convert('RGBA');print(t,w.size==o.size and ImageChops.difference(o,w).getbbox() is None)`;
const pr=cp.execSync("python3 -c \""+py.replace(/"/g,'\\"')+"\"").toString().trim().split('\n');
ok('1.3 el WebP que usa la beta (img/miniaturas/_logo-marca.webp) es idéntico píxel a píxel al PNG original (200×200, sin pérdida)',pr[0]==='miniaturas True',pr);
ok('1.4 la versión completa del logo también es idéntica píxel a píxel',pr[1]==='completas True');
ok('1.5 el logo original no se modificó (sha256 = el de la etapa 1 en productos.json)',JSON.parse(fs.readFileSync('data/productos.json','utf8')).logo.sha256===hO);
ok('1.6 git: img/originales sin cambios',cp.execSync('git status --porcelain img/originales').toString().trim()===''&&cp.execSync('git diff --name-only d322af3 -- img/originales').toString().trim()==='');
const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const iphone={...devices['iPhone 14'],deviceScaleFactor:2};
async function revisar(nombre,cfg,shot){const c=await br.newContext(cfg);const p=await c.newPage();const err=[];p.on('pageerror',e=>err.push(e.message));p.on('console',m=>{if(['error','warning'].includes(m.type()))err.push(m.text())});
  await p.goto(BASE+'#sinpopups');await p.waitForSelector('#catalogo[aria-busy="false"]');await p.waitForTimeout(500);
  const L=await p.$eval('.marca__logo',e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{x:r.x,y:r.y,w:r.width,h:r.height,nat:e.naturalWidth,natH:e.naturalHeight,src:e.getAttribute('src'),filter:s.filter,border:s.borderTopWidth,radius:s.borderTopLeftRadius,transform:s.transform,opacity:s.opacity,fit:s.objectFit,vis:s.visibility,clip:s.clipPath,mask:s.maskImage||'none',pad:s.paddingTop,ok:e.complete}});
  ok(`1.7 [${nombre}] el logo del perro se ve en el ENCABEZADO (visible, dentro de la pantalla, cargó bien)`,L.ok&&L.nat===200&&L.natH===200&&L.vis==='visible'&&L.opacity==='1'&&L.y>=0&&L.y<220,{y:Math.round(L.y),nat:L.nat});
  ok(`1.8 [${nombre}] tamaño visible ${Math.round(L.w)}×${Math.round(L.h)} px (≥ 56 px, proporción 1:1, sin deformar)`,L.w>=56&&Math.abs(L.w-L.h)<0.5,[L.w,L.h]);
  ok(`1.9 [${nombre}] sin filtros, marco, recorte, máscara ni transformaciones sobre el logo`,L.filter==='none'&&L.border==='0px'&&L.radius==='0px'&&L.transform==='none'&&L.clip==='none'&&L.mask==='none'&&L.pad==='0px',L);
  ok(`1.10 [${nombre}] usa el archivo del logo original (img/miniaturas/_logo-marca.webp, copia sin pérdida)`,L.src==='../img/miniaturas/_logo-marca.webp',L.src);
  const hb=await p.$eval('.cabecera',e=>{const r=e.getBoundingClientRect();return{x:0,y:r.y,w:innerWidth,h:r.height}});
  await p.screenshot({path:shot,clip:{x:0,y:Math.max(0,hb.y-4),width:hb.w,height:hb.h+8}});
  const fav=await p.$$eval('link[rel=icon],link[rel=apple-touch-icon]',a=>a.map(e=>e.rel+':'+e.getAttribute('href')));
  ok(`1.11 [${nombre}] sin errores de consola`,!err.length,err);await c.close();return fav}
fs.mkdirSync('docs/capturas-beta',{recursive:true});
const fav=await revisar('iPhone 14 (emulado)',iphone,'docs/capturas-beta/15_logo_encabezado_iphone.png');
await revisar('escritorio 1280',{viewport:{width:1280,height:800}},'docs/capturas-beta/16_logo_encabezado_escritorio.png');
ok('1.12 el ícono de pestaña/pantalla de inicio es el mismo logo (favicon WebP + apple-touch-icon PNG original)',fav.join('|')==='icon:../img/miniaturas/_logo-marca.webp|apple-touch-icon:../img/originales/_logo-marca.png',fav);
// ===== 2. servidor local para iPhone =====
const sp=cp.spawn('python3',['herramientas/servir_beta.py','8793'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,1500));
const get=(u,m='GET')=>new Promise(r=>http.request({host:'127.0.0.1',port:8793,path:u,method:m},x=>{x.resume();r([x.statusCode,x.headers['cache-control'],x.headers.location])}).on('error',()=>r([0])).end());
const okRutas=[];for(const u of['/beta/','/beta/js/app.js','/beta/css/estilos.css','/img/miniaturas/_logo-marca.webp','/img/completas/muu167a3kyoe-1.webp','/data/productos.json','/beta/img/og-dantestore.jpg'])okRutas.push([u,(await get(u))[0]]);
ok('2.1 el servidor local sirve la beta, el CSS/JS, fotos, datos e imagen OG (200)',okRutas.every(x=>x[1]===200),okRutas.filter(x=>x[1]!==200));
const bloq=[];for(const u of['/herramientas/servir_beta.py','/_respaldo/2026-11-13_main-9ef8bc9/index.html','/index.html','/docs/ETAPA3_INFORME.md','/.git/config'])bloq.push([u,(await get(u))[0]]);
ok('2.2 NO expone respaldos, herramientas, docs, .git ni el index.html oficial (403)',bloq.every(x=>x[1]===403),bloq);
const rr=await get('/');ok('2.3 la raíz redirige a /beta/ y las respuestas llevan Cache-Control: no-store',rr[0]===302&&rr[2]==='/beta/'&&(await get('/beta/'))[1]==='no-store',rr);
sp.kill();
ok('2.4 existen la guía de prueba y el .bat para Windows',fs.existsSync('docs/PROBAR_EN_IPHONE.md')&&fs.existsSync('herramientas/PROBAR_BETA_EN_IPHONE.bat'));
// ===== 3. Open Graph =====
const H=fs.readFileSync('beta/index.html','utf8');const meta=k=>(H.match(new RegExp('<meta (?:property|name)="'+k+'" content="([^"]*)"'))||[])[1];
const need=['og:type','og:site_name','og:locale','og:title','og:description','og:url','og:image','og:image:secure_url','og:image:type','og:image:width','og:image:height','og:image:alt','twitter:card','twitter:title','twitter:description','twitter:image'];
ok('3.1 etiquetas Open Graph y Twitter Card completas ('+need.length+')',need.every(k=>meta(k)),need.filter(k=>!meta(k)));
const ABS='https://dantechstore.github.io/DANTECH/';
ok('3.2 og:url y og:image son direcciones https ABSOLUTAS bajo la URL oficial',meta('og:url').startsWith(ABS)&&meta('og:image').startsWith(ABS)&&meta('twitter:image')===meta('og:image'),[meta('og:url'),meta('og:image')]);
const rel=meta('og:image').replace(ABS,'');ok('3.3 la imagen de og:image existe en el repositorio en esa misma ruta (beta/img/og-dantestore.jpg)',fs.existsSync(rel),rel);
const dims=cp.execSync(`python3 -c "from PIL import Image;i=Image.open('${rel}');print(i.size[0],i.size[1],i.format)"`).toString().trim();
ok('3.4 la imagen mide 1200×630 (formato recomendado) y es JPEG',dims==='1200 630 JPEG'&&meta('og:image:width')==='1200'&&meta('og:image:height')==='630',dims);
const kb=fs.statSync(rel).size/1024;ok('3.5 pesa menos de 300 KB (WhatsApp exige < 600 KB; aquí '+Math.round(kb)+' KB)',kb<300);
const T=fs.readFileSync('herramientas/og_plantilla.html','utf8');const imgs=[...T.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m=>m[1]);
ok('3.6 la imagen se genera SOLO con el logo original + textos de marca: la plantilla contiene una única imagen y es el logo (sin fotos de productos)',imgs.length===1&&/_logo-marca\.png$/.test(imgs[0]),imgs);
ok('3.7 la descripción cabe en el límite recomendado (≤ 160 caracteres)',meta('og:description').length<=160,meta('og:description').length);
ok('3.8 la beta mantiene noindex (no se indexa en Google)',/<meta name="robots" content="noindex, nofollow">/.test(H));
// ===== 4. protección =====
const BASEC='c0c226e01d66c0004f55820b2e7a5eda46b08403';
const EXC=require('./excepcion_manifiesto.js')(BASEC);   // única excepción documentada (etapa 5): manifiesto «Infinity» → null
const d=cp.execSync(`git diff --name-status ${BASEC} -- . ':!beta' ':!herramientas' ':!docs'`).toString().split('\n').filter(l=>l.trim()&&!(EXC&&l==='M\tdata/manifiesto_imagenes.json')).join('\n').trim();
ok('4.1 ningún archivo fuera de beta/, herramientas/ y docs/ fue modificado',d==='',d);
ok('4.2 index.html y catalogo-dantestore.html intactos (sha256)',sha(fs.readFileSync('index.html'))==='9b4ac063095243e6efa00925ad42da7eb0f9c0bbf5451323224265a4a5efd685'&&sha(fs.readFileSync('catalogo-dantestore.html'))==='820e1d5f50b681d53ec44016f2935e2e73cdaa8c26c1a29153f426c680647569');
ok('4.3 no hay archivos de configuración de publicación (CNAME, .github/workflows, _config.yml) agregados',!['CNAME','.github','_config.yml','.nojekyll'].some(f=>fs.existsSync(f)));
const rem=cp.execSync('git ls-remote --heads origin').toString();
ok('4.4 main remoto sigue en 9ef8bc95f5023ec2160e8590c643e26605a5db32',rem.includes('9ef8bc95f5023ec2160e8590c643e26605a5db32\trefs/heads/main'));
await br.close();srv.close();const bad=res.filter(r=>!r[1]);
console.log(res.map(([n,o,d])=>(o?'OK    ':'FALLA ')+n+(d!==''&&d!==undefined?'  -> '+(typeof d==='string'?d:JSON.stringify(d)).slice(0,260):'')).join('\n'));
console.log(`\nRESULTADO: ${res.length-bad.length} de ${res.length} verificaciones OK`+(bad.length?'  FALLAS: '+bad.map(b=>b[0]).join(' | '):''));process.exit(bad.length?1:0)})().catch(e=>{console.error(e);process.exit(2)});
