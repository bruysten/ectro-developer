import copy from '../app/address-copy.json' with {type:'json'};

let mode='formal';
const exact=new Map(),parts=new Map();
for(const entry of copy)for(const source of [entry.formal,entry.informal,...(entry.legacy||[])]){
  const target=entry.exact?exact:parts;target.set(source,entry);
}
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pattern=new RegExp('(?<![\\p{L}\\p{N}_])(?:'+[...parts.keys()].sort((a,b)=>b.length-a.length).map(escape).join('|')+')(?![\\p{L}\\p{N}_])','gu');
export function setAddressMode(value){mode=value==='informal'?'informal':'formal';}
export function getAddressMode(){return mode;}
export function addressPreview(value){return value==='informal'?'Du kannst hier lernen und ausprobieren.':'Sie können hier lernen und ausprobieren.';}
export function hasAddressCopy(text){pattern.lastIndex=0;return exact.has(text)||pattern.test(text);}
function literal(text){return exact.has(text)?exact.get(text)[mode]:text.replace(pattern,source=>parts.get(source)[mode]);}
// Only authored literal segments are translated. Interpolated values, including
// escaped user text, project data, source quotes and generated answers, are opaque.
export function ui(strings,...values){
  if(typeof strings==='string')return literal(strings);
  return strings.reduce((out,part,index)=>out+literal(part)+(index<values.length?values[index]:''),'');
}
export function uiError(message){
  if(typeof message!=='string')return message;
  for(const entry of copy.filter(e=>e.error))for(const source of [entry.formal,entry.informal,...(entry.legacy||[])]){
    if(message===source)return entry[mode];
    if(entry.prefix&&message.startsWith(source))return entry[mode]+message.slice(source.length);
  }return message;
}
