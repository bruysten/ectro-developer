// A transient connection gesture never changes nodes or flows. Only a valid pair
// is handed to the existing, validated flow editor after pointer capture ends.
export function landscapeConnectionPath(source,point,target=null){
 const start={x:source.x+35,y:source.y},dx=point.x-start.x,dy=point.y-start.y,length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
 const end=target?{x:target.x-ux*35,y:target.y-uy*35}:point,bend=Math.min(120,Math.max(35,Math.abs(end.x-start.x)*.35));
 return `M${start.x} ${start.y} C${start.x+bend} ${start.y} ${end.x-ux*bend} ${end.y-uy*bend} ${end.x} ${end.y}`;
}
export function bindLandscapeConnect(svg,graph,{onConnect,onError=()=>{},canStart=()=>true,onStatus=()=>{}}){
 const doc=svg.ownerDocument,win=doc.defaultView,nodes=new Map(graph.nodes.map(n=>[n.id,n]));let gesture=null,disposed=false,pending=false,suppressUntil=0;
 const port=id=>Array.from(svg.querySelectorAll('[data-map-connect]')).find(el=>el.dataset.mapConnect===id);
 const node=id=>Array.from(svg.querySelectorAll('[data-map-system]')).find(el=>el.dataset.mapSystem===id);
 const elementId=el=>{const target=el?.closest('[data-map-system],[data-map-connect]');return target&&svg.contains(target)?target.dataset.mapSystem||target.dataset.mapConnect:null;};
 const point=ev=>{const p=svg.createSVGPoint();p.x=ev.clientX;p.y=ev.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
 const targetAt=ev=>{const id=elementId(doc.elementFromPoint(ev.clientX,ev.clientY));return id&&id!==gesture?.source&&nodes.has(id)?id:null;};
 function clearTarget(){if(gesture?.target)node(gesture.target)?.classList.remove('is-connect-target');if(gesture)gesture.target=null;}
 function paint(p,target=null){if(!gesture)return;clearTarget();gesture.target=target;node(target)?.classList.add('is-connect-target');gesture.preview.setAttribute('d',landscapeConnectionPath(nodes.get(gesture.source),target?nodes.get(target):p,target?nodes.get(target):null));gesture.preview.style.display='';}
 function release(){if(!gesture)return;const id=gesture.pointer;gesture.pointer=null;if(id!==null&&svg.hasPointerCapture(id))svg.releasePointerCapture(id);}
 function finish(){if(!gesture)return null;const old=gesture;release();clearTarget();gesture=null;old.preview.remove();port(old.source)?.setAttribute('aria-pressed','false');node(old.source)?.classList.remove('is-connect-source');svg.classList.remove('is-connecting-system');return old;}
 function cancel(focus=false){const old=finish();if(!old)return;if(focus)port(old.source)?.focus({preventScroll:true});onStatus('Verbindung abgebrochen.');}
 function begin(source){if(disposed||pending||!canStart()||nodes.size<2||!nodes.has(source))return false;finish();const preview=doc.createElementNS('http://www.w3.org/2000/svg','path');preview.setAttribute('class','landscape-connect-preview');preview.setAttribute('aria-hidden','true');preview.setAttribute('marker-end','url(#landscape-arrow)');preview.style.display='none';svg.insertBefore(preview,svg.querySelector('[data-map-system]'));gesture={source,pointer:null,armed:false,moved:false,preview,target:null};port(source)?.setAttribute('aria-pressed','true');node(source)?.classList.add('is-connect-source');svg.classList.add('is-connecting-system');onStatus(nodes.get(source).name+' → Zielsystem wählen · Escape bricht ab.');return true;}
 function connect(target){if(!gesture||!target||target===gesture.source||!nodes.has(target))return;const source=gesture.source;finish();suppressUntil=Date.now()+500;pending=true;onStatus(nodes.get(source).name+' → '+nodes.get(target).name);Promise.resolve().then(()=>{if(!disposed)return onConnect(source,target);}).catch(onError).finally(()=>{pending=false;if(!disposed)onStatus('Am + verbinden · Systeme ziehen · Hintergrund ziehen zum Navigieren.');});}
 const stop=ev=>{ev.preventDefault();ev.stopImmediatePropagation();};
 function down(ev){if(ev.button!==0||ev.isPrimary===false||disposed||pending)return;const handle=ev.target.closest('[data-map-connect]'),target=elementId(ev.target);
  if(handle&&svg.contains(handle)){stop(ev);if(!begin(handle.dataset.mapConnect))return;gesture.start={x:ev.clientX,y:ev.clientY};gesture.pointer=ev.pointerId;handle.focus({preventScroll:true});svg.setPointerCapture(ev.pointerId);}
  else if(gesture?.armed&&target){stop(ev);gesture.pointer=ev.pointerId;gesture.selecting=true;svg.setPointerCapture(ev.pointerId);paint(nodes.get(target),target!==gesture.source?target:null);}
  else if(gesture?.armed)cancel();
 }
 function move(ev){if(!gesture||gesture.pointer!==null&&gesture.pointer!==ev.pointerId)return;if(gesture.pointer!==null&&!gesture.selecting&&!gesture.moved){if(Math.hypot(ev.clientX-gesture.start.x,ev.clientY-gesture.start.y)<4)return;gesture.moved=true;}if(gesture.pointer!==null)ev.preventDefault();paint(point(ev),targetAt(ev));}
 function up(ev){if(!gesture||gesture.pointer!==ev.pointerId)return;stop(ev);const target=targetAt(ev),drawn=gesture.moved||gesture.selecting;release();suppressUntil=Date.now()+500;if(drawn){if(target)connect(target);else cancel(true);}else{gesture.armed=true;onStatus(nodes.get(gesture.source).name+' → Zielsystem anklicken · Escape bricht ab.');}}
 function key(ev){const handle=ev.target.closest('[data-map-connect]');if(ev.key==='Escape'&&gesture){stop(ev);cancel(true);return;}if(!['Enter',' '].includes(ev.key))return;if(handle){stop(ev);if(gesture?.source===handle.dataset.mapConnect)cancel(true);else if(begin(handle.dataset.mapConnect))gesture.armed=true;}else if(gesture?.armed){const target=elementId(ev.target);if(target){stop(ev);if(target!==gesture.source)connect(target);}}}
 function click(ev){const handle=ev.target.closest('[data-map-connect]'),target=elementId(ev.target);if(handle||gesture?.armed&&target||Date.now()<suppressUntil&&target){stop(ev);if(ev.detail===0&&Date.now()>=suppressUntil){if(handle){if(gesture?.source===handle.dataset.mapConnect)cancel(true);else if(begin(handle.dataset.mapConnect))gesture.armed=true;}else if(gesture?.armed&&target!==gesture.source)connect(target);}}}
 const abort=ev=>{if(gesture?.pointer===ev.pointerId)cancel(true);},blur=()=>cancel(),outside=ev=>{if(gesture?.armed&&!svg.contains(ev.target))cancel();},focusout=ev=>{if(gesture?.armed&&ev.relatedTarget&&!svg.contains(ev.relatedTarget))cancel();};
 const handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:abort,lostpointercapture:abort,keydown:key,click,focusout};
 for(const [event,fn] of Object.entries(handlers))svg.addEventListener(event,fn,true);win.addEventListener('blur',blur);doc.addEventListener('pointerdown',outside,true);
 return {get active(){return !!gesture;},get busy(){return pending;},cancel,dispose(){disposed=true;finish();for(const [event,fn] of Object.entries(handlers))svg.removeEventListener(event,fn,true);win.removeEventListener('blur',blur);doc.removeEventListener('pointerdown',outside,true);}};
}
