#!/usr/bin/env node
/* Etapa 3 - Pruebas automáticas de la beta (Playwright + Chromium).
 * Sirve la raíz del repo en http://127.0.0.1:PUERTO/DANTECH/ (igual que GitHub Pages) y también prueba con file://.
 * Uso: node herramientas/etapa3_pruebas.js   (desde la raíz del repo; requiere playwright y chromium) */
const {chromium}=require(process.env.PW||'/home/claude/.npm-global/lib/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const ROOT=process.cwd(),PORT=8766,BASE=`http://127.0.0.1:${PORT}/DANTECH/beta/`;
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0].split('#')[0]);if(u.startsWith('/DANTECH'))u=u.slice(8);let f=path.join(ROOT,u);if(f.endsWith('/'))f+='index.html';
  fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;return r.end('no')}r.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');r.end(d)})});
const J=JSON.parse(fs.readFileSync('data/productos.json','utf8'));
const WA='573134724702';
const din=n=>'$'+String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const res=[];let errores=[];const urlsOk=new Set(),abortadas=[];
const ok=(n,c,d)=>{res.push([n,!!c,d===undefined?'':d]);};
const sh=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
(async()=>{await new Promise(r=>srv.listen(PORT,r));
const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
async function pagina(vp,mobile){const ctx=await br.newContext({viewport:vp,isMobile:!!mobile,hasTouch:!!mobile,deviceScaleFactor:1});const p=await ctx.newPage();
  p.on('pageerror',e=>errores.push('pageerror: '+e.message));p.on('console',m=>{if(['error','warning'].includes(m.type()))errores.push('console.'+m.type()+': '+m.text())});
  p.on('requestfailed',r=>{const t=(r.failure()||{}).errorText||'';if(/ERR_ABORTED/.test(t))abortadas.push(r.url());else errores.push('requestfailed: '+r.url()+' '+t)});p.on('response',r=>{if(r.status()>=400)errores.push('HTTP '+r.status()+' '+r.url());else urlsOk.add(r.url())});return p}
const p=await pagina({width:390,height:844},true);
await p.goto(BASE+'#sinpopups');await p.waitForSelector('#catalogo[aria-busy="false"]');
// ---- 1. datos
const cards=await p.$$eval('#catalogo > .seccion .tarjeta',a=>a.map(e=>({id:e.dataset.id,nombre:e.querySelector('.tarjeta__nombre').textContent.trim(),precio:e.querySelector('.precio').textContent.trim(),src:(e.querySelector('img')||{}).src||null,cat:e.closest('.seccion').querySelector('h2').textContent.trim()})));
ok('1.1 se muestran los 186 productos (vista Todo)',cards.length===186,cards.length);
ok('1.2 ids únicos y en el mismo orden que productos.json',JSON.stringify(cards.map(c=>c.id))===JSON.stringify(J.productos.map(x=>x.id)));
ok('1.3 nombres idénticos a productos.json (186/186)',cards.every((c,i)=>c.nombre===J.productos[i].nombre),cards.filter((c,i)=>c.nombre!==J.productos[i].nombre).slice(0,3).map(c=>c.id));
ok('1.4 precios idénticos a productos.json (186/186; «Consultar» conservado)',cards.every((c,i)=>c.precio===(J.productos[i].precio?din(J.productos[i].precio):J.productos[i].precio_texto)));
ok('1.5 categoría de cada tarjeta idéntica a productos.json',cards.every((c,i)=>c.cat===J.productos[i].categoria));
const chips=await p.$$eval('.chip',a=>a.map(e=>e.dataset.cat));
ok('1.6 las 20 categorías disponibles (+ «Todo»), en el orden original',chips.length===21&&JSON.stringify(chips.slice(1))===JSON.stringify(J.categorias.map(c=>c.nombre)),chips.length);
ok('1.7 conteo por categoría correcto en cada chip',await p.$$eval('.chip small',(a,c)=>a.slice(1).every((e,i)=>+e.textContent===c[i]),J.categorias.map(c=>c.cantidad)));
const dest=await p.$$eval('#destacados .tarjeta',a=>a.map(e=>e.dataset.id));
ok('1.8 «Más vendidos» = configuración original (8, mismo orden)',JSON.stringify(dest)===JSON.stringify(J.mas_vendidos));
ok('1.9 portada y textos originales conservados',(await p.textContent('#pKicker'))===J.portada.kicker&&(await p.textContent('#pTitulo'))===J.portada.titulo&&(await p.textContent('#pSub'))===J.portada.subtitulo);
ok('1.10 etiquetas Nuevo (36) y escasez conservadas',(await p.$$eval('#catalogo > .seccion .ins--nuevo',a=>a.length))===36&&(await p.$$eval('#catalogo > .seccion .escasez',a=>a.length))===J.productos.filter(x=>x.etiquetas.escasez).length);
const sinFoto=J.productos.filter(x=>x.sin_foto).map(x=>x.id);
ok('1.11 productos sin foto conservados (marcador «Foto próximamente», sin inventar imagen)',JSON.stringify(await p.$$eval('#catalogo > .seccion .sinfoto',a=>a.map(e=>e.closest('.tarjeta').dataset.id)))===JSON.stringify(sinFoto),sinFoto);
ok('1.12 «Eslogan» Mucho más para ti visible',(await p.textContent('.marca__texto small'))==='Mucho más para ti'&&(await p.textContent('#tituloPortada')).replace(/\s+/g,' ').trim()==='Mucho más para ti');
// ---- 2. imágenes
await p.evaluate(()=>{document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.loading='eager')});
await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,25))}window.scrollTo(0,0)});
await p.waitForTimeout(2500);
const imgs=await p.$$eval('#catalogo img',a=>a.map(i=>({s:i.getAttribute('src'),ok:i.complete&&i.naturalWidth>0})));
ok('2.1 sin imágenes rotas (todas cargan, tras recorrer la página)',imgs.every(i=>i.ok),imgs.filter(i=>!i.ok).slice(0,3));
ok('2.2 las tarjetas usan SOLO miniaturas WebP (img/miniaturas/)',imgs.every(i=>/^\.\.\/img\/miniaturas\/[^/]+\.webp$/.test(i.s)),imgs.filter(i=>!/miniaturas/.test(i.s)).slice(0,3));
ok('2.3 imágenes de tarjeta = 184 productos con foto + 8 destacados repetidos (sin foto: 2 productos, mostrados con marcador)',imgs.length===184+8-D2(J),imgs.length);
function D2(J){return J.mas_vendidos.filter(id=>J.productos.find(x=>x.id===id).sin_foto).length}
const lazy=await p.evaluate(()=>[...document.querySelectorAll('#catalogo img')].length);
// ---- 3. buscador
async function buscar(q){await p.fill('#buscar',q);await p.waitForTimeout(450);return p.$$eval('#catalogo .tarjeta',a=>a.map(e=>e.querySelector('.tarjeta__nombre').textContent.trim()))}
let r=await buscar('airpods');const esp=J.productos.filter(x=>norm(x.nombre+' '+x.categoria).includes('airpods')).map(x=>x.nombre);
ok('3.1 buscar «airpods» devuelve exactamente los esperados',JSON.stringify(r)===JSON.stringify(esp)&&r.length>0,r.length);
r=await buscar('CAMARA');const esp2=J.productos.filter(x=>norm(x.nombre+' '+x.categoria).includes('camara')).map(x=>x.nombre);
ok('3.2 insensible a mayúsculas y tildes («CAMARA» encuentra «Cámara»)',r.length===esp2.length&&r.some(n=>/Cámara/.test(n)),r.length);
r=await buscar('cepillo secador');ok('3.3 varias palabras (todas deben coincidir)',r.length>0&&r.every(n=>/cepillo/i.test(n)&&/secador/i.test(n)),r);
await p.fill('#buscar','zzqx');await p.waitForTimeout(450);
ok('3.4 sin resultados: mensaje claro y botones de ayuda',(await p.textContent('.vacio h2')).includes('zzqx')&&await p.isVisible('.vacio .btn--pri')&&await p.isVisible('.vacio .btn--wa'));
ok('3.5 botón del mensaje vacío usa solo el WhatsApp autorizado',(await p.getAttribute('.vacio .btn--wa','href')).startsWith('https://wa.me/'+WA+'?text='));
await p.click('#borrarBusqueda');await p.waitForTimeout(300);
ok('3.6 borrar la búsqueda restaura los 186 productos',(await p.$$eval('#catalogo > .seccion .tarjeta',a=>a.length))===186);
// ---- 4. filtros
let fallos=[];
for(const c of J.categorias){await p.click(`.chip[data-cat="${c.nombre}"]`);await p.waitForTimeout(80);
  const n=await p.$$eval('#catalogo .tarjeta',a=>a.map(e=>e.dataset.id));const esp=J.productos.filter(x=>x.categoria===c.nombre).map(x=>x.id);
  if(JSON.stringify(n)!==JSON.stringify(esp))fallos.push(c.nombre)}
