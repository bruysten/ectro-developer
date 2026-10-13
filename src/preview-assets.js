const IMAGE_MIMES=new Set(['image/png','image/jpeg','image/gif','image/webp','image/avif','image/bmp','image/x-icon','image/svg+xml']);
export function resolveProjectURL(url,path){
  try{const target=new URL(url,'https://workspace.invalid/'+path);if(target.origin!=='https://workspace.invalid')return null;return {path:decodeURIComponent(target.pathname.slice(1)),hash:target.hash};}catch{return null;}
}
export function imageURL(url,path,assets){
  const target=resolveProjectURL(url,path);if(!target)return url;
  const asset=assets.find(a=>a.path===target.path);return asset?asset.dataURL+target.hash:url;
}
export function cssImages(css,path,assets){
  return css.replace(/url\(\s*(?:(["'])(.*?)\1|([^)]*))\s*\)/gi,(match,quote,quoted,bare)=>{const original=(quoted??bare).trim(),replacement=imageURL(original,path,assets);return replacement===original?match:'url("'+replacement+'")';});
}
export async function loadPreviewAssets(metadata=[]){
  if(!metadata.length)return [];
  if(metadata.length>300)throw Error('Zu viele Bilder im Projekt.');
  const result=[];let next=0;
  const worker=async()=>{while(next<metadata.length){const asset=metadata[next++];if(!/^[a-f0-9]{32}$/.test(asset.id)||!IMAGE_MIMES.has(asset.mime)||typeof asset.path!=='string')throw Error('Ungültiges Projektbild.');
    const response=await fetch('/workspace-file.php?'+new URLSearchParams({id:asset.id}),{credentials:'same-origin',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Das Projektbild „'+asset.path+'“ ist nicht mehr verfügbar. Bitte Projekt und Berechtigung prüfen.');
    const blob=await response.blob();if(blob.size>20971520)throw Error('Das Projektbild ist zu groß.');
    const dataURL=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Das Bild konnte nicht gelesen werden.'));reader.readAsDataURL(new Blob([blob],{type:asset.mime}));});
    result.push({path:asset.path,dataURL});
  }};await Promise.all([worker(),worker()]);return result;
}
