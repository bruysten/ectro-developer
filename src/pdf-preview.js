import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/build/pdf.mjs';
GlobalWorkerOptions.workerSrc='/assets/runtime/pdf/pdf.worker.mjs';
// Text extraction shares the locally bundled PDF runtime; document scripts are never executed.
export async function extractPDFText(blob){
 if(blob.size>5*1024*1024)throw Error('PDF-Dateien dürfen höchstens 5 MB groß sein.');
 const task=getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false,enableXfa:false,useWasm:false,standardFontDataUrl:'/assets/runtime/pdf/fonts/'});
 let timer;
 try{return await Promise.race([(async()=>{const pdf=await task.promise;if(pdf.numPages>30)throw Error('Bis zu 30 PDF-Seiten. Einen kleineren Auszug importieren.');const parts=[];let length=0;for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent();const text=content.items.map(item=>(item.str||'')+(item.hasEOL?'\n':' ')).join('').trim();if(text){const part=`[Seite ${i}]\n${text}`;length+=part.length+2;if(length>12000)throw Error('Der PDF-Text ist länger als 12.000 Zeichen. Einen kleineren Auszug importieren.');parts.push(part);}page.cleanup();}return parts.join('\n\n');})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Das Auslesen dauert zu lange. Einen kleineren PDF-Auszug verwenden.')),15000);})]);}finally{clearTimeout(timer);await task.destroy();}
}
export async function renderPDF(blob,root,signal){
  const task=getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false,enableXfa:false,useWasm:false,standardFontDataUrl:'/assets/runtime/pdf/fonts/'});
  const abort=()=>task.destroy();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){task.destroy();throw Error('Vorschau geschlossen.');}
  let timer;const pdf=await Promise.race([task.promise,new Promise((_,reject)=>{timer=setTimeout(()=>{task.destroy();reject(Error('Die PDF-Vorschau dauert zu lange. Bitte das Original herunterladen.'));},15000);})]).finally(()=>clearTimeout(timer));
  const controls=document.createElement('div');controls.className='pdf-preview-controls';
  const previous=document.createElement('button'),next=document.createElement('button'),status=document.createElement('span');
  for(const [btn,label] of [[previous,'Vorherige Seite'],[next,'Nächste Seite']]){btn.type='button';btn.className='es-btn es-btn--sm es-btn--secondary';btn.textContent=label;}
  controls.append(previous,status,next);const canvas=document.createElement('canvas');canvas.className='pdf-preview-canvas';root.replaceChildren(controls,canvas);
  let page=1,renderTask,closed=false;
  const show=async()=>{previous.disabled=next.disabled=true;const item=await pdf.getPage(page);if(closed)return;const base=item.getViewport({scale:1}),viewport=item.getViewport({scale:Math.min(1.5,1600/Math.max(base.width,base.height))});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.setAttribute('aria-label',`PDF-Seite ${page} von ${pdf.numPages}`);status.textContent=`${page} / ${pdf.numPages}`;renderTask=item.render({canvasContext:canvas.getContext('2d'),viewport});await renderTask.promise;previous.disabled=page===1;next.disabled=page===pdf.numPages;};
  previous.onclick=()=>{page--;show().catch(()=>{status.textContent='Seite konnte nicht dargestellt werden.';});};next.onclick=()=>{page++;show().catch(()=>{status.textContent='Seite konnte nicht dargestellt werden.';});};
  try{await show();}catch(e){task.destroy();throw e;}
  return ()=>{signal?.removeEventListener('abort',abort);closed=true;renderTask?.cancel();task.destroy();};
}