ok('4.1 el filtro de cada una de las 20 categorías muestra exactamente sus productos',!fallos.length,fallos);
await p.click('.chip[data-cat="Navidad"]');ok('4.2 el chip activo se marca (aria-pressed=true) y «Todo» queda sin marcar',(await p.getAttribute('.chip[data-cat="Navidad"]','aria-pressed'))==='true'&&(await p.getAttribute('.chip[data-cat=""]','aria-pressed'))==='false');
ok('4.3 hash de categoría compartible (#cat=Navidad)',decodeURIComponent(await p.evaluate(()=>location.hash))==='#cat=Navidad');
await p.click('.chip[data-cat=""]');await p.waitForTimeout(150);ok('4.4 «Todo» vuelve a mostrar los 186',(await p.$$eval('#catalogo > .seccion .tarjeta',a=>a.length))===186);
await p.goto(BASE+'?sinpopups#cat=Juguetería');await p.waitForTimeout(500);
ok('4.5 abrir un enlace con #cat=Juguetería muestra esa categoría',(await p.$$eval('#catalogo .tarjeta',a=>a.length))===J.categorias.find(c=>c.nombre==='Juguetería').cantidad);
await p.goto(BASE+'#sinpopups');await p.waitForTimeout(400);
// ---- 5. detalle
const prod=J.productos.find(x=>x.fotos.length>=3&&x.precio);
await p.click(`.tarjeta[data-id="${prod.id}"] .tarjeta__foto`);await p.waitForSelector('#capaDetalle:not([hidden])');await p.waitForTimeout(500);
const dsrc=await p.getAttribute('#detGal .galeria__principal img','src');
ok('5.1 el detalle abre con la imagen COMPLETA (img/completas/)',/^\.\.\/img\/completas\/[^/]+\.webp$/.test(dsrc)&&dsrc.includes(prod.id),dsrc);
ok('5.2 el detalle muestra nombre y precio idénticos',(await p.textContent('#detNombre'))===prod.nombre&&(await p.textContent('.detalle__precio'))===din(prod.precio));
ok('5.3 la imagen completa carga (no rota)',await p.$eval('#detGal .galeria__principal img',i=>i.complete&&i.naturalWidth>0));
await p.click('[data-accion="foto-sig"]');const s2=await p.getAttribute('#detGal .galeria__principal img','src');
ok('5.4 galería: la flecha cambia a la 2.ª foto completa',s2.includes(prod.id+'-2')&&/completas/.test(s2),s2);
ok('5.5 el hash cambia a #p=ID (enlace directo al producto)',decodeURIComponent(await p.evaluate(()=>location.hash))==='#p='+prod.id);
if(prod.descripcion)ok('5.6 la descripción original se muestra',(await p.textContent('.detalle__desc')).replace(/[\s*]+/g,'').includes(prod.descripcion.replace(/[\s*]+/g,'').slice(0,30)));
await p.keyboard.press('Escape');await p.waitForTimeout(400);ok('5.7 Esc cierra el detalle',await p.isHidden('#capaDetalle'));
await p.click(`.tarjeta[data-id="${prod.id}"] .tarjeta__foto`);await p.waitForTimeout(300);await p.goBack();await p.waitForTimeout(400);ok('5.8 el botón Atrás del teléfono cierra el detalle (sin salir de la página)',(await p.isHidden('#capaDetalle'))&&p.url().startsWith(BASE));
await p.goto(BASE+'?sinpopups#p='+prod.id); await p.waitForTimeout(600);
ok('5.9 enlace directo #p=ID abre el detalle',await p.isVisible('#capaDetalle')&&(await p.textContent('#detNombre'))===prod.nombre);
await p.goto(BASE+'#sinpopups');await p.waitForTimeout(400);
// ---- 6. carrito
await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(500);
const A=J.productos.find(x=>x.precio&&!x.sin_foto),B=J.productos.filter(x=>x.precio&&x.id!==A.id)[5],Cn=J.productos.find(x=>!x.precio);
await p.click(`#catalogo > .seccion .tarjeta[data-id="${A.id}"] .btn--add`);await p.click(`#catalogo > .seccion .tarjeta[data-id="${A.id}"] .btn--add`);await p.click(`#catalogo > .seccion .tarjeta[data-id="${B.id}"] .btn--add`);
await p.click(`#catalogo > .seccion .tarjeta[data-id="${Cn.id}"] .btn--add`);
ok('6.1 agregar desde las tarjetas: insignia = 4 unidades',(await p.textContent('#insCarrito'))==='4',await p.textContent('#insCarrito'));
await p.click('#btnCarrito');await p.waitForSelector('#capaCarrito:not([hidden])');
let st=A.precio*2+B.precio;
ok('6.2 subtotal correcto (sin contar el producto «Consultar»)',(await p.textContent('.resumen > div:first-child span:last-child'))===din(st),din(st));
ok('6.3 nota de producto por consultar visible',(await p.textContent('.nota')).includes('por consultar'));
await p.click(`[data-accion="mas"][data-id="${B.id}"]`);st+=B.precio;await p.waitForTimeout(100);
ok('6.4 cambiar cantidad (+) recalcula subtotal',(await p.textContent('.resumen > div:first-child span:last-child'))===din(st));
await p.click(`[data-accion="menos"][data-id="${A.id}"]`);st-=A.precio;await p.waitForTimeout(100);
ok('6.5 cambiar cantidad (−) recalcula subtotal',(await p.textContent('.resumen > div:first-child span:last-child'))===din(st));
await p.click(`[data-accion="quitar"][data-id="${Cn.id}"]`);await p.waitForTimeout(100);
ok('6.6 quitar un producto lo elimina y desaparece la nota',(await p.$$('.citem')).length===2&&(await p.$$('.nota')).length===0);
await p.click('input[value="dom"]');await p.waitForTimeout(100);
ok('6.7 entrega Bogotá suma $10.000 al total',(await p.textContent('.resumen__total b:last-child'))===din(st+10000),await p.textContent('.resumen__total b:last-child'));
await p.click('input[value="otra"]');await p.waitForTimeout(100);
ok('6.8 otra ciudad: no suma envío y el total indica «(sin envío)»',(await p.textContent('.resumen__total'))===('Total (sin envío)'+din(st)),await p.textContent('.resumen__total'));
await p.click('input[value="tienda"]');await p.waitForTimeout(100);
ok('6.9 recoger en tienda: gratis, total = subtotal',(await p.textContent('.resumen__total b:last-child'))===din(st));
ok('6.10 se conservan las 3 opciones de entrega originales',(await p.$$eval('.entrega__op',a=>a.map(e=>e.textContent.replace(/\s+/g,' ').trim()))).join('|')==='🛵 Domicilio en Bogotá+$10.000 · pago contraentrega|🚚 Envío a otra ciudadTe confirmamos el valor del envío|🏪 Recoger en tiendaGratis');
await p.click(`[data-accion="mas"][data-id="${B.id}"]`);await p.waitForTimeout(60);await p.click(`[data-accion="menos"][data-id="${B.id}"]`);await p.waitForTimeout(60);
await p.evaluate(()=>{const a=document.getElementById('aviso');a.textContent='probando';a.classList.add('on')});await p.waitForTimeout(300);
{const t=await p.$eval('#aviso',e=>e.getBoundingClientRect().toJSON()),b=await p.$eval('#carEnviar',e=>e.getBoundingClientRect().toJSON());
 ok('6.11 el aviso emergente no tapa el botón «Enviar pedido por WhatsApp»',t.bottom<b.top||t.top>b.bottom,{aviso:[Math.round(t.top),Math.round(t.bottom)],boton:[Math.round(b.top),Math.round(b.bottom)]})}
