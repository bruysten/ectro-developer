export function previewAttachment(file,root,sourceURL='/chat-file.php?'+new URLSearchParams({id:file.id})){
  root.textContent='Vorschau wird geladen …';const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);let worker,url,pdfCleanup;
  const cleanup=()=>{controller.abort();clearTimeout(timeout);worker?.terminate();pdfCleanup?.();if(url)URL.revokeObjectURL(url);};
  const run=async()=>{
  try {
    const response=await fetch(sourceURL,{credentials:'same-origin',signal:controller.signal});
    if(!response.ok){const data=await response.json();throw Error(data.error||'Die Datei ist nicht verfügbar.');}
    const blob=await response.blob();if(controller.signal.aborted)return cleanup;
    const ext=file.extension;
    if(ext==='pdf'){const pdfModule='/assets/pdf-preview.js';const {renderPDF}=await import(pdfModule);pdfCleanup=await renderPDF(blob,root,controller.signal);
    } else if(['png','apng','jpg','jpeg','jpe','jfif','gif','webp','avif','bmp','ico'].includes(ext)){
      const types={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',avif:'image/avif',apng:'image/png',bmp:'image/bmp',ico:'image/x-icon',jpe:'image/jpeg',jfif:'image/jpeg'};
      url=URL.createObjectURL(new Blob([blob],{type:types[ext]}));
      const frame=document.createElement(ext==='pdf'?'iframe':'img');frame.src=url;frame.className='chat-preview-media';frame.title=file.name;if(ext==='pdf')frame.setAttribute('sandbox','');else{frame.alt=file.name;frame.onerror=()=>{root.textContent='Dieses Bildformat kann der Browser nicht darstellen. Bitte das Original herunterladen.';};}root.replaceChildren(frame);
    } else if(['docx','docm','dotx','dotm','xlsx','xlsm','xltx','xltm','pptx','pptm','potx','potm','ppsx','ppsm','odt','ods','odp','odg'].includes(ext)){
      worker=new Worker('/assets/chat-preview-worker.js',{type:'module'});
      const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{worker.terminate();reject(Error('Die Textvorschau dauert zu lange. Bitte das Original herunterladen.'));},5000);worker.onmessage=e=>{clearTimeout(timer);resolve(e.data);};worker.onerror=()=>{clearTimeout(timer);reject(Error('Die Textvorschau ist nicht verfügbar.'));};blob.arrayBuffer().then(bytes=>worker.postMessage(bytes,[bytes]),reject);});
      worker.terminate();if(result.error)throw Error(result.error);
      const parse=xml=>{if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Dieses Dokument kann nicht als Textvorschau geöffnet werden.');const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw Error('Die Dokumentstruktur ist ungültig.');return doc;};
      let strings=[];const shared=result.parts.find(p=>p.name==='xl/sharedStrings.xml');if(shared)strings=[...parse(shared.xml).getElementsByTagNameNS('*','si')].map(el=>el.textContent);
      const text=result.parts.filter(p=>p.name!=='xl/sharedStrings.xml').sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).map(part=>{
        const doc=parse(part.xml);
        if(part.name.startsWith('xl/'))return [...doc.getElementsByTagNameNS('*','row')].map(row=>[...row.getElementsByTagNameNS('*','c')].map(cell=>{const v=cell.getElementsByTagNameNS('*','v')[0]?.textContent||cell.textContent;return cell.getAttribute('t')==='s'?strings[Number(v)]??'':v;}).join('\t')).join('\n');
        const elements=[...doc.getElementsByTagName('*')];return elements.filter(el=>['p','h'].includes(el.localName)).map(el=>el.textContent).join('\n');
      }).join('\n\n');
      const note=document.createElement('p');note.className='muted';note.textContent='Textvorschau · Layout, Bilder und Formatierung finden Sie im Original.';const pre=document.createElement('pre');pre.textContent=text||'Dieses Dokument enthält keinen darstellbaren Text.';root.replaceChildren(note,pre);
    } else if(['txt','md','csv','tsv','json','php','html','htm','css','js','mjs','py','xml','sql','yaml','yml','svg','ipynb','log','rtf'].includes(ext)){
      if(blob.size>2097152)throw Error('Die Datei ist für die Textvorschau zu groß. Bitte herunterladen.');const pre=document.createElement('pre');pre.textContent=await blob.text();root.replaceChildren(pre);
    } else root.textContent='Für dieses Format ist keine Browser-Vorschau verfügbar. Laden Sie das Original herunter und öffnen Sie es in Ihrer Anwendung.';
  } catch(error){root.textContent=error.name==='AbortError'?'Die Vorschau wurde abgebrochen oder hat zu lange gedauert.':error.message;}
  finally{clearTimeout(timeout);}
  };void run();return cleanup;
}
