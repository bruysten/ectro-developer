import {createWorker} from 'tesseract.js';
import {ocrOptions} from './archive-ocr-policy.js';
// This supervisor and its child worker are disposed together on cancellation,
// including while WASM/language data are still loading. Only same-origin assets.
let engine;
self.onmessage=async({data})=>{const {id,type}=data;try{
 if(type==='init'){const {language}=ocrOptions({language:data.language});const base=new URL('/assets/runtime/ocr/',self.location.origin).href;
  engine=await createWorker(language,1,{workerPath:base+'worker.min.js',workerBlobURL:false,corePath:base+'core',langPath:base+'lang',cacheMethod:'none',gzip:false,legacyCore:false,legacyLang:false,errorHandler:()=>self.postMessage({id,type:'error',error:'Die lokale OCR-Engine konnte nicht geladen werden.'}),logger:m=>self.postMessage({type:'progress',progress:m.progress,status:m.status})});
  await engine.setParameters({tessedit_pageseg_mode:'3',user_defined_dpi:'200'});self.postMessage({id,type:'done'});
 }else if(type==='recognize'&&engine){const {data:result}=await engine.recognize(new Uint8Array(data.image),{rotateAuto:true},{text:true});self.postMessage({id,type:'done',text:result.text,confidence:result.confidence});}
 else throw Error('OCR ist noch nicht bereit.');
 }catch(error){self.postMessage({id,type:'error',error:String(error?.message||error||'Die Texterkennung ist fehlgeschlagen.')});}};
