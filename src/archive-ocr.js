import {ocrOptions,ocrImageDimensions,ocrFit,OCR_LIMITS} from './archive-ocr-policy.js';
export function createOCRSession(language,{signal,onProgress=()=>{},workerFactory=()=>new Worker('/assets/archive-ocr-worker.js',{type:'module'})}={}){
 ocrOptions({language});let worker,sequence=0,closed=false;const pending=new Map();
 const close=(reason=new DOMException('Texterkennung abgebrochen.','AbortError'))=>{if(closed)return;closed=true;signal?.removeEventListener('abort',abort);worker?.terminate();for(const p of pending.values()){clearTimeout(p.timer);p.reject(reason);}pending.clear();};
 const abort=()=>close(signal.reason instanceof Error?signal.reason:new DOMException('Texterkennung abgebrochen.','AbortError'));
 if(signal?.aborted){abort();throw signal.reason||new DOMException('Abgebrochen.','AbortError');}
 worker=workerFactory();signal?.addEventListener('abort',abort,{once:true});
 worker.onmessage=({data})=>{if(closed)return;if(data.type==='progress'){onProgress(data);return;}const p=pending.get(data.id);if(!p)return;pending.delete(data.id);clearTimeout(p.timer);if(data.type==='error')p.reject(Error(p.type==='init'?'Die lokale OCR-Engine konnte nicht geladen werden. Bitte erneut versuchen.':'Die lokale Texterkennung ist fehlgeschlagen. Datei oder Ausrichtung prüfen und erneut versuchen.'));else p.resolve(data);};
 worker.onerror=()=>close(Error('Die lokale OCR-Engine konnte nicht geladen werden. Bitte erneut versuchen.'));
 function request(type,data={},transfer=[]){if(closed)return Promise.reject(new DOMException('Texterkennung beendet.','AbortError'));return new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>close(Error('Die Texterkennung dauert zu lange. Einen kleineren Auszug verwenden.')),60000);pending.set(id,{resolve,reject,timer,type});worker.postMessage({id,type,...data},transfer);});}
 const ready=request('init',{language});ready.catch(()=>{});
 return {async recognize(blob){await ready;const image=await blob.arrayBuffer();if(signal?.aborted||closed)throw new DOMException('Abgebrochen.','AbortError');return request('recognize',{image},[image]);},close,ready};
}
export async function prepareOCRImage(file,rotation=0,{signal}={}){
 if(file.size>OCR_LIMITS.bytes)throw Error('Bis zu 5 MB je Datei.');const bytes=await file.arrayBuffer();ocrImageDimensions(bytes);signal?.throwIfAborted();
 const image=await createImageBitmap(new Blob([bytes]));let canvas;
 try{signal?.throwIfAborted();if(image.width*image.height>OCR_LIMITS.pixels)throw Error('Das Bild hat mehr als 24 Megapixel. Vor dem Import verkleinern.');const fit=ocrFit(image.width,image.height),swapped=rotation===90||rotation===270;canvas=document.createElement('canvas');canvas.width=swapped?fit.height:fit.width;canvas.height=swapped?fit.width:fit.height;const g=canvas.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,canvas.width,canvas.height);g.translate(canvas.width/2,canvas.height/2);g.rotate(rotation*Math.PI/180);g.drawImage(image,-fit.width/2,-fit.height/2,fit.width,fit.height);return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Das Bild konnte nicht vorbereitet werden.')),'image/png'));}finally{image.close();if(canvas)canvas.width=canvas.height=0;}
}
