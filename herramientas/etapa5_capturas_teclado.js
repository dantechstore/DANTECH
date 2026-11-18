#!/usr/bin/env node
/* Etapa 5 - Captura de evidencia: teléfono en horizontal con el teclado virtual abierto (EMULADO reduciendo el alto visible; no es un teclado real).
 * Muestra el campo «Indicaciones» enfocado y la hoja del carrito desplazándose completa (alto visible < 260 px). Uso: node herramientas/etapa5_capturas_teclado.js */
const {chromium,devices}=require(process.env.PW||'/home/claude/.npm-global/lib/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=process.cwd(),PORT=8777,BASE=`http://127.0.0.1:${PORT}/DANTECH/beta/`;
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.startsWith('/DANTECH'))u=u.slice(8);let f=path.join(ROOT,u);if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;return r.end('no')}r.setHeader('Content-Type',MIME[path.extname(f)]||'x');r.end(d)})});
(async()=>{await new Promise(r=>srv.listen(PORT,r));const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const J=JSON.parse(fs.readFileSync('data/productos.json','utf8'));const A=J.productos.find(x=>x.precio&&!x.sin_foto);
fs.mkdirSync('docs/capturas-etapa5',{recursive:true});
for(const [nombre,w,h,kb] of [['iPhone 14',844,390,220],['iPhone SE (3rd gen)',667,375,225]]){
  const o={...devices[nombre]};o.viewport={width:w,height:h};o.screen={width:w,height:h};const c=await br.newContext(o);const p=await c.newPage();
  await p.goto(BASE+'?sinpopups');await p.waitForSelector('#catalogo[aria-busy="false"]');
  await p.evaluate(id=>DS_Carrito.agregar(id,2),A.id);await p.click('#btnCarrito');await p.waitForSelector('#carContinuar');await p.click('#carContinuar');await p.waitForSelector('#c-nombre');
  await p.click('#ent-dom');await p.fill('#c-nombre','Ana Pérez');await p.fill('#c-direccion','Calle 100 # 15-20');
  await p.setViewportSize({width:w,height:h-kb});await p.evaluate(()=>document.getElementById('c-indicaciones').focus());await p.waitForTimeout(300);
  const f=nombre.replace(/[^\w]+/g,'-');await p.screenshot({path:`docs/capturas-etapa5/teclado-horizontal_${f}.jpg`,type:'jpeg',quality:80});
  const m=await p.evaluate(()=>{const i=document.getElementById('c-indicaciones').getBoundingClientRect();return{vh:innerHeight,campoTop:Math.round(i.top),campoBottom:Math.round(i.bottom)}});console.log(nombre,JSON.stringify(m));await c.close()}
await br.close();srv.close()})();
