import {academyClient,pythonAcademy} from './academy.js';
import {imageURL,cssImages} from './preview-assets.js';
export function execute(language,files,path,onPhase=()=>{},query='',rpc=null) {
  let frame,port,timer,wallTimer,abort,readyOnce=false;
  const promise=new Promise((resolve,reject)=>{
    frame=document.createElement('iframe');frame.sandbox='allow-scripts';frame.src='/sandbox/';frame.hidden=true;frame.setAttribute('aria-hidden','true');
    const cleanup=()=>{clearTimeout(timer);clearTimeout(wallTimer);port?.close();frame?.remove();removeEventListener('message',loaded);};
    const finish=(value,error)=>{cleanup();error?reject(new Error(error)):resolve(value);};
    abort=()=>finish(null,'Ausführung gestoppt.');
    const deadline=(ms)=>{clearTimeout(timer);timer=setTimeout(()=>finish(null,'Zeitlimit erreicht. Die Ausführung wurde beendet.'),ms);};
    const loaded=event=>{
      if(event.source!==frame.contentWindow || event.origin!=='null' || event.data?.type!=='sandbox-loaded')return;
      const channel=new MessageChannel();port=channel.port1;
      port.onmessage=async({data})=>{
        if(data.type==='progress')onPhase(data.message);
        if(data.type==='lab.request'){deadline(data.op==='ai'?55000:8000);if(!rpc||typeof data.op!=='string')return port.postMessage({type:'lab.response',id:data.id,result:{error:'Kein Projektzugriff in dieser Vorschau.'}});try{const result=await rpc(data.op,data.args);port?.postMessage({type:'lab.response',id:data.id,result});deadline(8000);}catch(e){port?.postMessage({type:'lab.response',id:data.id,result:{error:e.message}});}return;}
        if(data.type==='connected')port.postMessage({type:'run',language,files,path,query,academy:academyClient.toString(),pythonAcademy});
        if(data.type==='ready'&&!readyOnce){readyOnce=true;onPhase('running');wallTimer=setTimeout(()=>finish(null,'Gesamtzeitlimit erreicht.'),90000);deadline(8000);}
        if(data.type==='result'&&typeof data.output==='string')finish({output:data.output.slice(0,100000),errors:typeof data.errors==='string'?data.errors.slice(0,10000):''});
        if(data.type==='error')finish(null,String(data.error).slice(0,10000));
      };
      frame.contentWindow.postMessage({type:'connect'},'*',[channel.port2]);
    };
    addEventListener('message',loaded);document.body.append(frame);deadline(60000);onPhase('loading');
  });
  return {promise,stop:()=>abort?.()};
}

