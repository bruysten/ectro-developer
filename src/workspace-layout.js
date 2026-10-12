export function resizeWorkspace(layout) {
  const split=layout.querySelector('.editor-split');
  const fileHandle=layout.querySelector('[data-resize="files"]');
  const outputHandle=layout.querySelector('[data-resize="output"]');
  const mobile=matchMedia('(max-width:560px)'),wide=matchMedia('(min-width:1600px)');
  const key='entrosphere:workspace-layout';
  const preferences={};let drag=null;
  try {const saved=JSON.parse(localStorage.getItem(key));for(const name of ['explorerWidth','explorerHeight','editorRows','editorColumns'])if(Number.isFinite(saved?.[name]))preferences[name]=saved[name];}catch{}
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function configuration(handle) {
    if(handle===fileHandle){
      const stacked=mobile.matches,total=layout.clientWidth-8;
      return {name:stacked?'explorerHeight':'explorerWidth',axis:stacked?'y':'x',min:stacked?80:120,max:stacked?320:Math.max(120,Math.min(460,total-260)),initial:stacked?150:innerWidth<=850?145:innerWidth<=1150?175:210,ratio:false};
    }
    const columns=wide.matches,total=Math.max(1,(columns?split.clientWidth:split.clientHeight)-8);
    const min=Math.min(columns?260:160,total*.3),other=Math.min(columns?240:140,total*.3);
    return {name:columns?'editorColumns':'editorRows',axis:columns?'x':'y',min:min/total,max:1-other/total,initial:columns?0.5:0.56,ratio:true,total};
  }
  function apply() {
    for(const handle of [fileHandle,outputHandle]){
      const config=configuration(handle),value=clamp(preferences[config.name]??config.initial,config.min,config.max);
      handle.dataset.axis=config.axis;
      handle.setAttribute('aria-orientation',config.axis==='x'?'vertical':'horizontal');
      const scale=config.ratio?100:1;
      for(const [name,number] of [['min',config.min],['max',config.max],['now',value]])handle.setAttribute('aria-value'+name,String(Math.round(number*scale*100)/100));
      handle.setAttribute('aria-valuetext',config.ratio?`Editor ${Math.round(value*100)} %, Ausgabe ${Math.round((1-value)*100)} %`:`Dateiliste ${Math.round(value)} Pixel`);
      if(config.ratio){split.style.setProperty('--editor-share',value+'fr');split.style.setProperty('--output-share',(1-value)+'fr');}
      else layout.style.setProperty(config.axis==='x'?'--explorer-width':'--explorer-height',value+'px');
    }
  }
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify(preferences));}catch{}};
  function finish(cancel=false){
    if(!drag)return;const current=drag;drag=null;
    if(cancel){if(current.previous===undefined)delete preferences[current.name];else preferences[current.name]=current.previous;apply();}
    else persist();
    document.documentElement.removeAttribute('data-workspace-resizing');
    if(current.handle.hasPointerCapture(current.pointer))current.handle.releasePointerCapture(current.pointer);
  }
  for(const handle of [fileHandle,outputHandle]){
    handle.addEventListener('pointerdown',event=>{
      if(event.button!==0||drag)return;
      const config=configuration(handle);event.preventDefault();handle.focus();
      drag={...config,handle,pointer:event.pointerId,start:config.axis==='x'?event.clientX:event.clientY,value:clamp(preferences[config.name]??config.initial,config.min,config.max),previous:preferences[config.name]};
      handle.setPointerCapture(event.pointerId);document.documentElement.dataset.workspaceResizing=config.axis;
    });
    handle.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.pointer)return;
      const delta=(drag.axis==='x'?event.clientX:event.clientY)-drag.start;
      preferences[drag.name]=clamp(drag.value+delta/(drag.ratio?drag.total:1),drag.min,drag.max);apply();
    });
    handle.addEventListener('pointerup',event=>{if(drag?.handle===handle&&drag.pointer===event.pointerId)finish();});
    handle.addEventListener('pointercancel',event=>{if(drag?.handle===handle&&drag.pointer===event.pointerId)finish(true);});
    handle.addEventListener('lostpointercapture',event=>{if(drag?.handle===handle&&drag.pointer===event.pointerId)finish();});
    handle.addEventListener('dblclick',()=>{const config=configuration(handle);delete preferences[config.name];apply();persist();});
    handle.addEventListener('keydown',event=>{
      if(event.key==='Escape'){finish(true);return;}
      const config=configuration(handle),decrease=config.axis==='x'?'ArrowLeft':'ArrowUp',increase=config.axis==='x'?'ArrowRight':'ArrowDown';
      if(![decrease,increase,'Home','End'].includes(event.key))return;
      event.preventDefault();finish();const value=clamp(preferences[config.name]??config.initial,config.min,config.max),step=(event.shiftKey?50:10)/(config.ratio?config.total:1);
      preferences[config.name]=event.key==='Home'?config.min:event.key==='End'?config.max:clamp(value+(event.key===increase?step:-step),config.min,config.max);apply();persist();
    });
  }
  const observer=new ResizeObserver(apply);observer.observe(layout);observer.observe(split);
  const breakpoint=()=>{finish(true);apply();};mobile.addEventListener('change',breakpoint);wide.addEventListener('change',breakpoint);
  const cancelDrag=()=>finish(true);window.addEventListener('blur',cancelDrag);
  apply();
  return ()=>{finish();observer.disconnect();mobile.removeEventListener('change',breakpoint);wide.removeEventListener('change',breakpoint);window.removeEventListener('blur',cancelDrag);};
}