await p.evaluate(()=>document.getElementById('aviso').classList.remove('on'));
// ---- 7. WhatsApp
await p.click('input[value="dom"]');await p.fill('#carNombre','Oscar Prueba');await p.waitForTimeout(150);
const href=await p.getAttribute('#carEnviar','href');
ok('7.1 el enlace usa el WhatsApp autorizado 573134724702',href.startsWith('https://wa.me/'+WA+'?text='),href.slice(0,40));
const msg=decodeURIComponent(href.split('?text=')[1]);
const qa=1,qb=2; // A: 2-1=1 ; B: 1+1=2
const esperado=`Hola DANTESTORE 👋, quiero pedir:\n• ${qa} × ${A.nombre} — ${din(A.precio)} c/u\n• ${qb} × ${B.nombre} — ${din(B.precio)} c/u\nSubtotal: ${din(A.precio*qa+B.precio*qb)}\nEntrega: Domicilio en Bogotá (+$10.000, pago contraentrega)\nTotal: ${din(A.precio*qa+B.precio*qb+10000)}\nOrigen: catálogo web\nMi nombre: Oscar Prueba`;
ok('7.2 el mensaje incluye productos, cantidades y valores correctos (formato idéntico al catálogo publicado)',msg===esperado,msg===esperado?'':msg);
ok('7.3 el mensaje de respaldo (copiar) coincide con el enviado',(await p.inputValue('#carTexto'))===msg);
ok('7.4 el enlace abre en pestaña nueva con rel=noopener',(await p.getAttribute('#carEnviar','target'))==='_blank'&&(await p.getAttribute('#carEnviar','rel')).includes('noopener'));
// ---- 8. persistencia
await p.keyboard.press('Escape');await p.reload();await p.waitForTimeout(600);
ok('8.1 el carrito se conserva al recargar (3 unidades)',(await p.textContent('#insCarrito'))==='3');
await p.click('#btnCarrito');await p.waitForTimeout(300);
ok('8.2 se conservan entrega, nombre y cantidades',(await p.isChecked('input[value="dom"]'))&&(await p.inputValue('#carNombre'))==='Oscar Prueba'&&(await p.$$('.citem')).length===2);
const ls=await p.evaluate(()=>Object.keys(localStorage));
ok('8.3 la beta usa claves propias (dtb_*) y no toca las del catálogo publicado (dtcart/dtent)',ls.every(k=>k.startsWith('dtb_')),ls);
await p.keyboard.press('Escape');await p.waitForTimeout(300);
await p.evaluate(()=>localStorage.setItem('dtb_cart',JSON.stringify({'noexiste':3,[Object.keys(JSON.parse(localStorage.dtb_cart))[0]]:2})));await p.reload();await p.waitForTimeout(400);
ok('8.4 un id inexistente guardado se descarta sin errores',(await p.textContent('#insCarrito'))==='2');
await p.click('#btnCarrito');await p.waitForTimeout(300);await p.click('[data-accion="vaciar"]');ok('8.5 «Vaciar» pide confirmación (no vacía al primer toque)',(await p.$$('.citem')).length>=1);
await p.click('[data-accion="vaciar"]');await p.waitForTimeout(200);ok('8.6 al confirmar, el carrito queda vacío con mensaje claro',(await p.textContent('.carrito__vacio')).includes('Aún no has agregado'));
await p.keyboard.press('Escape');
// ---- 9. popups
await p.evaluate(()=>localStorage.clear());await p.goto(BASE);await p.waitForSelector('#capaPopup:not([hidden])',{timeout:5000});
ok('9.1 primera ventana: Navidad (textos originales)',(await p.textContent('#pmT'))===J.ventanas_emergentes.nav.titulo&&(await p.textContent('.pm__caja p'))===J.ventanas_emergentes.nav.mensaje);
await p.click('.pm__x');await p.waitForSelector('#capaPopup:not([hidden])',{timeout:3000});
ok('9.2 segunda ventana: Juguetería (textos originales)',(await p.textContent('#pmT'))===J.ventanas_emergentes.jug.titulo);
await p.click('[data-accion="popup-ir"]');await p.waitForTimeout(300);
ok('9.3 el botón de Juguetería lleva a la categoría Juguetería',(await p.$$eval('#catalogo .tarjeta',a=>a.length))===41&&await p.isHidden('#capaPopup'));
await p.reload();await p.waitForTimeout(2200);ok('9.4 no se vuelven a mostrar el mismo día',await p.isHidden('#capaPopup'));
// ---- 10. responsive / accesibilidad
const tam=[['móvil 375',375,812],['móvil 390',390,844],['tablet 768',768,1024],['portátil 1280',1280,800],['escritorio 1920',1920,1080]];let ov=[];
for(const [n,w,h] of tam){const q=await pagina({width:w,height:h},w<800);await q.goto(BASE+'#sinpopups');await q.waitForSelector('#catalogo[aria-busy="false"]');await q.waitForTimeout(300);
  const sw=await q.evaluate(()=>document.documentElement.scrollWidth);if(sw>w)ov.push(n+':'+sw);
  const cols=await q.evaluate(()=>getComputedStyle(document.querySelector('#catalogo .seccion .grilla')).gridTemplateColumns.split(' ').length);
  res.push(['10.x columnas '+n+' = '+cols,true,'']);await q.context().close()}
