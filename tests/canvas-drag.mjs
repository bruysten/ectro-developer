import assert from 'node:assert/strict';
import {mountCanvasDrag} from '../src/canvas-drag.js';
function fixture(){
 const listeners=()=>({events:new Map(),addEventListener(name,fn){this.events.set(name,fn);},removeEventListener(name){this.events.delete(name);},fire(name,event={}){this.events.get(name)?.({button:0,isPrimary:true,pointerId:1,clientX:50,clientY:100,preventDefault(){},stopPropagation(){},...event});}});
 const classes=()=>({values:new Set(),add(v){this.values.add(v);},remove(v){this.values.delete(v);}});
 const ghost={classList:classes(),style:{},setAttribute(){},querySelectorAll:()=>[],remove(){this.removed=true;}};
 const note={dataset:{canvasNote:'note'},classList:classes(),getBoundingClientRect:()=>({left:30,top:60,width:180}),cloneNode:()=>ghost};
 const handle={closest:selector=>selector==='[data-canvas-drag]'?handle:selector==='[data-canvas-note]'?note:null,setPointerCapture(){},releasePointerCapture(){}};
 const card={closest:selector=>selector==='[data-canvas-card]'?card:selector==='[data-canvas-note]'?note:null,setPointerCapture(){},releasePointerCapture(){}};
 const target={dataset:{canvasDrop:'channels'},classList:classes(),getBoundingClientRect:()=>({left:300,top:80,width:180})};
 const node={closest:selector=>selector==='[data-canvas-drop]'?target:null};
 const win={...listeners(),innerHeight:800,requestAnimationFrame:()=>1,cancelAnimationFrame(){},scrollBy(){},matchMedia:()=>({matches:true})};
 const doc={...listeners(),defaultView:win,elementFromPoint:()=>node,scrollingElement:{scrollHeight:1000},body:{append(){}}};
 const root={...listeners(),ownerDocument:doc,contains:t=>t===target,classList:classes(),closest:()=>null};
 const result={started:0,ended:0,moves:[],errors:[]},dispose=mountCanvasDrag(root,{canDrag:()=>true,onStart:()=>result.started++,onEnd:()=>result.ended++,onMove:(...args)=>result.moves.push(args),onError:e=>result.errors.push(e)});
 return {root,doc,handle,card,target,ghost,note,result,dispose};
}
for(const pointerType of ['mouse','touch','pen']){
 const f=fixture();f.root.fire('pointerdown',{target:f.handle,pointerType});f.doc.fire('pointermove',{pointerType,clientX:100,clientY:110});f.doc.fire('pointerup',{pointerType,clientX:330,clientY:100});
 assert.equal(f.result.started,1);assert.equal(f.result.ended,1);assert.deepEqual(f.result.moves,[['note',['channels']]]);assert(f.ghost.removed);assert(!f.note.classList.values.has('is-drag-source'));
 f.dispose();assert.equal(f.doc.events.size,0);assert.equal(f.root.events.size,0);
}
{
 const f=fixture();f.root.fire('pointerdown',{target:f.card,pointerType:'touch'});f.doc.fire('pointermove',{clientX:200});f.doc.fire('pointerup');assert.equal(f.result.started,0,'Touching card text preserves page scrolling');f.dispose();
}
for(const cancel of ['escape','pointercancel','lostcapture','outside','dispose']){
 const f=fixture();f.root.fire('pointerdown',{target:f.handle,pointerType:'mouse'});f.doc.fire('pointermove',{clientX:100});
 if(cancel==='escape')f.doc.fire('keydown',{key:'Escape'});if(cancel==='pointercancel')f.doc.fire('pointercancel');if(cancel==='lostcapture')f.root.fire('lostpointercapture');if(cancel==='outside'){f.doc.elementFromPoint=()=>null;f.doc.fire('pointerup');}if(cancel==='dispose')f.dispose();
 assert.equal(f.result.moves.length,0,cancel+' never writes a move');assert(f.ghost.removed);f.dispose();
}
{
 const f=fixture();f.target.dataset.canvasDrop='thinks feels';f.root.fire('pointerdown',{target:f.handle,pointerType:'mouse'});f.doc.fire('pointermove',{clientX:100});f.doc.fire('pointerup');assert.deepEqual(f.result.moves[0][1],['thinks','feels'],'Composite diagram regions retain their precise field choices');f.dispose();
}
console.log('Canvas drag controller verified: mouse/touch/pen handles, ordinary touch scrolling, Escape/cancel/outside drops, disposal and grouped geometric targets.');
