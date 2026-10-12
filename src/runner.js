export function execute(language,files,path,onPhase=()=>{},query='') {
  let frame,port,timer,abort,readyOnce=false;
  const promise=new Promise((resolve,reject)=>{
    frame=document.createElement('iframe');frame.sandbox='allow-scripts';frame.src='/sandbox/';frame.hidden=true;frame.setAttribute('aria-hidden','true');
    const cleanup=()=>{clearTimeout(timer);port?.close();frame?.remove();removeEventListener('message',loaded);};
    const finish=(value,error)=>{cleanup();error?reject(new Error(error)):resolve(value);};
    abort=()=>finish(null,'Ausführung gestoppt.');
    const deadline=(ms)=>{clearTimeout(timer);timer=setTimeout(()=>finish(null,'Zeitlimit erreicht. Die Ausführung wurde beendet.'),ms);};
    const loaded=event=>{
      if(event.source!==frame.contentWindow || event.origin!=='null' || event.data?.type!=='sandbox-loaded')return;
      const channel=new MessageChannel();port=channel.port1;
      port.onmessage=({data})=>{
        if(data.type==='progress')onPhase(data.message);
        if(data.type==='connected')port.postMessage({type:'run',language,files,path,query});
        if(data.type==='ready'&&!readyOnce){readyOnce=true;onPhase('running');deadline(8000);}
        if(data.type==='result'&&typeof data.output==='string')finish({output:data.output.slice(0,100000),errors:typeof data.errors==='string'?data.errors.slice(0,10000):''});
        if(data.type==='error')finish(null,String(data.error).slice(0,10000));
      };
      frame.contentWindow.postMessage({type:'connect'},'*',[channel.port2]);
    };
    addEventListener('message',loaded);document.body.append(frame);deadline(60000);onPhase('loading');
  });
  return {promise,stop:()=>abort?.()};
}

export function previewDocument(content,files,path) {
  const doc=new DOMParser().parseFromString(content,'text/html');
  const paths=new Map(files.map(f=>[f.path,f.content]));
  const relative=(url)=>{
    try {const base=new URL('https://workspace.invalid/'+path);const target=new URL(url,base);if(target.origin!==base.origin)return null;return decodeURIComponent(target.pathname.slice(1));}catch{return null;}
  };
  doc.querySelectorAll('base,meta[http-equiv],iframe,object,embed').forEach(e=>e.remove());
  for(const link of doc.querySelectorAll('link[rel="stylesheet"]')) {
    const file=paths.get(relative(link.getAttribute('href')));
    if(file!==undefined){const style=doc.createElement('style');style.textContent=file;link.replaceWith(style);}else link.remove();
  }
  for(const script of doc.querySelectorAll('script[src]')) {
    const file=paths.get(relative(script.getAttribute('src')));
    if(file!==undefined){script.removeAttribute('src');script.textContent=file;}else script.remove();
  }
  const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';
  policy.content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'";
  doc.head.prepend(policy);
  const bridge=doc.createElement('script');bridge.textContent=`document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const href=a.getAttribute('href');if(href.startsWith('#'))return;e.preventDefault();parent.postMessage({type:'workspace-navigate',href},'*');});document.addEventListener('submit',e=>{e.preventDefault();if(e.target.method.toLowerCase()!=='get'){alert('Die Vorschau unterstützt GET-Formulare.');return;}const query=new URLSearchParams(new FormData(e.target));parent.postMessage({type:'workspace-navigate',href:(e.target.getAttribute('action')||'')+'?'+query},'*');});`;
  doc.head.insertBefore(bridge,policy.nextSibling);
  return '<!doctype html>\n'+doc.documentElement.outerHTML;
}
export function createPreviewFrame(content,files,path) {
  const frame=document.createElement('iframe');frame.className='output-frame';frame.title='Website-Vorschau';frame.sandbox='allow-scripts';frame.src='/sandbox/view.php';frame.dataset.path=path;
  const html=previewDocument(content,files,path);
  const ready=e=>{if(e.source===frame.contentWindow&&e.origin==='null'&&e.data?.type==='renderer-ready'){removeEventListener('message',ready);frame.contentWindow.postMessage({type:'render',html},'*');}};
  addEventListener('message',ready);frame.addEventListener('load',()=>{if(!frame.isConnected)removeEventListener('message',ready);});
  return frame;
}
export async function renderPreview(target,files,path,onPhase=()=>{},query='') {
  const entry=files.find(f=>f.path===path);if(!entry)throw Error('Die Startdatei wurde nicht gefunden.');
  const language=path.endsWith('.php')?'php':path.endsWith('.py')?'python':path.endsWith('.js')?'javascript':'html';
  let content=entry.content,errors='',job;
  if(language!=='html'){job=execute(language,files,path,onPhase,query);const result=await job.promise;content=result.output;errors=result.errors;}
  target.replaceChildren();
  if(language==='php'||language==='html') {target.append(createPreviewFrame(content,files,path));}
  else {const pre=document.createElement('pre');pre.textContent=content||'Das Script wurde ohne Ausgabe beendet.';target.append(pre);}
  return {job,errors};
}
