// This trusted controller lives in an opaque-origin iframe. Learner code only runs in its worker.
const origin=new URL(import.meta.url).origin;
let port,worker;
addEventListener('message',event=>{
  if(event.source!==parent || event.origin!==origin || event.data?.type!=='connect' || !event.ports[0] || port)return;
  port=event.ports[0];
  port.onmessage=async ({data})=>{
    if(data?.type==='lab.response'){worker?.postMessage(data);return;}
    if(data?.type!=='run' || !['php','python','javascript'].includes(data.language))return;
    worker?.terminate();
    const source=`
const origin=${JSON.stringify(origin)};
let academySequence=0;const academyPending=new Map();
const academyRequest=(op,args)=>new Promise((resolve,reject)=>{if(++academySequence>100)return reject(Error('Höchstens 100 Academy-Aufrufe pro Run.'));const id=academySequence;academyPending.set(id,{resolve,reject});postMessage({type:'lab.request',id,op,args});});
onmessage=async ({data})=>{
  if(data?.type==='lab.response'){const pending=academyPending.get(data.id);if(pending){academyPending.delete(data.id);pending.resolve(data.result);}return;}
  try {
    let result='';
    globalThis.academy=(0,eval)('('+data.academy+')')(async(op,args)=>{const r=await academyRequest(op,args);if(r.error)throw Error(r.error);return r.value;});
    globalThis.academyRequest=async(op,args)=>JSON.stringify(await academyRequest(op,JSON.parse(args)));
    if(data.language==='python') {
      postMessage({type:'progress',message:'Python: Loader'});
      // Preload the module before Pyodide starts parallel WASM/stdlib fetches.
      // This also avoids a synchronous importScripts deadlock on single-worker preview servers.
      importScripts(origin+'/assets/runtime/python/pyodide.js',origin+'/assets/runtime/python/pyodide.asm.js');
      postMessage({type:'progress',message:'Python: WebAssembly und Standardbibliothek'});
      const py=await loadPyodide({indexURL:origin+'/assets/runtime/python/'});
      postMessage({type:'ready'});
      py.FS.mkdirTree('/workspace');
      for(const f of data.files){py.FS.mkdirTree('/workspace/'+f.path.split('/').slice(0,-1).join('/'));py.FS.writeFile('/workspace/'+f.path,f.content);}
      py.FS.writeFile('/workspace/academy.py',data.pythonAcademy);
      py.FS.chdir('/workspace');
      const output=s=>{if(result.length>100000)throw Error('Ausgabelimit erreicht.');result+=s+'\\n';};
      py.setStdout({batched:output});py.setStderr({batched:output});
      py.globals.set('__entry__','/workspace/'+data.path);
      await py.runPythonAsync("import ast, sys\\nsys.path.insert(0, '/workspace')\\nawait eval(compile(open(__entry__).read(), __entry__, 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT), {'__name__':'__main__'}) if compile(open(__entry__).read(), __entry__, 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT).co_flags & 128 else exec(compile(open(__entry__).read(), __entry__, 'exec'), {'__name__':'__main__'})");
      postMessage({type:'result',output:result.slice(0,100000)});
    } else if(data.language==='php') {
      const {PHP,loadPHPRuntime,loader}=await import(origin+'/assets/runtime/php/runtime.js');
      const php=new PHP(await loadPHPRuntime(loader));
      php.mkdir('/workspace');
      for(const f of data.files){const parts=f.path.split('/');parts.pop();let d='/workspace';for(const p of parts){d+='/'+p;if(!php.isDir(d))php.mkdir(d);}php.writeFile('/workspace/'+f.path,f.content);}
      php.onMessage(async message=>{try{const request=JSON.parse(message);return JSON.stringify(await academyRequest(request.op,request.args));}catch(e){return JSON.stringify({error:e.message});}});
      php.chdir('/workspace');
      postMessage({type:'ready'});
      const query=new URLSearchParams(data.query||'');
      const code='<?php require_once \"/workspace/academy.php\"; ini_set("memory_limit","64M"); ini_set("display_errors","1"); ini_set("max_execution_time","5"); $_GET=json_decode('+JSON.stringify(JSON.stringify(Object.fromEntries(query)))+',true); $_SERVER["REQUEST_METHOD"]="GET"; $_SERVER["SCRIPT_NAME"]='+JSON.stringify('/'+data.path)+'; chdir('+JSON.stringify('/workspace/'+data.path.split('/').slice(0,-1).join('/'))+'); require '+JSON.stringify('/workspace/'+data.path)+';';
      const response=await php.run({code});
      postMessage({type:'result',output:response.text.slice(0,100000),errors:response.errors?.slice(0,10000)||'',html:true});
    } else {
      postMessage({type:'ready'});
      const lines=[];const write=(...args)=>{if(lines.join('').length>100000)throw Error('Ausgabelimit erreicht.');lines.push(args.map(v=>typeof v==='string'?v:JSON.stringify(v)).join(' '));};
      console.log=console.info=console.warn=console.error=write;
      const f=data.files.find(f=>f.path===data.path);
      await (new (Object.getPrototypeOf(async function(){}).constructor)('academy',f.content))(globalThis.academy);
      postMessage({type:'result',output:lines.join('\\n').slice(0,100000)});
    }
  } catch(e){postMessage({type:'error',error:String(e.message||e).slice(0,10000)});}
};`;
    const blob=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    try{worker=new Worker(blob);}catch(e){port.postMessage({type:'error',error:String(e)});return;}URL.revokeObjectURL(blob);
    worker.onmessage=e=>port.postMessage(e.data);
    worker.onerror=()=>port.postMessage({type:'error',error:'Die Laufzeit konnte nicht gestartet werden.'});
    worker.postMessage(data);
  };
  port.start();port.postMessage({type:'connected'});
});
parent.postMessage({type:'sandbox-loaded'},'*');
