// This trusted controller lives in an opaque-origin iframe. Learner code only runs in its worker.
const origin=new URL(import.meta.url).origin;
let port,worker;
addEventListener('message',event=>{
  if(event.source!==parent || event.origin!==origin || event.data?.type!=='connect' || !event.ports[0] || port)return;
  port=event.ports[0];
  port.onmessage=async ({data})=>{
    if(data?.type!=='run' || !['php','python','javascript'].includes(data.language))return;
    worker?.terminate();
    const source=`
const origin=${JSON.stringify(origin)};
onmessage=async ({data})=>{
  try {
    let result='';
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
      py.FS.chdir('/workspace');
      const output=s=>{if(result.length>100000)throw Error('Ausgabelimit erreicht.');result+=s+'\\n';};
      py.setStdout({batched:output});py.setStderr({batched:output});
      py.globals.set('__entry__','/workspace/'+data.path);
      await py.runPythonAsync("import runpy, sys\\nsys.path.insert(0, '/workspace')\\nrunpy.run_path(__entry__, run_name='__main__')");
      postMessage({type:'result',output:result.slice(0,100000)});
    } else if(data.language==='php') {
      const {PHP,loadPHPRuntime,loader}=await import(origin+'/assets/runtime/php/runtime.js');
      const php=new PHP(await loadPHPRuntime(loader));
      php.mkdir('/workspace');
      for(const f of data.files){const parts=f.path.split('/');parts.pop();let d='/workspace';for(const p of parts){d+='/'+p;if(!php.isDir(d))php.mkdir(d);}php.writeFile('/workspace/'+f.path,f.content);}
      php.chdir('/workspace');
      postMessage({type:'ready'});
      const query=new URLSearchParams(data.query||'');
      const code='<?php ini_set("memory_limit","64M"); ini_set("display_errors","1"); ini_set("max_execution_time","5"); $_GET=json_decode('+JSON.stringify(JSON.stringify(Object.fromEntries(query)))+',true); $_SERVER["REQUEST_METHOD"]="GET"; $_SERVER["SCRIPT_NAME"]='+JSON.stringify('/'+data.path)+'; chdir('+JSON.stringify('/workspace/'+data.path.split('/').slice(0,-1).join('/'))+'); require '+JSON.stringify('/workspace/'+data.path)+';';
      const response=await php.run({code});
      postMessage({type:'result',output:response.text.slice(0,100000),errors:response.errors?.slice(0,10000)||'',html:true});
    } else {
      postMessage({type:'ready'});
      const lines=[];const write=(...args)=>{if(lines.join('').length>100000)throw Error('Ausgabelimit erreicht.');lines.push(args.map(v=>typeof v==='string'?v:JSON.stringify(v)).join(' '));};
      console.log=console.info=console.warn=console.error=write;
      const f=data.files.find(f=>f.path===data.path);
      (0,eval)(f.content);
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
