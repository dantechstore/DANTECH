/* Excepción documentada (Etapa 5): el manifiesto de imágenes de la etapa 2 tenía «"psnr_db": Infinity» (inválido en JSON estricto) y se cambió a null.
 * Las guardas de «no se modificó nada fuera de beta/, herramientas/ y docs/» aceptan ESE cambio y ningún otro: si el diff del manifiesto contiene
 * cualquier línea distinta de Infinity → null, la excepción NO aplica y la guarda sigue fallando. */
const cp=require('child_process');
module.exports=function manifiestoSoloPsnr(base){
  const dm=cp.execSync(`git diff -U0 ${base} -- data/manifiesto_imagenes.json`).toString().split('\n').filter(l=>/^[+-][^+-]/.test(l)).map(l=>l.replace(/\s+/g,''));
  return dm.length>0&&dm.length%2===0&&dm.filter(l=>l[0]==='-').every(l=>l==='-"psnr_db":Infinity,')&&dm.filter(l=>l[0]==='+').every(l=>l==='+"psnr_db":null,');
};
