import {loadPreviewAssets} from './preview-assets.js';
import {execute,createPreviewFrame} from './runner.js';
const params=new URLSearchParams(location.search),project=params.get('project');let path=params.get('path'),files,job,assets=[],csrf;
const target=document.querySelector('#preview-content'),status=document.querySelector('#preview-status');
async function rpc(op,args){const response=await fetch('/api/?action=lab.rpc',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({project,op,args})});const data=await response.json();if(!response.ok)throw Error(data.error);return data;}
async function run(query='') {
  job?.stop();status.textContent='Vorschau wird geladen …';
  try {
    const entry=files.find(f=>f.path===path);if(!entry)throw Error('Datei nicht gefunden.');
    let content=entry.content;
    if(path.endsWith('.php')){job=execute('php',files,path,phase=>status.textContent=phase==='loading'?'PHP wird geladen …':'PHP läuft …',query,rpc);content=(await job.promise).output;}
    target.replaceChildren(createPreviewFrame(content,files,path,assets,rpc));
    status.textContent=path;document.title=path+' — Vorschau';
  } catch(e){status.textContent=e.message;}
}
addEventListener('message',e=>{
  if(e.source!==target.querySelector('iframe')?.contentWindow||e.origin!=='null'||e.data?.type!=='workspace-navigate'||typeof e.data.href!=='string')return;
  const url=new URL(e.data.href,'https://workspace.invalid/'+path);if(url.origin!=='https://workspace.invalid')return;
  const next=decodeURIComponent(url.pathname.slice(1));if(!/\.(html?|php)$/.test(next))return;path=next;run(url.search.slice(1));
});
document.querySelector('#refresh-preview').onclick=()=>run();
try {
  const boot=await fetch('/api/?action=bootstrap').then(r=>r.json());csrf=boot.csrf;if(!boot.user)throw Error('Bitte melden Sie sich zuerst in der Lernumgebung an.');
  const response=await fetch('/api/?action=project.bundle',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':boot.csrf},body:JSON.stringify({project})});
  const data=await response.json();if(!response.ok)throw Error(data.error);files=data.files;assets=await loadPreviewAssets(data.assets);await run();
} catch(e){status.textContent=e.message;}
