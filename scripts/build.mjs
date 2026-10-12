import {build} from 'esbuild';
import {mkdir,copyFile,readdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
process.chdir(root);
await mkdir('public/assets/runtime/php/8_4_25',{recursive:true});
await mkdir('public/assets/runtime/python',{recursive:true});
await build({entryPoints:['src/app.js','src/preview.js'],outdir:'public/assets',bundle:true,format:'esm',target:'es2022',minify:true,legalComments:'eof'});
// Keep the loader as a separate ESM file so import.meta.url resolves its local WASM binary.
await build({entryPoints:['src/php-runtime.js'],outfile:'public/assets/runtime/php/runtime.js',bundle:true,format:'esm',target:'es2022',minify:true,
  external:['worker_threads','../node_modules/@php-wasm/web-8-4/asyncify/php_8_4.js'],legalComments:'eof'});
let runtime=await readFile('public/assets/runtime/php/runtime.js','utf8');
runtime=runtime.replaceAll('../node_modules/@php-wasm/web-8-4/asyncify/php_8_4.js','./loader.js');
await writeFile('public/assets/runtime/php/runtime.js',runtime);
await copyFile('node_modules/@php-wasm/web-8-4/asyncify/php_8_4.js','public/assets/runtime/php/loader.js');
await copyFile('node_modules/@php-wasm/web-8-4/asyncify/8_4_25/php_8_4.wasm','public/assets/runtime/php/8_4_25/php_8_4.wasm');
for(const name of ['pyodide.js','pyodide.asm.js','pyodide.asm.wasm','python_stdlib.zip','pyodide-lock.json'])await copyFile('node_modules/pyodide/'+name,'public/assets/runtime/python/'+name);
const licenses=[];
for(const pkg of ['@php-wasm/universal','@php-wasm/web-8-4','codemirror','@codemirror/view']){
  try {licenses.push(pkg+'\n'+await readFile('node_modules/'+pkg+'/LICENSE','utf8'));}catch{}
}
await writeFile('public/assets/THIRD-PARTY-LICENSES.txt',licenses.join('\n\n'));
async function files(dir){let out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);out.push(...e.isDirectory()?await files(p):[p]);}return out;}
const sums={};for(const p of await files('public/assets'))sums[p]=createHash('sha256').update(await readFile(p)).digest('hex');
await writeFile('docs/asset-integrity.json',JSON.stringify(sums,null,2)+'\n');
console.log('Ready-to-run assets built. No npm or Composer required on the server.');
