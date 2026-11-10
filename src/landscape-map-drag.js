import {mapPosition} from './landscape-layout.js';

export function bindLandscapeDrag(svg,graph,{onMove,onCommit,onSelect,onStart=()=>{},onCancel=()=>{},canStart=()=>true}){
 const nodes=new Map(graph.nodes.map(n=>[n.id,n]));let drag=null;
 const point=ev=>{const p=svg.createSVGPoint();p.x=ev.clientX;p.y=ev.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
 const paint=()=>{drag.el.setAttribute('transform',`translate(${drag.node.x} ${drag.node.y})`);onMove(drag.node);};
 const release=old=>{old.el.classList.remove('is-dragging');svg.classList.remove('is-moving-system');if(old.el.hasPointerCapture(old.id))old.el.releasePointerCapture(old.id);};
 const cancel=()=>{if(!drag)return;Object.assign(drag.node,drag.original);paint();const old=drag;drag=null;release(old);onCancel();};
 const down=ev=>{const el=ev.target.closest('[data-map-system]');if(!el||ev.button!==0||drag||!canStart())return;const node=nodes.get(el.dataset.mapSystem);drag={node,el,id:ev.pointerId,start:point(ev),screen:{x:ev.clientX,y:ev.clientY},original:{x:node.x,y:node.y},moved:false};onStart();el.focus({preventScroll:true});el.setPointerCapture(ev.pointerId);ev.preventDefault();};
 const move=ev=>{if(!drag||drag.id!==ev.pointerId)return;const p=point(ev);if(!drag.moved&&Math.hypot(ev.clientX-drag.screen.x,ev.clientY-drag.screen.y)<4)return;drag.moved=true;drag.el.classList.add('is-dragging');svg.classList.add('is-moving-system');drag.node.x=Math.max(-100000,Math.min(100000,drag.original.x+p.x-drag.start.x));drag.node.y=Math.max(-100000,Math.min(100000,drag.original.y+p.y-drag.start.y));paint();};
 const up=ev=>{if(!drag||drag.id!==ev.pointerId)return;const old=drag;drag=null;release(old);if(old.moved){Object.assign(old.node,mapPosition(old.node));onMove(old.node);if(old.node.x!==old.original.x||old.node.y!==old.original.y)onCommit(old.node);}else onSelect(old.node.id);};
 const abort=ev=>{if(drag?.id===ev.pointerId)cancel();};
 const key=ev=>{const el=ev.target.closest('[data-map-system]');if(ev.key==='Escape'&&drag){ev.preventDefault();ev.stopPropagation();cancel();return;}if(!el||drag||!canStart())return;if(['Enter',' '].includes(ev.key)){ev.preventDefault();ev.stopPropagation();onSelect(el.dataset.mapSystem);}if(ev.key.startsWith('Arrow')){ev.preventDefault();ev.stopPropagation();const n=nodes.get(el.dataset.mapSystem),step=ev.shiftKey?40:10;n.x=Math.max(-100000,Math.min(100000,n.x+(ev.key==='ArrowRight'?step:ev.key==='ArrowLeft'?-step:0)));n.y=Math.max(-100000,Math.min(100000,n.y+(ev.key==='ArrowDown'?step:ev.key==='ArrowUp'?-step:0)));el.setAttribute('transform',`translate(${n.x} ${n.y})`);onMove(n);onCommit(n);}};
 // Pointer selection is handled on release. Ignore its follow-up click, including after a drag.
 const click=ev=>{const el=ev.target.closest('[data-map-system]');if(!el)return;ev.preventDefault();ev.stopPropagation();if(ev.detail===0&&!drag&&canStart())onSelect(el.dataset.mapSystem);};
 const handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:abort,lostpointercapture:abort,keydown:key,click};
 for(const [event,fn] of Object.entries(handlers))svg.addEventListener(event,fn);
 return {get active(){return !!drag;},dispose(){cancel();for(const [event,fn] of Object.entries(handlers))svg.removeEventListener(event,fn);}};
}
