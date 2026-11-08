import {build} from 'esbuild';
import {mkdir,copyFile,cp,readdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
process.chdir(root);
await mkdir('public/assets/runtime/php/8_4_25',{recursive:true});
await mkdir('public/assets/runtime/python',{recursive:true});
// Embed the local board stylesheet for standalone, network-free print exports.
const canvasPrintBase=':root{--surface-card:#fff;--border-subtle:#d5d5d5;--border-strong:#9b9b9b;--text-strong:#252525;--text-muted:#666;--accent:#b2026c;--surface-accent-soft:#f9edf4;--font-body:Arial,sans-serif;--font-mono:monospace}body{font:14px/1.5 system-ui,sans-serif;margin:24px;color:#252525}button{font:inherit}.canvas-note{break-inside:avoid}.canvas-print-notes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin-top:24px}.canvas-credit{margin-top:20px}.hidden{display:none}';
const canvasScreenCss=await readFile('public/assets/canvas.css','utf8');
const canvasGridPrint=[['@media(min-width:1200px){','@media(max-width:900px){'],['@media(min-width:901px){','@media(min-width:1200px){.canvas-board--smart']].map(([start,end])=>{const from=canvasScreenCss.indexOf(start),to=canvasScreenCss.indexOf(end,from);return canvasScreenCss.slice(from,to).replace(/^@media[^{]*\{/,'').replace(/\}\s*$/,'');}).join('');
const canvasPrintOverrides='@media print{'+canvasGridPrint+'body{margin:0;font-size:11px}.canvas-question{font-size:10px}.canvas-note-text{font-size:11px}.canvas-original-map{break-inside:avoid}.canvas-print-notes{break-before:page}.canvas-board--swot{grid-template-columns:1fr 1fr}.canvas-value-map{grid-template-columns:minmax(0,1fr) 30px minmax(0,1fr)}.canvas-fit{transform:none}.canvas-zone-preview{display:block}.canvas-board--experiment .canvas-notes{max-height:none!important;overflow:visible!important}}';
await writeFile('src/canvas-print-style.json',JSON.stringify(canvasPrintBase+canvasScreenCss+canvasPrintOverrides));
await build({entryPoints:['src/app.js','src/preview.js','src/chat-preview-worker.js','src/pdf-preview.js','src/lab-worker.js','src/vector-worker.js'],outdir:'public/assets',bundle:true,format:'esm',target:'es2022',minify:true,legalComments:'eof'});
// Keep the loader as a separate ESM file so import.meta.url resolves its local WASM binary.
await build({entryPoints:['src/php-runtime.js'],outfile:'public/assets/runtime/php/runtime.js',bundle:true,format:'esm',target:'es2022',minify:true,
  external:['worker_threads','../node_modules/@php-wasm/web-8-4/asyncify/php_8_4.js'],legalComments:'eof'});
let runtime=await readFile('public/assets/runtime/php/runtime.js','utf8');
runtime=runtime.replaceAll('../node_modules/@php-wasm/web-8-4/asyncify/php_8_4.js','./loader.js');
await writeFile('public/assets/runtime/php/runtime.js',runtime);
await copyFile('node_modules/@php-wasm/web-8-4/asyncify/php_8_4.js','public/assets/runtime/php/loader.js');
await copyFile('node_modules/@php-wasm/web-8-4/asyncify/8_4_25/php_8_4.wasm','public/assets/runtime/php/8_4_25/php_8_4.wasm');
for(const name of ['pyodide.js','pyodide.asm.js','pyodide.asm.wasm','python_stdlib.zip','pyodide-lock.json'])await copyFile('node_modules/pyodide/'+name,'public/assets/runtime/python/'+name);
await mkdir('public/assets/runtime/pdf',{recursive:true});
await copyFile('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/assets/runtime/pdf/pdf.worker.mjs');
await cp('node_modules/pdfjs-dist/standard_fonts','public/assets/runtime/pdf/fonts',{recursive:true});
const licenses=[];
for(const pkg of ['@php-wasm/universal','@php-wasm/web-8-4','codemirror','@codemirror/view','@codemirror/collab','fflate','pdfjs-dist']){
  try {licenses.push(pkg+'\n'+await readFile('node_modules/'+pkg+'/LICENSE','utf8'));}catch{}
}
await writeFile('public/assets/THIRD-PARTY-LICENSES.txt',licenses.join('\n\n'));
async function files(dir){let out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);out.push(...e.isDirectory()?await files(p):[p]);}return out;}
const sums={};for(const p of [...await files('public/assets'),...await files('app/certs')])sums[p]=createHash('sha256').update(await readFile(p)).digest('hex');
await writeFile('docs/asset-integrity.json',JSON.stringify(sums,null,2)+'\n');
console.log('Ready-to-run assets built. No npm or Composer required on the server.');