export function previewDocument(content,files,path,assets=[]) {
  const doc=new DOMParser().parseFromString(content,'text/html');
  const paths=new Map(files.map(f=>[f.path,f.content]));
  const relative=(url)=>{
    try {const base=new URL('https://workspace.invalid/'+path);const target=new URL(url,base);if(target.origin!==base.origin)return null;return decodeURIComponent(target.pathname.slice(1));}catch{return null;}
  };
  doc.querySelectorAll('base,meta[http-equiv],iframe,object,embed').forEach(e=>e.remove());
  for(const link of doc.querySelectorAll('link[rel="stylesheet"]')) {
    const file=paths.get(relative(link.getAttribute('href')));
    if(file!==undefined){const style=doc.createElement('style');style.textContent=cssImages(file,relative(link.getAttribute('href')),assets);style.dataset.workspaceCss='true';link.replaceWith(style);}else link.remove();
  }
  for(const script of doc.querySelectorAll('script[src]')) {
    const file=paths.get(relative(script.getAttribute('src')));
    if(file!==undefined){script.removeAttribute('src');script.textContent=file;}else script.remove();
  }
  for(const el of doc.querySelectorAll('img[src],input[type="image"][src]'))el.setAttribute('src',imageURL(el.getAttribute('src'),path,assets));
  for(const el of doc.querySelectorAll('[poster]'))el.setAttribute('poster',imageURL(el.getAttribute('poster'),path,assets));
  for(const el of doc.querySelectorAll('img[srcset],source[srcset]')){const value=el.getAttribute('srcset');if(!value.includes('data:'))el.setAttribute('srcset',value.split(',').map(candidate=>candidate.trim().replace(/^(\S+)/,url=>imageURL(url,path,assets))).join(', '));}
  for(const el of doc.querySelectorAll('link[rel~="icon"]'))el.setAttribute('href',imageURL(el.getAttribute('href'),path,assets));
  for(const style of doc.querySelectorAll('style:not([data-workspace-css])'))style.textContent=cssImages(style.textContent,path,assets);
  for(const el of doc.querySelectorAll('[style]'))el.setAttribute('style',cssImages(el.getAttribute('style'),path,assets));
  const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';
  policy.content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'";
  doc.head.prepend(policy);
  const bridge=doc.createElement('script');bridge.textContent=`document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const href=a.getAttribute('href');if(href.startsWith('#'))return;e.preventDefault();parent.postMessage({type:'workspace-navigate',href},'*');});document.addEventListener('submit',e=>{e.preventDefault();if(e.target.method.toLowerCase()!=='get'){alert('Die Vorschau unterstützt GET-Formulare.');return;}const query=new URLSearchParams(new FormData(e.target));parent.postMessage({type:'workspace-navigate',href:(e.target.getAttribute('action')||'')+'?'+query},'*');});`;
  doc.head.insertBefore(bridge,policy.nextSibling);
  const academy=doc.createElement('script');academy.textContent=`(()=>{let seq=0;const pending=new Map();globalThis.academy=(${academyClient.toString()})(async(op,args)=>{if(++seq>100)throw Error('Höchstens 100 Academy-Aufrufe je Vorschau.');return new Promise((resolve,reject)=>{const id=seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Academy-Anfrage abgelaufen.'));},op==='ai'?55000:15000);pending.set(id,{resolve,reject,timer});parent.postMessage({type:'academy-preview-request',id,op,args},'*');});});addEventListener('message',e=>{if(e.source!==parent||e.origin!==${JSON.stringify(location.origin)}||e.data?.type!=='academy-preview-response')return;const p=pending.get(e.data.id);if(!p)return;pending.delete(e.data.id);clearTimeout(p.timer);e.data.result.error?p.reject(Error(e.data.result.error)):p.resolve(e.data.result.value);});})();`;
  doc.head.insertBefore(academy,bridge.nextSibling);
  return '<!doctype html>\n'+doc.documentElement.outerHTML;
}
export function createPreviewFrame(content,files,path,assets=[],rpc=null) {
  const frame=document.createElement('iframe');frame.className='output-frame';frame.title='Website-Vorschau';frame.sandbox='allow-scripts';frame.src='/sandbox/view.php';frame.dataset.path=path;
  const html=previewDocument(content,files,path,assets);
  const ready=e=>{if(e.source===frame.contentWindow&&e.origin==='null'&&e.data?.type==='renderer-ready'){removeEventListener('message',ready);frame.contentWindow.postMessage({type:'render',html},'*');}};
  addEventListener('message',ready);frame.addEventListener('load',()=>{if(!frame.isConnected)removeEventListener('message',ready);});
  const controller=new AbortController();let requests=0;
  addEventListener('message',async e=>{if(!frame.isConnected||e.source!==frame.contentWindow||e.origin!=='null'||e.data?.type!=='academy-preview-request')return;const {id,op,args}=e.data;let result;try{if(!rpc)throw Error('Kein Projektzugriff in dieser Vorschau.');if(++requests>100)throw Error('Höchstens 100 Academy-Aufrufe je Vorschau.');result=await rpc(op,args);}catch(error){result={error:error.message};}if(frame.isConnected)frame.contentWindow.postMessage({type:'academy-preview-response',id,result},'*');},{signal:controller.signal});
  const observer=new MutationObserver(()=>{if(!frame.isConnected){controller.abort();removeEventListener('message',ready);observer.disconnect();}});queueMicrotask(()=>{if(frame.isConnected)observer.observe(document.body,{subtree:true,childList:true});else controller.abort();});
  return frame;
}
export async function renderPreview(target,files,path,onPhase=()=>{},query='',assets=[]) {
  const entry=files.find(f=>f.path===path);if(!entry)throw Error('Die Startdatei wurde nicht gefunden.');
  const language=path.endsWith('.php')?'php':path.endsWith('.py')?'python':path.endsWith('.js')?'javascript':'html';
  let content=entry.content,errors='',job;
  if(language!=='html'){job=execute(language,files,path,onPhase,query);const result=await job.promise;content=result.output;errors=result.errors;}
  target.replaceChildren();
  if(language==='php'||language==='html') {target.append(createPreviewFrame(content,files,path,assets));}
  else {const pre=document.createElement('pre');pre.textContent=content||'Das Script wurde ohne Ausgabe beendet.';target.append(pre);}
  return {job,errors};
}
