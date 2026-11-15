#!/usr/bin/env node
/* Genera beta/img/og-dantestore.jpg (1200x630) para la vista previa al compartir el enlace.
 * Usa SOLO recursos existentes: el logo original (img/originales/_logo-marca.png, sin modificarlo), el eslogan y los textos de marca.
 * No incluye fotografías de productos. Uso: node herramientas/etapa3b_generar_og.js (desde la raíz del repo). */
const {chromium}=require(process.env.PW||'/home/claude/.npm-global/lib/node_modules/playwright');
const fs=require('fs'),path=require('path');
(async()=>{const root=process.cwd();const html=fs.readFileSync(path.join(__dirname,'og_plantilla.html'),'utf8').replace(/file:\/\/\/[^"]*_logo-marca\.png/,'file://'+root+'/img/originales/_logo-marca.png');
const tmp=path.join(root,'beta/img/.og_tmp.html');fs.writeFileSync(tmp,html);
const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await br.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
await p.goto('file://'+tmp);await p.waitForTimeout(600);await p.screenshot({path:path.join(root,'beta/img/og-dantestore.jpg'),type:'jpeg',quality:88});await br.close();fs.unlinkSync(tmp);console.log('listo')})();