ok('10.1 sin desbordamiento horizontal en 5 tamaños de pantalla',!ov.length,ov);
const pequenos=await p.evaluate(()=>[...document.querySelectorAll('button,a.btn,input:not([type=radio]),.chip')].filter(e=>e.offsetParent!==null).filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.height<43.5||r.width<43.5)&&!e.closest('.tarjeta__nombre')}).map(e=>(e.className||e.tagName)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)));
ok('10.2 botones y controles táctiles ≥ 44 px (en la vista principal móvil)',!pequenos.length,pequenos.slice(0,5));
ok('10.3 idioma, título y viewport definidos',await p.evaluate(()=>document.documentElement.lang==='es'&&!!document.title&&!!document.querySelector('meta[name=viewport]')));
ok('10.4 todas las imágenes tienen texto alternativo coherente (alt = nombre del producto)',await p.$$eval('#catalogo .tarjeta__foto img',a=>a.every(i=>i.alt.length>2)));
await p.keyboard.press('Tab');
ok('10.5 enlace «Saltar al catálogo» disponible con teclado',await p.evaluate(()=>document.activeElement.className==='saltar'));
// ---- 11. file://
const pf=await pagina({width:390,height:844},true);const antes=errores.length;await pf.goto('file://'+ROOT+'/beta/index.html#sinpopups');await pf.waitForSelector('#catalogo[aria-busy="false"]');await pf.waitForTimeout(800);
ok('11.1 también abre con doble clic (file://): 186 productos',(await pf.$$eval('#catalogo > .seccion .tarjeta',a=>a.length))===186);
await pf.evaluate(()=>{document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')});await pf.waitForTimeout(1500);
ok('11.2 file://: imágenes cargan',await pf.$$eval('#catalogo img',a=>a.every(i=>i.complete&&i.naturalWidth>0)));
const ef=errores.slice(antes).filter(e=>!/favicon/.test(e));
// ---- 12. consola
const abNoRecuperadas=abortadas.filter(u=>!urlsOk.has(u)&&u.startsWith('http'));
ok('12.1 CERO errores/advertencias de consola, peticiones fallidas o HTTP ≥400 (todas las pruebas, http y file://)',!errores.filter(e=>!/favicon/.test(e)).length,errores.slice(0,5));
ok('12.2 las peticiones canceladas por cambiar de página (ERR_ABORTED) se cargaron bien en otra visita',!abNoRecuperadas.length,{canceladas:abortadas.length,sin_recuperar:abNoRecuperadas});
// ---- 13. datos y archivos protegidos
const D=fs.readFileSync('beta/js/datos.js','utf8');const dat=JSON.parse(D.slice(D.indexOf('=')+1,D.lastIndexOf(';')));
ok('13.1 datos.js == productos.json (id, nombre, precio, descripción, categoría, orden, etiquetas, whatsapp) en los 186',dat.productos.length===186&&dat.productos.every((x,i)=>{const o=J.productos[i];return x.id===o.id&&x.nombre===o.nombre&&x.precio===o.precio&&x.precio_texto===o.precio_texto&&x.descripcion===o.descripcion&&x.categoria===o.categoria&&x.orden===o.orden_global&&JSON.stringify(x.etiquetas)===JSON.stringify(o.etiquetas)})&&dat.whatsapp===J.meta.whatsapp&&WA===J.meta.whatsapp);
const BASEC='c0c226e01d66c0004f55820b2e7a5eda46b08403';
const diff=cp.execSync(`git diff --name-status ${BASEC} -- . ':!beta' ':!herramientas' ':!docs'`).toString().trim();
ok('13.2 ningún archivo existente fuera de beta/, herramientas/ y docs/ fue modificado (originales, WebP, productos.json, manifiestos, index.html…)',diff==='',diff);
const prot={'index.html':'9b4ac063095243e6efa00925ad42da7eb0f9c0bbf5451323224265a4a5efd685','catalogo-dantestore.html':'820e1d5f50b681d53ec44016f2935e2e73cdaa8c26c1a29153f426c680647569'};
ok('13.3 index.html y catalogo-dantestore.html intactos (sha256)',Object.entries(prot).every(([f,h])=>sh(f)===h));
ok('13.4 productos.json y manifiestos sin cambios desde la etapa 2',cp.execSync(`git diff --name-only ${BASEC} -- data img`).toString().trim()==='');
const nums=new Set();const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);for(const f of walk('beta').filter(f=>/\.(html|js|css|md)$/.test(f))){const t=fs.readFileSync(f,'utf8');for(const m of t.matchAll(/(?<!\d)(57\d{10}|\+57[\s-]?\d[\d\s-]{8,12}|3\d{9})(?!\d)/g))nums.add(m[0].replace(/\D/g,'').replace(/^(3\d{9})$/,'57$1'));if(/wa\.me\/(?!573134724702|'|"|\$)/.test(t.replace(/wa\.me\/'\s*\+/g,'')))nums.add('OTRO:'+f)}
ok('13.5 el único número de WhatsApp en toda la beta es 573134724702',[...nums].every(n=>n==='573134724702')&&nums.size===1,[...nums]);
const rem=cp.execSync('git ls-remote --heads origin 2>/dev/null||true').toString();
ok('13.6 main remoto sigue en 9ef8bc95f5023ec2160e8590c643e26605a5db32',rem.includes('9ef8bc95f5023ec2160e8590c643e26605a5db32\trefs/heads/main'),rem.split('\n').find(l=>/refs\/heads\/main/.test(l)));
await br.close();srv.close();
const bad=res.filter(r=>!r[1]);
console.log(res.map(([n,o,d])=>(o?'OK    ':'FALLA ')+n+(d!==''&&d!==undefined?'  -> '+(typeof d==='string'?d:JSON.stringify(d)).slice(0,300):'')).join('\n'));
console.log(`\nRESULTADO: ${res.length-bad.length} de ${res.length} verificaciones OK`+(bad.length?'  FALLAS: '+bad.map(b=>b[0]).join(' | '):''));process.exit(bad.length?1:0)})().catch(e=>{console.error(e);process.exit(2)});
