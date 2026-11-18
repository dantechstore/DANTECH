#!/usr/bin/env node
/* Etapa 4 - Pruebas automáticas del carrito, los datos del comprador, la entrega y el pedido por WhatsApp (Playwright + Chromium).
 * Sirve la raíz del repo en http://127.0.0.1:PUERTO/DANTECH/ (igual que GitHub Pages). No usa Internet: las llamadas a wa.me se interceptan y se registran.
 * Genera además las capturas (docs/capturas-etapa4/) y los ejemplos reales del mensaje (docs/EJEMPLOS_MENSAJE_WHATSAPP.md).
 * Uso: node herramientas/etapa4_pruebas.js   (desde la raíz del repo) */
const {chromium}=require(process.env.PW||'/home/claude/.npm-global/lib/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const ROOT=process.cwd(),PORT=8767,BASE=`http://127.0.0.1:${PORT}/DANTECH/beta/`;
const BASE_COMMIT='69b8e4ce9e660bf0f24c773c714cb509222c59ca';           // commit de la etapa 3b (punto de partida de la etapa 4)
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0].split('#')[0]);if(u.startsWith('/DANTECH'))u=u.slice(8);let f=path.join(ROOT,u);if(f.endsWith('/'))f+='index.html';
  fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;return r.end('no')}r.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');r.end(d)})});
