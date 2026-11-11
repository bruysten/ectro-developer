// Keep wide data tables local to their workspace, including tables mounted later.
// Existing lab-specific labels and keyboard stops remain authoritative.
let sequence=0;
export function watchTableOverflow(root){
 const entries=new Map();let frame=0,alive=true;
 const scan=()=>{
  frame=0;if(!alive)return;
  for(const [wrap,entry] of entries)if(!root.contains(wrap)){entry.observer.disconnect();entry.hint.remove();entry.restore();entries.delete(wrap);}
  for(const wrap of root.querySelectorAll('.table-wrap')){
   const table=wrap.querySelector('table');if(!table)continue;
   const existing=entries.get(wrap);if(existing){if(existing.table!==table){existing.observer.unobserve(existing.table);existing.observer.observe(table);existing.table=table;}existing.update();continue;}
   const hint=document.createElement('p');hint.className='table-scroll-hint';hint.id='table-scroll-'+(++sequence);hint.textContent='Tabelle seitlich scrollen';hint.hidden=true;wrap.before(hint);
   const original=Object.fromEntries(['tabindex','role','aria-label','aria-describedby'].map(key=>[key,wrap.getAttribute(key)]));
   const restore=()=>{for(const [key,value] of Object.entries(original))value===null?wrap.removeAttribute(key):wrap.setAttribute(key,value);};
   const label=wrap.closest('section')?.querySelector('h2,h3')?.textContent.trim()||'Datentabelle';
   const update=()=>{if(!alive)return;const scrolls=wrap.scrollWidth>wrap.clientWidth+1;hint.hidden=!scrolls;
    if(original.tabindex===null)scrolls?wrap.setAttribute('tabindex','0'):wrap.removeAttribute('tabindex');
    if(original.role===null)scrolls?wrap.setAttribute('role','region'):wrap.removeAttribute('role');
    if(original['aria-label']===null)scrolls?wrap.setAttribute('aria-label',label):wrap.removeAttribute('aria-label');
    const description=[original['aria-describedby'],scrolls?hint.id:''].filter(Boolean).join(' ');description?wrap.setAttribute('aria-describedby',description):wrap.removeAttribute('aria-describedby');
   };
   const observer=new ResizeObserver(update);observer.observe(wrap);observer.observe(table);entries.set(wrap,{observer,hint,table,update,restore});update();
  }
 };
 const mutations=new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(scan);});mutations.observe(root,{childList:true,subtree:true});scan();
 return()=>{alive=false;cancelAnimationFrame(frame);mutations.disconnect();for(const entry of entries.values()){entry.observer.disconnect();entry.hint.remove();entry.restore();}entries.clear();};
}