const J=JSON.parse(fs.readFileSync('data/productos.json','utf8'));
const WA='573134724702';
const din=n=>'$'+String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const res=[];let errores=[];const wa=[];                         // wa: solicitudes a wa.me interceptadas
const ok=(n,c,d)=>{res.push([n,!!c,d===undefined?'':d])};
const CAP='docs/capturas-etapa4/';fs.mkdirSync(CAP,{recursive:true});
const ejemplos=[];
(async()=>{await new Promise(r=>srv.listen(PORT,r));
const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
async function contexto(vp,mobile){const ctx=await br.newContext({viewport:vp,isMobile:!!mobile,hasTouch:!!mobile,deviceScaleFactor:mobile?2:1});
  await ctx.route(/\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//,r=>{wa.push(r.request().url());r.abort()});return ctx}
async function pagina(ctx){const p=await ctx.newPage();
  p.on('pageerror',e=>errores.push('pageerror: '+e.message));p.on('console',m=>{if(['error','warning'].includes(m.type())&&!/wa\.me|whatsapp|ERR_FAILED|ERR_ABORTED/.test(m.text()))errores.push('console.'+m.type()+': '+m.text())});
  p.on('response',r=>{if(r.status()>=400)errores.push('http '+r.status()+' '+r.url())});return p}
const cargar=async(p,hash='#sinpopups')=>{await p.goto(BASE+hash);await p.waitForSelector('#catalogo[aria-busy="false"]')};
const prod=J.productos,conPrecio=prod.filter(x=>x.precio&&!x.sin_foto),A=conPrecio[0],B=conPrecio[3],C2=conPrecio[7],D2=conPrecio[11],Cn=prod.find(x=>!x.precio);
const add=(p,id,n=1)=>p.evaluate(([i,k])=>{let r;for(let j=0;j<k;j++)r=window.DS_Carrito.agregar(i,1);return r},[id,n]);
const api=(p,fn,...a)=>p.evaluate(([f,args])=>{const K=window.DS_Carrito;return K[f](...args)},[fn,a]);
const abrir=async p=>{if(!(await p.isVisible('#capaCarrito')))await p.click('#btnCarrito');await p.waitForSelector('#capaCarrito:not([hidden]) .carrito__pie');await p.waitForTimeout(80)};
const txt=async(p,s)=>((await p.$eval(s,e=>e.innerText))||'').replace(/\s+/g,' ').trim();
const visibleEnPantalla=async(p,s)=>p.$eval(s,e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return cs.visibility!=='hidden'&&r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1}).catch(()=>false);
const ctx=await contexto({width:390,height:844},true);const p=await pagina(ctx);
await cargar(p);

// ===== A. CARRITO =====
await p.evaluate(()=>{localStorage.clear();sessionStorage.clear()});await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');
for(const x of [A,B,C2])await p.click(`#catalogo > .seccion .tarjeta[data-id="${x.id}"] .btn--add`);
ok('A1 agregar varios productos distintos desde las tarjetas: 3 unidades, insignia visible',(await txt(p,'#insCarrito'))==='3'&&await p.isVisible('#insCarrito'),await txt(p,'#insCarrito'));
await p.click(`#catalogo > .seccion .tarjeta[data-id="${A.id}"] .btn--add`);await p.click(`#catalogo > .seccion .tarjeta[data-id="${A.id}"] .btn--add`);
ok('A2 agregar varias unidades del mismo producto: cantidad 3 de ese producto y 5 en total',(await api(p,'cantidad',A.id))===3&&(await txt(p,'#insCarrito'))==='5');
await p.screenshot({path:CAP+'01_catalogo_con_barra_de_carrito.png'});
await abrir(p);
ok('A3 el carrito muestra unidades totales y productos diferentes',(await txt(p,'.carrito__conteo'))==='5 unidades · 3 productos diferentes',await txt(p,'.carrito__conteo'));
let sub=A.precio*3+B.precio+C2.precio;
ok('A4 subtotal por producto y subtotal general correctos',(await p.$$eval('.citem__sub b',a=>a.map(e=>e.textContent))).join('|')===[A.precio*3,B.precio,C2.precio].map(din).join('|')&&(await txt(p,'.resumen .resumen__total b:last-child'))===din(sub));
await p.click(`#mas-${B.id}`);await p.click(`#mas-${B.id}`);sub+=B.precio*2;
ok('A5 modificar cantidades con «＋» recalcula (subtotal por producto y general)',(await api(p,'cantidad',B.id))===3&&(await txt(p,'.resumen .resumen__total b:last-child'))===din(sub));
await p.click(`#menos-${B.id}`);sub-=B.precio;
ok('A6 modificar cantidades con «−» recalcula',(await api(p,'cantidad',B.id))===2&&(await txt(p,'.resumen .resumen__total b:last-child'))===din(sub));
await p.click(`#menos-${B.id}`);
ok('A7 la cantidad nunca baja de 1: «−» queda desactivado en 1 (no hay cero ni negativos)',(await api(p,'cantidad',B.id))===1&&await p.isDisabled(`#menos-${B.id}`)&&(await api(p,'cambiar',B.id,-1))===false);sub-=B.precio;
await p.screenshot({path:CAP+'02_paso1_carrito.png'});
await p.click(`[data-accion="quitar"][data-id="${C2.id}"]`);sub-=C2.precio;
ok('A8 eliminar un producto individualmente (los demás no cambian)',(await p.$$('.citem')).length===2&&(await api(p,'cantidad',C2.id))===0&&(await txt(p,'.carrito__conteo'))==='4 unidades · 2 productos diferentes'&&(await txt(p,'.resumen .resumen__total b:last-child'))===din(sub));
// vaciar con confirmación
await p.click('[data-accion="vaciar"]');
ok('A9 «Vaciar carrito» pide confirmación y no vacía al primer toque',await p.isVisible('.confirmar')&&(await api(p,'items')).length===2&&(await txt(p,'.confirmar')).includes('¿Vaciar el carrito?'));
await p.screenshot({path:CAP+'03_confirmar_vaciar.png'});
await p.click('#vaciarNo');ok('A10 «Cancelar» conserva el carrito',!(await p.$('.confirmar'))&&(await p.$$('.citem')).length===2);
await p.click('[data-accion="vaciar"]');await p.keyboard.press('Escape');
ok('A11 Esc cancela la confirmación sin cerrar ni vaciar el carrito',!(await p.$('.confirmar'))&&await p.isVisible('#capaCarrito')&&(await p.$$('.citem')).length===2);
// estado que se vaciará: con datos del comprador
await p.click('#carContinuar');await p.fill('#c-nombre','Prueba Vaciar');await p.click('#ent-dom');await p.fill('#c-direccion','Calle 1 # 2-3');
await p.click('[data-accion="paso-1"]');await p.click('[data-accion="vaciar"]');await p.click('#vaciarSi');await p.waitForTimeout(100);
ok('A12 confirmar vacía el carrito y muestra el mensaje de carrito vacío',(await txt(p,'.carrito__vacio')).includes('Aún no has agregado')&&!(await p.isVisible('#insCarrito')));
ok('A13 vaciar también borra los datos del comprador y la entrega',await p.evaluate(()=>sessionStorage.getItem('dtb_comprador')===null&&localStorage.getItem('dtb_ent')===''&&localStorage.getItem('dtb_cart')==='{}'),await p.evaluate(()=>JSON.stringify([sessionStorage.getItem('dtb_comprador'),localStorage.getItem('dtb_ent'),localStorage.getItem('dtb_cart')])));
await p.click('.carrito__vacio .btn--pri');await p.waitForTimeout(100);

// ===== B. PERSISTENCIA Y DATOS LOCALES INVÁLIDOS =====
await p.evaluate(()=>{localStorage.clear();sessionStorage.clear()});await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');
await add(p,A.id,2);await add(p,B.id,1);await api(p,'fijarEntrega','dom');await api(p,'fijarDato','nombre','Ana Pérez');await api(p,'fijarDato','direccion','Calle 100 # 15-20');
await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');
ok('B1 el carrito, la entrega y los datos escritos se conservan al recargar',(await api(p,'cantidad',A.id))===2&&(await api(p,'cantidad',B.id))===1&&(await api(p,'entrega'))==='dom'&&(await api(p,'comprador','nombre'))==='Ana Pérez'&&(await txt(p,'#insCarrito'))==='3');
const casos=[['no es json','esto no es json',0],['arreglo','[1,2,3]',0],['null','null',0],['texto','"hola"',0],['número','42',0],['vacío','',0],
  ['clave constructor','{"constructor":2}',0],['clave __proto__','{"__proto__":{"x":1}}',0],['clave toString','{"toString":3,"hasOwnProperty":1}',0],
  ['cantidad negativa',JSON.stringify({[A.id]:-3}),0],['cantidad cero',JSON.stringify({[A.id]:0}),0],['decimal',JSON.stringify({[A.id]:2.5}),0],['texto no numérico',JSON.stringify({[A.id]:'abc'}),0],['null como cantidad',JSON.stringify({[A.id]:null}),0],['objeto como cantidad',JSON.stringify({[A.id]:{a:1}}),0],
  ['exceso (1000 → 99)',JSON.stringify({[A.id]:1000}),99],['cantidad como texto "3"',JSON.stringify({[A.id]:'3'}),3],['mezcla válida + inválida',JSON.stringify({[A.id]:2,noexiste:5,[B.id]:-1,[C2.id]:1}),3]];
const fallos=[];
for(const [n,v,esp] of casos){await p.evaluate(x=>localStorage.setItem('dtb_cart',x),v);const antes=errores.length;await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');
  let u=await p.evaluate(()=>window.DS_Carrito.totales().unidades);
  if(u!==esp)fallos.push(n+': '+u+' ≠ '+esp);
  if(u>0){await abrir(p);await p.keyboard.press('Escape');await p.waitForTimeout(150)}else{await p.click('#btnCarrito');await p.waitForSelector('#capaCarrito:not([hidden])');await p.keyboard.press('Escape');await p.waitForTimeout(150)}
  if(errores.length>antes)fallos.push(n+': errores de consola '+errores.slice(antes).join(' / '))}
ok('B2 recuperación ante datos locales inválidos ('+casos.length+' variantes: JSON roto, arreglos, claves heredadas, cantidades negativas/cero/decimales/texto/exceso): sin errores y el panel abre',!fallos.length,fallos);
await p.evaluate(x=>localStorage.setItem('dtb_cart',x),JSON.stringify({noexiste:3,'constructor':9,[A.id]:2}));await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');
ok('B3 producto inexistente en el almacenamiento: se descarta y se conserva el válido',(await txt(p,'#insCarrito'))==='2'&&(await api(p,'cantidad','noexiste'))===0);
await p.evaluate(()=>{localStorage.setItem('dtb_ent','constructor')});await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');
ok('B4 entrega guardada inválida («constructor») se descarta',(await api(p,'entrega'))==='');
await p.evaluate(()=>{localStorage.setItem('dtb_ent','xyz');sessionStorage.setItem('dtb_comprador','{{roto')});await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');
ok('B5 entrega desconocida y datos del comprador rotos: no producen errores',(await api(p,'entrega'))===''&&(await api(p,'comprador','nombre'))==='');
// API: cantidades inválidas
const inv=await p.evaluate(id=>{const K=window.DS_Carrito;K.vaciar();const out={};
  for(const [n,q] of [['neg',-5],['cero',0],['decimal',2.5],['texto','abc'],['nan',NaN],['inf',Infinity],['null',null],['obj',{}],['arr',[3]],['bool',true]]){out[n]=K.agregar(id,q).ok}
  out.cantidadTrasInvalidos=K.cantidad(id);out.undef=K.agregar(id).ok;out.q1=K.cantidad(id);
  out.exceso=K.agregar(id,500);out.q2=K.cantidad(id);out.mas=K.cambiar(id,1);out.cambiarNeg=K.cambiar(id,-1000);out.q3=K.cantidad(id);out.cambiarDec=K.cambiar(id,0.5);out.cambiarTexto=K.cambiar(id,'1');
  out.fijar0=K.fijarCantidad(id,0);out.fijar200=K.fijarCantidad(id,200);out.q4=K.cantidad(id);out.fijarTxt=K.fijarCantidad(id,'7');out.q5=K.cantidad(id);
  out.idMalo=[K.agregar('constructor',1).ok,K.agregar('__proto__',1).ok,K.agregar('noexiste',1).ok,K.agregar(null,1).ok,K.agregar(123,1).ok];out.quitarMalo=K.quitar('constructor');return out},A.id);
ok('B6 protección contra cantidades inválidas (negativas, cero, decimales, texto, NaN, Infinity, null, objetos): se rechazan y el carrito no cambia',Object.entries(inv).filter(([k])=>['neg','cero','decimal','texto','nan','inf','null','obj','arr','bool'].includes(k)).every(([,v])=>v===false)&&inv.cantidadTrasInvalidos===0,JSON.stringify(inv));
ok('B7 cantidad por omisión = 1; exceso se limita a 99 (con aviso de tope); «−» nunca baja de 1; decimales y textos en cambiar() se rechazan',inv.undef===true&&inv.q1===1&&inv.exceso.tope===true&&inv.q2===99&&inv.mas===false&&inv.q3===1&&inv.cambiarDec===false&&inv.cambiarTexto===false);
ok('B8 fijarCantidad: 0 se rechaza, 200 se limita a 99, «7» (texto numérico) vale 7',inv.fijar0===false&&inv.fijar200===true&&inv.q4===99&&inv.fijarTxt===true&&inv.q5===7);
ok('B9 ids inválidos («constructor», «__proto__», inexistentes, null, números) se rechazan al agregar y al quitar',inv.idMalo.every(v=>v===false)&&inv.quitarMalo===false,JSON.stringify(inv.idMalo));
// tope 99 en la interfaz
await p.evaluate(id=>{const K=window.DS_Carrito;K.vaciar();K.agregar(id,98)},A.id);await abrir(p);await p.click(`#mas-${A.id}`);
ok('B10 al llegar a 99: «＋» queda desactivado y se explica el máximo',await p.isDisabled(`#mas-${A.id}`)&&(await txt(p,'.citem__tope')).includes('Máximo 99')&&(await p.getAttribute(`#mas-${A.id}`,'aria-label')).includes('Máximo 99'),await p.getAttribute(`#mas-${A.id}`,'aria-label'));
await p.keyboard.press('Escape');await p.waitForTimeout(200);await p.click(`#catalogo > .seccion .tarjeta[data-id="${A.id}"] .btn--add`);
ok('B11 agregar desde el catálogo con 99 unidades no pasa del máximo y avisa',(await api(p,'cantidad',A.id))===99&&((await p.textContent('#aviso'))||'').includes('Máximo 99'),await p.textContent('#aviso'));
// pestañas
await api(p,'vaciar');const p2=await pagina(ctx);await cargar(p2);
await add(p,B.id,2);await p2.waitForTimeout(300);
ok('B12 el carrito se sincroniza entre pestañas abiertas',(await txt(p2,'#insCarrito'))==='2',await txt(p2,'#insCarrito'));await p2.close();

// ===== C. ENTREGA Y CÁLCULOS =====
await api(p,'vaciar');await add(p,A.id,2);await add(p,B.id,1);const SUB=A.precio*2+B.precio;
const cfg=await p.evaluate(()=>JSON.parse(JSON.stringify(window.DS_CONFIG.entregas)));const cfg0=cp.execSync('git show '+BASE_COMMIT+':beta/js/config.js').toString();
ok('C1 las 3 modalidades y sus condiciones se conservan EXACTAS: dom $10.000 contraentrega · otra ciudad por confirmar · tienda gratis (config.js idéntico al de la etapa 3b)',cfg.dom.costo===10000&&cfg.dom.detalle==='+$10.000 · pago contraentrega'&&cfg.otra.detalle==='Te confirmamos el valor del envío'&&cfg.otra.costo===0&&cfg.tienda.detalle==='Gratis'&&cfg.tienda.costo===0&&Object.keys(cfg).join()==='dom,otra,tienda'&&sha(fs.readFileSync('beta/js/config.js'))===sha(Buffer.from(cfg0)));
await abrir(p);await p.click('#carContinuar');await p.waitForTimeout(80);
ok('C2 sin entrega elegida: el total dice «Elige la entrega» (no inventa un total)',(await txt(p,'#carTotalPie'))==='Elige la entrega'&&(await txt(p,'.resumen--det .resumen__total')).includes('Elige la entrega'));
await p.click('#ent-dom');
ok('C3 domicilio en Bogotá: +$10.000 y total = subtotal + $10.000',(await txt(p,'.resumen--det')).includes('Domicilio (pago contraentrega) $10.000')&&(await txt(p,'#carTotalPie'))===din(SUB+10000)&&(await txt(p,'.resumen--det .resumen__total'))===('Total '+din(SUB+10000)),await txt(p,'#carTotalPie'));
await p.click('#ent-tienda');
ok('C4 recoger en tienda: gratis y total = subtotal',(await txt(p,'.resumen--det')).includes('Recoger en tienda Gratis')&&(await txt(p,'#carTotalPie'))===din(SUB));
await p.click('#ent-otra');const rOtra=await txt(p,'.resumen--det');
ok('C5 envío a otra ciudad: «Envío: Por cotizar» y «Total definitivo: Pendiente de cotización» (no se suma como $0 ni se presenta como gratis)',rOtra.includes('Envío Por cotizar')&&rOtra.includes('Total definitivo Pendiente de cotización')&&!/gratis/i.test(rOtra)&&(await txt(p,'#carTotalPie'))==='Pendiente de cotización'&&!new RegExp('Total definitivo\\s*\\$').test(rOtra),rOtra);
ok('C6 envío a otra ciudad: el aviso aclara el subtotal de productos y que el envío se confirma',rOtra.includes('Productos con precio: '+din(SUB)+' + envío por cotizar')&&rOtra.includes('Te confirmamos el total por WhatsApp'));
ok('C7 el cálculo interno no cuenta el envío de otra ciudad como costo cero definitivo (pendiente = true)',await p.evaluate(()=>{const t=window.DS_Carrito.totales();return t.pendiente===true&&t.envioPorCotizar===true}));
ok('C8 las 3 opciones se muestran con sus textos originales',(await p.$$eval('.entrega__op',a=>a.map(e=>e.innerText.replace(/\s+/g,' ').trim()))).join('|')==='🛵 Domicilio en Bogotá +$10.000 · pago contraentrega|🚚 Envío a otra ciudad Te confirmamos el valor del envío|🏪 Recoger en tienda Gratis');
await p.keyboard.press('Escape');await p.waitForTimeout(150);
await api(p,'vaciar');await add(p,A.id,1);await add(p,Cn.id,2);
await abrir(p);const s1=await txt(p,'.carrito__cuerpo');await p.click('#carContinuar');await p.click('#ent-dom');
const rCons=await txt(p,'.resumen--det');
ok('C9 producto «Consultar»: no suma al subtotal, se avisa y el total queda «Por confirmar»',s1.includes('Incluye 1 producto con precio por consultar')&&rCons.includes('Subtotal (3 unidades) '+din(A.precio))&&rCons.includes('Total definitivo Por confirmar')&&rCons.includes('precio por consultar'),rCons);
await p.keyboard.press('Escape');await api(p,'vaciar');

// ===== D. DATOS DEL COMPRADOR Y VALIDACIONES =====
await add(p,A.id,2);await add(p,B.id,1);await abrir(p);await p.click('#carContinuar');
const n0=wa.length,pop0=ctx.pages().length;await p.click('#carEnviar');await p.waitForTimeout(500);
ok('D1 enviar sin datos: NO abre WhatsApp y muestra un resumen de errores (nombre y entrega) con el foco en él',wa.length===n0&&ctx.pages().length===pop0&&await p.isVisible('#carErrores')&&(await txt(p,'#carErrores')).includes('Escribe tu nombre')&&(await txt(p,'#carErrores')).includes('Elige cómo quieres recibir')&&await p.evaluate(()=>document.activeElement.id==='carErrores'),await txt(p,'#carErrores'));
ok('D2 el campo con error se marca (aria-invalid) y su mensaje está asociado (aria-describedby)',(await p.getAttribute('#c-nombre','aria-invalid'))==='true'&&(await p.getAttribute('#c-nombre','aria-describedby'))==='err-nombre'&&(await txt(p,'#err-nombre')).length>5);
await p.screenshot({path:CAP+'04_validacion_faltan_datos.png'});
await p.fill('#c-nombre','A');await p.waitForTimeout(80);
ok('D3 nombre de 1 carácter: se pide al menos 2 (los errores se actualizan al escribir sin perder el foco)',(await txt(p,'#err-nombre')).includes('al menos 2')&&await p.evaluate(()=>document.activeElement.id==='c-nombre'));
await p.fill('#c-nombre','Ana Pérez');await p.waitForTimeout(80);
ok('D4 al corregir el nombre desaparece su error',(await txt(p,'#err-nombre'))===''&&!(await p.getAttribute('#c-nombre','aria-invalid')));
ok('D5 con nombre pero sin entrega: sigue faltando la entrega y no se habilita el enlace de WhatsApp (href interno)',(await p.getAttribute('#carEnviar','href'))==='#carrito'&&(await txt(p,'#carErrores')).includes('Elige cómo'));
// domicilio
await p.click('#ent-dom');await p.waitForTimeout(80);
ok('D6 domicilio en Bogotá: pide dirección (obligatoria), barrio e indicaciones (opcionales); no pide ciudad',await p.isVisible('#c-direccion')&&await p.isVisible('#c-barrio')&&await p.isVisible('#c-indicaciones')&&!(await p.$('#c-ciudad'))&&(await txt(p,'label[for="c-direccion"]')).includes('obligatorio')&&(await txt(p,'label[for="c-barrio"]')).includes('opcional')&&(await txt(p,'label[for="c-indicaciones"]')).includes('opcional'));
ok('D7 domicilio sin dirección: error específico y no se envía',(await txt(p,'#err-direccion')).includes('dirección de entrega')&&(await api(p,'validar')).ok===false);
await p.fill('#c-direccion','Cl 1');await p.waitForTimeout(60);
ok('D8 dirección muy corta (4 caracteres): se pide al menos 5',(await txt(p,'#err-direccion')).includes('al menos 5'));
await p.fill('#c-direccion','Calle 100 # 15-20 apto 301');await p.waitForTimeout(60);
ok('D9 con nombre + entrega + dirección ya es válido (barrio e indicaciones son opcionales)',(await api(p,'validar')).ok===true&&(await p.getAttribute('#carEnviar','href')).startsWith('https://wa.me/'+WA+'?text='));
await p.fill('#c-barrio','Chicó');await p.fill('#c-indicaciones','Torre 2, portería; llamar al llegar');
const msgDom=await p.inputValue('#carTexto');
await p.evaluate(()=>document.querySelector('.carrito__cuerpo').scrollTo(0,200));await p.screenshot({path:CAP+'05_domicilio_datos_completos.png'});
ejemplos.push(['Domicilio en Bogotá (dirección, barrio e indicaciones)',msgDom,await p.getAttribute('#carEnviar','href')]);
// otra ciudad
await p.click('#ent-otra');await p.waitForTimeout(80);
ok('D10 otra ciudad: pide ciudad (obligatoria), departamento y dirección/barrio de destino (opcionales); ya no pide dirección de domicilio',await p.isVisible('#c-ciudad')&&await p.isVisible('#c-departamento')&&await p.isVisible('#c-destino')&&!(await p.$('#c-direccion'))&&(await txt(p,'label[for="c-ciudad"]')).includes('obligatorio')&&(await txt(p,'label[for="c-departamento"]')).includes('opcional')&&(await txt(p,'label[for="c-destino"]')).includes('opcional'));
ok('D11 otra ciudad sin ciudad: no es válido y la tarjeta de datos se titula «Datos para cotizar el envío»',(await api(p,'validar')).ok===false&&(await txt(p,'.datos-entrega h3'))==='Datos para cotizar el envío'&&(await api(p,'validar')).errores.ciudad!==undefined);
await p.fill('#c-ciudad','Medellín');await p.fill('#c-departamento','Antioquia');await p.fill('#c-destino','Laureles, Cra 70 # 44-10');
ok('D12 con la ciudad ya es válido (departamento y destino opcionales)',(await api(p,'validar')).ok===true);
await p.evaluate(()=>document.querySelector('.carrito__cuerpo').scrollTo(0,0));await p.screenshot({path:CAP+'06_otra_ciudad_pendiente_cotizacion.png'});
await p.evaluate(()=>document.querySelector('.carrito__cuerpo').scrollTo(0,9999));await p.screenshot({path:CAP+'06b_otra_ciudad_resumen.png'});
const msgOtra=await p.inputValue('#carTexto');ejemplos.push(['Envío a otra ciudad (total pendiente de cotización)',msgOtra,await p.getAttribute('#carEnviar','href')]);
await p.fill('#c-departamento','');await p.fill('#c-destino','');ok('D13 otra ciudad solo con la ciudad: el mensaje no deja líneas vacías de departamento ni destino',(await p.inputValue('#carTexto')).includes('*Ciudad de destino:* Medellín\n*Envío:*')&&!(await p.inputValue('#carTexto')).includes('Dirección o barrio de destino'));
// tienda
await p.click('#ent-tienda');await p.waitForTimeout(80);
ok('D14 recoger en tienda: solo se necesita el nombre (no aparecen campos de dirección ni de ciudad)',!(await p.$('#c-direccion'))&&!(await p.$('#c-ciudad'))&&await p.isVisible('#c-nombre')&&(await api(p,'validar')).ok===true&&(await txt(p,'.nota--ok')).includes('solo necesitamos tu nombre'));
const msgTienda=await p.inputValue('#carTexto');ejemplos.push(['Recoger en tienda',msgTienda,await p.getAttribute('#carEnviar','href')]);
ok('D15 cambiar de entrega no filtra datos de otra modalidad al mensaje (tienda: sin dirección ni ciudad aunque estén escritas)',!/Dirección|Ciudad de destino|Indicaciones|Domicilio:/.test(msgTienda)&&await api(p,'comprador','direccion')==='Calle 100 # 15-20 apto 301');
await p.screenshot({path:CAP+'07_tienda_solo_nombre.png'});
// privacidad
const alm=await p.evaluate(()=>({ls:Object.entries(localStorage),ss:Object.entries(sessionStorage)}));
ok('D16 datos personales: NADA de nombre, dirección, ciudad o indicaciones en localStorage (persistente)',!JSON.stringify(alm.ls).match(/Ana|Calle 100|Medell|Torre 2|Chic/),JSON.stringify(alm.ls).slice(0,200));
ok('D17 los datos escritos solo viven en sessionStorage (se borran al cerrar la pestaña) y la clave antigua dtb_nombre ya no existe',alm.ss.some(([k])=>k==='dtb_comprador')&&!alm.ls.some(([k])=>k==='dtb_nombre')&&alm.ls.every(([k])=>['dtb_cart','dtb_ent','dtb_popups'].includes(k)||k.startsWith('dtb_pm')||k.startsWith('dtb_')),JSON.stringify(alm.ls.map(x=>x[0])));
await p.evaluate(()=>localStorage.setItem('dtb_nombre','Viejo Nombre'));await p.reload();await p.waitForSelector('#catalogo[aria-busy="false"]');
ok('D18 al cargar, se elimina el nombre guardado de forma permanente por la versión anterior',await p.evaluate(()=>localStorage.getItem('dtb_nombre')===null));
// limpieza e inyección
const lim=await p.evaluate(()=>{const K=window.DS_Carrito;K.fijarEntrega('dom');K.fijarDato('nombre','  Ana \n\r  Pérez\t\u2028  ');K.fijarDato('direccion','Cra 7 # 1-1');K.fijarDato('indicaciones','*negrita* \n\nTOTAL: $1\n');K.fijarDato('constructor','x');K.fijarDato('__proto__','y');K.fijarDato('barrio','x'.repeat(500));
  return {m:K.mensaje(),barrio:K.comprador('barrio').length,nombre:K.comprador('nombre'),otros:Object.keys(K.comprador())}});
ok('D19 nombres con saltos de línea, tabulaciones y espacios: el mensaje queda en una sola línea limpia («Ana Pérez») y no se puede falsear una línea de TOTAL',lim.m.includes('*Cliente:* Ana Pérez\n')&&!/\n\nTOTAL/.test(lim.m)&&lim.m.split('\n').filter(l=>l.startsWith('*TOTAL:*')).length===1&&lim.m.includes('*Indicaciones:* *negrita* TOTAL: $1\n'),lim.m);
ok('D20 longitud máxima por campo (barrio 500 → 60) y campos desconocidos («constructor», «__proto__») se ignoran',lim.barrio===60&&!lim.otros.includes('constructor')&&!lim.otros.includes('__proto__')&&{}.x===undefined);
// XSS
await abrir(p);await p.click('#carContinuar');await p.fill('#c-nombre','<img src=x onerror="window.__xss=1"><b>x</b>');await p.waitForTimeout(150);
ok('D21 un nombre con HTML no se ejecuta ni se inserta como etiquetas (se escapa en el cuadro y en el texto de respaldo)',await p.evaluate(()=>window.__xss===undefined&&!document.querySelector('#capaCarrito img[src="x"]')&&document.querySelector('#carTexto').value.includes('<img src=x')));
await p.keyboard.press('Escape');await api(p,'vaciar');

// ===== E. MENSAJE DE WHATSAPP =====
await add(p,A.id,2);await add(p,B.id,1);await add(p,C2.id,3);await api(p,'fijarEntrega','dom');
await p.evaluate(()=>{const K=window.DS_Carrito;K.fijarDato('nombre','Luz Ángela Gómez');K.fijarDato('direccion','Carrera 15 # 93-60, Torre B & Apto 502');K.fijarDato('barrio','El Retiro');K.fijarDato('indicaciones','Dejar con portería (50% de descuento + otros) #1?')});
const E1=await p.evaluate(()=>({m:window.DS_Carrito.mensaje(),u:window.DS_Carrito.enlace()}));
const lineasEsp=[A,B,C2].map((x,i)=>`${i+1}. ${x.nombre}\n   ${[2,1,3][i]} × ${din(x.precio)} = ${din(x.precio*[2,1,3][i])}`).join('\n');
const sub3=A.precio*2+B.precio+C2.precio*3;
ok('E1 el mensaje incluye TODOS los productos con cantidad, precio unitario y total por producto, en el formato esperado',E1.m.includes(lineasEsp)&&E1.m.includes('*Productos* (3 productos, 6 unidades):'),E1.m);
ok('E2 el mensaje incluye cliente, subtotal, entrega, dirección, barrio, indicaciones, domicilio y total',['*Cliente:* Luz Ángela Gómez','*Subtotal:* '+din(sub3),'*Entrega:* Domicilio en Bogotá (+$10.000, pago contraentrega)','*Dirección:* Carrera 15 # 93-60, Torre B & Apto 502, El Retiro','*Indicaciones:* Dejar con portería (50% de descuento + otros) #1?','*Domicilio:* $10.000','*TOTAL:* '+din(sub3+10000)].every(l=>E1.m.includes(l)),E1.m);
ok('E3 el mensaje abre con «PEDIDO DANTESTORE» y cierra con el origen; la estructura es la esperada',E1.m.startsWith('*PEDIDO DANTESTORE*\nHola DANTESTORE 👋, quiero hacer este pedido.\n\n*Cliente:*')&&E1.m.endsWith('\n\nOrigen: catálogo web'));
const url=new URL(E1.u);
ok('E4 codificado correctamente: URL de wa.me al único número autorizado y el texto decodificado es idéntico al mensaje (con tildes, emojis, &, #, +, %, ?, saltos de línea)',url.origin==='https://wa.me'&&url.pathname==='/'+WA&&url.searchParams.get('text')===E1.m&&decodeURIComponent(E1.u.split('?text=')[1])===E1.m&&!/[\s\n&#"<>]/.test(E1.u.split('?text=')[1])&&E1.u.includes('%0A')&&E1.u.includes('%F0%9F%91%8B')&&E1.u.includes('%26')&&E1.u.includes('%23')&&E1.u.includes('%2B')&&E1.u.includes('%25'),E1.u.slice(0,120));
ejemplos.push(['Domicilio con caracteres especiales (&, #, +, %, ?, tildes) para verificar la codificación',E1.m,E1.u]);
// otra ciudad con producto «Consultar»
await add(p,Cn.id,1);await api(p,'fijarEntrega','otra');
await p.evaluate(()=>{const K=window.DS_Carrito;K.fijarDato('ciudad','Cali');K.fijarDato('departamento','Valle del Cauca');K.fijarDato('destino','Barrio San Fernando')});
const E2=await p.evaluate(()=>window.DS_Carrito.mensaje());
ok('E5 otra ciudad: el mensaje trae ciudad y departamento, «Envío: por cotizar» y total pendiente de confirmar (nunca un TOTAL numérico)',E2.includes('*Ciudad de destino:* Cali, Valle del Cauca')&&E2.includes('*Dirección o barrio de destino:* Barrio San Fernando')&&E2.includes('*Envío:* por cotizar')&&E2.includes('*TOTAL:* pendiente de confirmar (envío por cotizar y productos con precio por consultar)')&&!/\*TOTAL:\* \$/.test(E2),E2);
ok('E6 producto sin precio: aparece con su cantidad y «precio por consultar», y el subtotal lo aclara',E2.includes(`${Cn.nombre}\n   1 unidad — precio por consultar`)&&E2.includes('*Subtotal (sin los productos por consultar):* '+din(sub3)),E2);
ejemplos.push(['Otra ciudad con un producto de precio por consultar',E2,null]);
await api(p,'quitar',Cn.id);await api(p,'fijarEntrega','tienda');
const E3=await p.evaluate(()=>window.DS_Carrito.mensaje());
ok('E7 recoger en tienda: entrega «gratis», sin datos de dirección y TOTAL = subtotal',E3.includes('*Entrega:* Recoger en tienda (gratis)')&&E3.includes('*TOTAL:* '+din(sub3))&&!/Dirección|Ciudad|Domicilio:|Envío:/.test(E3));
// único número
const href0=await p.evaluate(()=>window.DS_Carrito.consulta(window.DS_Carrito.porId[Object.keys(window.DS_Carrito.porId)[0]]));
const fuentes=['beta/index.html','beta/js/app.js','beta/js/carrito.js','beta/js/config.js','beta/css/estilos.css'].map(f=>fs.readFileSync(f,'utf8')).join('\n');
const numeros=[...new Set((fuentes.match(/\d{9,}/g)||[]))];
ok('E8 único WhatsApp autorizado 573134724702: es el único número de 9+ dígitos en el código de la beta y los enlaces de consulta lo usan',numeros.join()===WA&&href0.startsWith('https://wa.me/'+WA+'?text='),numeros);
const todosHref=await p.evaluate(()=>[...document.querySelectorAll('a[href*="wa.me"]')].map(a=>a.href));
ok('E9 todos los enlaces a WhatsApp visibles en la página apuntan al número autorizado',todosHref.length>0&&todosHref.every(h=>h.startsWith('https://wa.me/'+WA)),todosHref.slice(0,3));
// envío real (interceptado)
await api(p,'fijarEntrega','dom');await abrir(p);await p.click('#carContinuar');
const w0=wa.length;const [popup]=await Promise.all([ctx.waitForEvent('page',{timeout:5000}).catch(()=>null),p.click('#carEnviar')]);await p.waitForTimeout(300);
ok('E10 enviar con datos completos abre WhatsApp en una pestaña nueva hacia el número autorizado con el mensaje',!!popup&&wa.length===w0+1&&wa[wa.length-1].startsWith('https://wa.me/'+WA+'?text=')&&decodeURIComponent(wa[wa.length-1].split('?text=')[1]).startsWith('*PEDIDO DANTESTORE*'),wa[wa.length-1]&&wa[wa.length-1].slice(0,80));
if(popup)await popup.close().catch(()=>{});
ok('E11 el carrito NO se vacía al enviar (el cliente puede revisar y corregir en WhatsApp)',(await api(p,'totales')).unidades===6&&await p.evaluate(()=>window.DS_Carrito.items().length===3));
await p.waitForTimeout(900);
ok('E12 después de enviar se informa que el carrito se conserva y se ofrece vaciarlo (con confirmación)',(await txt(p,'.enviado')).includes('Tu carrito se conserva')&&await p.isVisible('.enviado [data-accion="vaciar"]'));
await p.evaluate(()=>document.querySelector('.carrito__cuerpo').scrollTo(0,9999));await p.screenshot({path:CAP+'08_despues_de_enviar_carrito_conservado.png'});
await p.click('.enviado [data-accion="vaciar"]');ok('E13 «Ya envié mi pedido: vaciar» también pide confirmación',await p.isVisible('.confirmar')&&(await api(p,'totales')).unidades===6);await p.click('#vaciarNo');
ok('E14 el texto de respaldo («¿No se abre WhatsApp?») coincide exactamente con el mensaje enviado',(await p.inputValue('#carTexto'))===decodeURIComponent((await p.getAttribute('#carEnviar','href')).split('?text=')[1]));
ok('E15 el enlace de envío abre en pestaña nueva con rel=noopener',(await p.getAttribute('#carEnviar','target'))==='_blank'&&(await p.getAttribute('#carEnviar','rel')).includes('noopener'));
// mensaje largo
const largo=await p.evaluate(ids=>{const K=window.DS_Carrito;K.vaciar();ids.forEach(i=>K.agregar(i,2));K.fijarEntrega('dom');K.fijarDato('nombre','Cliente de Prueba');K.fijarDato('direccion','Calle 1 # 2-3');return {n:ids.length,m:K.mensaje(),u:K.enlace()}},prod.filter(x=>x.precio).slice(0,25).map(x=>x.id));
ok('E16 carrito grande (25 productos): el mensaje incluye los 25 y la URL mide '+largo.u.length+' caracteres (si WhatsApp no la abriera, existe el texto de respaldo)',(largo.m.match(/^\d+\. /gm)||[]).length===25&&largo.u.length<9000,largo.u.length);
await p.keyboard.press('Escape');await api(p,'vaciar');

// ===== F. EXPERIENCIA DE USUARIO, 5 TAMAÑOS DE PANTALLA, ACCESIBILIDAD =====
const tam=[['320×568 (iPhone SE)',320,568,1],['360×740 (Android)',360,740,1],['390×844 (iPhone 14)',390,844,1],['768×1024 (tablet)',768,1024,1],['1280×800 (escritorio)',1280,800,0]];
const probTam=[];
for(const [nom,w,h,m] of tam){const c=await contexto({width:w,height:h},!!m);const q=await pagina(c);await cargar(q);
  for(const x of [A,B,C2,D2,conPrecio[15],Cn])await add(q,x.id,x===A?3:1);await abrir(q);
  const r1={cont:await visibleEnPantalla(q,'#carContinuar'),seguir:await visibleEnPantalla(q,'.carrito__pie [data-accion="cerrar"]')};
  const des1=await q.evaluate(()=>({doc:document.documentElement.scrollWidth<=innerWidth,hoja:document.querySelector('.capa__hoja--carrito').scrollWidth<=document.querySelector('.capa__hoja--carrito').clientWidth,cuerpo:document.querySelector('.carrito__cuerpo').scrollWidth<=document.querySelector('.carrito__cuerpo').clientWidth}));
  if(w===390)await q.screenshot({path:CAP+'02b_paso1_6_productos_botones_visibles.png'});
  await q.click('#carContinuar');await q.click('#ent-dom');await q.fill('#c-nombre','Cliente Prueba');await q.fill('#c-direccion','Calle 1 # 2-3');
  const r2={env:await visibleEnPantalla(q,'#carEnviar'),total:await visibleEnPantalla(q,'#carTotalPie')};
  const des2=await q.evaluate(()=>({doc:document.documentElement.scrollWidth<=innerWidth,cuerpo:document.querySelector('.carrito__cuerpo').scrollWidth<=document.querySelector('.carrito__cuerpo').clientWidth}));
  // el último elemento del cuerpo es alcanzable (no queda tapado por el pie fijo)
  const alc=await q.evaluate(()=>{const c=document.querySelector('.carrito__cuerpo');c.scrollTop=c.scrollHeight;const u=c.lastElementChild.getBoundingClientRect(),pie=document.querySelector('.carrito__pie').getBoundingClientRect();return u.bottom<=pie.top+1});
  const peq=await q.evaluate(()=>[...document.querySelectorAll('#capaCarrito button:not([disabled]),#capaCarrito a.btn,#capaCarrito .campo__in,#capaCarrito summary,#capaCarrito .entrega__op')].filter(e=>e.offsetParent!==null&&!e.closest('.errores')).map(e=>({n:(e.id||e.className||e.tagName).toString().slice(0,30),h:Math.round(e.getBoundingClientRect().height),w:Math.round(e.getBoundingClientRect().width)})).filter(o=>o.h<44||o.w<44));
  if(w===320)await q.screenshot({path:CAP+'09_pantalla_320.png'});if(w===768)await q.screenshot({path:CAP+'10_tablet_768.png'});if(w===1280)await q.screenshot({path:CAP+'11_escritorio_1280.png'});
  if(!(r1.cont&&r1.seguir&&r2.env&&r2.total&&des1.doc&&des1.hoja&&des1.cuerpo&&des2.doc&&des2.cuerpo&&alc&&!peq.length))probTam.push({nom,r1,r2,des1,des2,alc,peq});await c.close()}
ok('F1 cinco tamaños de pantalla (320, 360, 390, 768, 1280): «Continuar», «Seguir comprando» y «Enviar pedido» siempre visibles sin hacer scroll; sin desbordes horizontales; el último campo no queda tapado; controles táctiles ≥ 44 px',!probTam.length,probTam);
// avisos sobre controles
await add(p,A.id,1);await abrir(p);await p.click(`#mas-${A.id}`);
{const t=await p.$eval('#aviso',e=>e.getBoundingClientRect().toJSON()),b=await p.$eval('#carContinuar',e=>e.getBoundingClientRect().toJSON());await p.evaluate(()=>{const a=document.getElementById('aviso');a.textContent='probando aviso';a.classList.add('on')});await p.waitForTimeout(300);
  const t2=await p.$eval('#aviso',e=>e.getBoundingClientRect().toJSON());ok('F2 los avisos emergentes no tapan los botones «Continuar» / «Enviar pedido» ni la cantidad',t2.bottom<b.top&&t2.top<120,{aviso:[Math.round(t2.top),Math.round(t2.bottom)],boton:[Math.round(b.top),Math.round(b.bottom)]})}
await p.evaluate(()=>document.getElementById('aviso').classList.remove('on'));
// volver al catálogo sin perder el carrito
const antes=(await api(p,'totales')).unidades;await p.click('.carrito__pie [data-accion="cerrar"]');await p.waitForTimeout(300);
ok('F3 «Seguir comprando» vuelve al catálogo sin perder el carrito (la barra inferior sigue mostrando las unidades)',!(await p.isVisible('#capaCarrito'))&&(await api(p,'totales')).unidades===antes&&await p.isVisible('#barraCarrito')&&(await txt(p,'#barraCarrito')).includes(antes+' unidades'),await txt(p,'#barraCarrito'));
await abrir(p);await p.keyboard.press('Escape');await p.waitForTimeout(300);
ok('F4 Esc y el botón «Atrás» del navegador cierran el carrito sin perderlo',!(await p.isVisible('#capaCarrito'))&&(await api(p,'totales')).unidades===antes);
await p.click('#btnCarrito');await p.waitForTimeout(200);await p.goBack();await p.waitForTimeout(300);
ok('F5 el gesto «Atrás» (historial) cierra el carrito y el carrito se conserva',!(await p.isVisible('#capaCarrito'))&&(await api(p,'totales')).unidades===antes);
await abrir(p);await p.click('#carContinuar');await p.fill('#c-nombre','Marta');await p.click('#ent-tienda');await p.click('[data-accion="paso-1"]');
ok('F6 volver al paso 1 conserva los productos y los datos escritos',(await p.$$('.citem')).length>=1&&(await api(p,'comprador','nombre'))==='Marta'&&(await api(p,'entrega'))==='tienda');
await p.click('#carContinuar');ok('F7 al volver al paso 2 los datos siguen ahí',(await p.inputValue('#c-nombre'))==='Marta'&&await p.isChecked('#ent-tienda'));
// foco y teclado
await p.click('[data-accion="paso-1"]');await p.focus(`#mas-${A.id}`);await p.keyboard.press('Enter');await p.waitForTimeout(80);
ok('F8 teclado: con Enter sobre «＋» la cantidad sube y el foco se queda en el mismo control',await p.evaluate(id=>document.activeElement.id==='mas-'+id,A.id));
await p.keyboard.press('Space');await p.waitForTimeout(80);
ok('F9 teclado: con Espacio también funciona y la cantidad sigue coherente con el almacenamiento',(await p.textContent(`.citem:has(#mas-${A.id}) output`))===String(await api(p,'cantidad',A.id)));
await p.click('#carContinuar');await p.focus('#c-nombre');await p.fill('#c-nombre','');await p.keyboard.type('Escribiendo sin perder el foco',{delay:5});
ok('F10 al escribir en un campo no se pierde el foco ni el texto (no se repinta el panel)',await p.evaluate(()=>document.activeElement.id==='c-nombre'&&document.activeElement.value==='Escribiendo sin perder el foco'));
const trampa=await p.evaluate(async()=>{const vistos=new Set();for(let i=0;i<40;i++){const e=document.activeElement;vistos.add(!!e.closest('#capaCarrito'));document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));const f=[...document.querySelectorAll('#capaCarrito button:not([disabled]),#capaCarrito a[href],#capaCarrito input,#capaCarrito textarea,#capaCarrito summary')].filter(x=>x.offsetParent!==null);const a=f[0],z=f[f.length-1];if(document.activeElement===z)a.focus();else{const k=f.indexOf(document.activeElement);if(k>=0)f[k+1].focus()}}return [...vistos]});
ok('F11 teclado: el foco recorre solo el carrito abierto (no se escapa al fondo)',trampa.length===1&&trampa[0]===true);
const acc=await p.evaluate(()=>{const d=document.getElementById('capaCarrito');const sinEtq=[...d.querySelectorAll('input,textarea')].filter(i=>!(i.id&&d.querySelector('label[for="'+i.id+'"]'))&&!i.closest('label')&&!i.getAttribute('aria-label')).map(i=>i.id);
  const btnSin=[...d.querySelectorAll('button')].filter(b=>!(b.textContent.trim()||b.getAttribute('aria-label'))).length;
  return {role:d.getAttribute('role'),modal:d.getAttribute('aria-modal'),lab:d.getAttribute('aria-labelledby'),h2:!!document.getElementById('carTitulo'),sinEtq,btnSin,fieldset:!!d.querySelector('fieldset.entrega legend'),paso:d.querySelector('.pasos [aria-current="step"]')&&d.querySelector('.pasos [aria-current="step"]').textContent.trim(),req:[...d.querySelectorAll('[aria-required="true"]')].length,font:getComputedStyle(d.querySelector('.campo__in')).fontSize}});
ok('F12 accesibilidad: diálogo modal con título, todos los campos con etiqueta, botones con nombre, opciones de entrega en fieldset con legend, paso actual marcado, campos obligatorios con aria-required, texto de campos ≥ 16 px (sin zoom en iPhone)',acc.role==='dialog'&&acc.modal==='true'&&acc.lab==='carTitulo'&&acc.h2&&!acc.sinEtq.length&&acc.btnSin===0&&acc.fieldset&&/Entrega y datos/.test(acc.paso)&&acc.req>=1&&parseFloat(acc.font)>=16,acc);
await p.keyboard.press('Escape');await api(p,'vaciar');

// ===== G. INTEGRIDAD Y PROTECCIÓN =====
const datos=await p.evaluate(()=>window.DANTESTORE_DATOS.productos.map(x=>[x.id,x.nombre,x.categoria,x.precio,x.precio_texto,x.descripcion]));
const orig=J.productos.map(x=>[x.id,x.nombre,x.categoria,x.precio,x.precio_texto,x.descripcion]);
ok('G1 los 186 productos (id, nombre, categoría, precio, texto de precio, descripción) son idénticos a data/productos.json',datos.length===186&&JSON.stringify(datos)===JSON.stringify(orig));
const basePJ=cp.execSync('git show '+BASE_COMMIT+':data/productos.json');
ok('G2 data/productos.json sigue byte a byte igual al de la etapa 3b (productos, precios, nombres, IDs, categorías, descripciones sin cambios)',sha(fs.readFileSync('data/productos.json'))===sha(basePJ));
ok('G3 siguen 186 productos y 20 categorías en la beta',J.productos.length===186&&J.categorias.length===20&&(await p.$$eval('.chip',a=>a.length))===21);
const nuevoDatos=cp.execSync('git diff --name-only '+BASE_COMMIT+' -- beta/js/datos.js').toString().trim();
ok('G4 beta/js/datos.js (datos del catálogo) no cambió respecto a la etapa 3b',nuevoDatos==='');
const EXC=require('./excepcion_manifiesto.js')(BASE_COMMIT);   // única excepción documentada (etapa 5): manifiesto «Infinity» → null
const fotosCambiadas=cp.execSync("git diff --name-only "+BASE_COMMIT+" -- img data").toString().split('\n').filter(l=>l.trim()&&!(EXC&&l==='data/manifiesto_imagenes.json')).join('\n').trim();
ok('G5 ninguna fotografía (originales, miniaturas ni completas) ni archivo de data/ cambió',fotosCambiadas==='',fotosCambiadas);
ok('G6 el logo original del perro Dante no se modificó (sha256 = el registrado en productos.json) y la beta usa su copia sin pérdida',sha(fs.readFileSync('img/originales/_logo-marca.png'))===J.logo.sha256&&(await p.getAttribute('.marca__logo','src'))==='../img/miniaturas/_logo-marca.webp');
ok('G7 index.html (raíz) y catalogo-dantestore.html intactos (sha256 de la auditoría)',sha(fs.readFileSync('index.html'))==='9b4ac063095243e6efa00925ad42da7eb0f9c0bbf5451323224265a4a5efd685'&&sha(fs.readFileSync('catalogo-dantestore.html'))==='820e1d5f50b681d53ec44016f2935e2e73cdaa8c26c1a29153f426c680647569');
const fuera=cp.execSync("git status --porcelain && git diff --name-only "+BASE_COMMIT).toString().split('\n').map(l=>l.replace(/^.. /,'').trim()).filter(Boolean).filter(f=>!/^(beta|herramientas|docs)\//.test(f)).filter(f=>!(EXC&&f==='data/manifiesto_imagenes.json'));
ok('G8 los únicos archivos tocados están en beta/, herramientas/ y docs/ (nada de la raíz, _respaldo, data ni img)',!fuera.length,fuera);
const dep=['package.json','package-lock.json','node_modules','requirements.txt','CNAME','.github','_config.yml','.nojekyll'].filter(f=>fs.existsSync(f));
const ext=(fuentes.match(/https?:\/\/[^\s"'`)]+/g)||[]).filter(u=>!/wa\.me|dantechstore\.github\.io|www\.w3\.org/.test(u));
ok('G9 sin dependencias nuevas ni servicios externos: sin package.json, sin librerías, sin URLs externas en el código; sin archivos de publicación (CNAME, workflows)',!dep.length&&!ext.length&&!/<script[^>]+src="https?:/.test(fs.readFileSync('beta/index.html','utf8')),{dep,ext});
const rem=(()=>{try{return cp.execSync('git ls-remote --heads origin',{timeout:60000}).toString()}catch(e){return ''}})();
ok('G10 main remoto sigue en 9ef8bc95f5023ec2160e8590c643e26605a5db32 (y dantechstore-catalogo en b343f5a)',rem.includes('9ef8bc95f5023ec2160e8590c643e26605a5db32\trefs/heads/main')&&rem.includes('b343f5a5e06dc71f93e72006e3a1ae54ea081561\trefs/heads/dantechstore-catalogo'),rem.split('\n').filter(Boolean).join(' | '));
ok('G11 consola sin errores ni advertencias, sin recursos rotos (404) en TODO el recorrido de pruebas',!errores.length,errores.slice(0,5));

// ===== capturas finales: flujo completo =====
await abrir(p).catch(()=>{});await p.keyboard.press('Escape').catch(()=>{});
await br.close();srv.close();
// ejemplos de mensaje
let md='# Ejemplos reales del mensaje de WhatsApp (etapa 4)\n\nGenerados por `herramientas/etapa4_pruebas.js` con el código real del carrito (no son maquetas). Número de destino único: **+57 313 472 4702**. Los datos del cliente son de prueba.\n\nFormato: WhatsApp interpreta `*texto*` como negrita.\n\n';
ejemplos.forEach(([t,m,u],i)=>{md+=`## ${i+1}. ${t}\n\n\`\`\`\n${m}\n\`\`\`\n\n`+(u?`Enlace generado (${u.length} caracteres):\n\n\`${u.slice(0,150)}…\`\n\n`:'')});
fs.writeFileSync('docs/EJEMPLOS_MENSAJE_WHATSAPP.md',md);
const bad=res.filter(r=>!r[1]);
console.log(res.map(([n,o,d])=>(o?'OK    ':'FALLA ')+n+(!o&&d!==''&&d!==undefined?'  -> '+(typeof d==='string'?d:JSON.stringify(d)).slice(0,500):'')).join('\n'));
console.log(`\nRESULTADO: ${res.length-bad.length} de ${res.length} verificaciones OK`+(bad.length?'  FALLAS: '+bad.map(b=>b[0].split(' ')[0]).join(', '):''));
process.exit(bad.length?1:0)})().catch(e=>{console.error(e);process.exit(2)});
