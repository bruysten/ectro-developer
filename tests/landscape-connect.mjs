import assert from 'node:assert/strict';
import {bindLandscapeConnect,landscapeConnectionPath} from '../src/landscape-map-connect.js';
function fixture(count=3){
 const listeners=()=>({events:new Map(),addEventListener(k,v){this.events.set(k,v);},removeEventListener(k){this.events.delete(k);},fire(k,event={}){this.events.get(k)?.({button:0,isPrimary:true,pointerId:1,clientX:50,clientY:100,detail:1,preventDefault(){},stopImmediatePropagation(){},...event});}});
 const classes=()=>({values:new Set(),add(v){this.values.add(v);},remove(v){this.values.delete(v);}});
 const el=(kind,id)=>({dataset:{[kind]:id},classList:classes(),attrs:{},setAttribute(k,v){this.attrs[k]=v;},focus(){this.focused=true;},closest(q){return q.split(',').includes(kind==='mapConnect'?'[data-map-connect]':'[data-map-system]')?this:null;}});
 const ports=['a','b','c'].map(id=>el('mapConnect',id)),elements=['a','b','c'].map(id=>el('mapSystem',id)),previews=[];
 const win=listeners(),doc={...listeners(),defaultView:win,hit:elements[1],elementFromPoint(){return this.hit;},createElementNS(){const p={attrs:{},style:{},setAttribute(k,v){this.attrs[k]=v;},remove(){this.removed=true;}};previews.push(p);return p;}};
 const svg={...listeners(),ownerDocument:doc,classList:classes(),capture:null,querySelectorAll:q=>q==='[data-map-connect]'?ports:elements,querySelector:()=>elements[0],contains:el=>ports.includes(el)||elements.includes(el),insertBefore(){},setPointerCapture(id){this.capture=id;},hasPointerCapture(id){return this.capture===id;},releasePointerCapture(){this.capture=null;},createSVGPoint:()=>({x:0,y:0,matrixTransform(){return {x:this.x*2-100,y:this.y*2-200};}}),getScreenCTM:()=>({inverse:()=>({})})};
 const graph={nodes:[{id:'a',name:'CRM',x:-120,y:-50},{id:'b',name:'ERP',x:120,y:100},{id:'c',name:'Shop',x:350,y:10}].slice(0,count),edges:[]},calls=[],errors=[],messages=[];
 const controller=bindLandscapeConnect(svg,graph,{onConnect:(...args)=>calls.push(args),onError:e=>errors.push(e),onStatus:t=>messages.push(t)});
 const fire=(name,extra={})=>svg.fire(name,{target:ports[0],...extra});
 return {svg,doc,win,graph,ports,elements,previews,calls,errors,messages,controller,fire};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
for(const pointerType of ['mouse','touch','pen']){
 const f=fixture(),original=structuredClone(f.graph);
 f.fire('pointerdown',{pointerType});assert(f.controller.active);f.fire('pointermove',{pointerType,clientX:80,clientY:70,pointerId:2});assert.equal(f.previews[0].style.display,'none');
 f.fire('pointermove',{pointerType,clientX:80,clientY:70});assert.equal(f.previews[0].style.display,'');assert.match(f.previews[0].attrs.d,/^M-85 -50 C/,'Wire starts at the docked source port, including negative SVG coordinates');assert(f.elements[1].classList.values.has('is-connect-target'));
 f.fire('pointerup',{pointerType,clientX:80,clientY:70});assert(!f.controller.active);assert.equal(f.svg.capture,null);await flush();assert.deepEqual(f.calls,[['a','b']]);assert.deepEqual(f.graph,original,'Connecting never moves systems or inserts a flow before the editor accepts');assert(f.previews[0].removed);assert(!f.elements[1].classList.values.has('is-connect-target'));f.controller.dispose();assert.equal(f.svg.events.size,0);assert.equal(f.win.events.size,0);assert.equal(f.doc.events.size,0);
}
for(const cancellation of ['Escape','pointercancel','lostpointercapture','blur','outside','self','dispose']){
 const f=fixture();f.fire('pointerdown');f.fire('pointermove',{clientX:80});
 if(cancellation==='Escape')f.fire('keydown',{key:'Escape'});
 if(['pointercancel','lostpointercapture'].includes(cancellation))f.fire(cancellation);
 if(cancellation==='blur')f.win.fire('blur');
 if(cancellation==='outside'){f.doc.hit=null;f.fire('pointerup');}
 if(cancellation==='self'){f.doc.hit=f.elements[0];f.fire('pointerup');}
 if(cancellation==='dispose')f.controller.dispose();await flush();assert.equal(f.calls.length,0,cancellation+' cannot create a connection');assert(!f.controller.active);assert(f.previews[0].removed);assert.equal(f.svg.capture,null);f.controller.dispose();
}
{
 const f=fixture();f.fire('pointerdown');f.fire('pointerup');assert(f.controller.active);assert.equal(f.calls.length,0,'Clicking + arms target selection instead of choosing an arbitrary target');
 f.fire('pointerdown',{target:f.elements[1]});f.fire('pointerup',{target:f.elements[1]});await flush();assert.deepEqual(f.calls,[['a','b']]);
 f.fire('keydown',{target:f.ports[1],key:'Enter'});f.fire('keydown',{target:f.elements[0],key:'Enter'});await flush();assert.deepEqual(f.calls[1],['b','a'],'Reverse routes are equally available');
 f.fire('keydown',{key:' '});f.fire('keydown',{target:f.elements[2],key:'Enter'});await flush();assert.deepEqual(f.calls[2],['a','c'],'One source can connect sequentially to additional systems');f.controller.dispose();
}
{
 const f=fixture();f.fire('pointerdown');f.fire('pointermove',{clientX:80});f.fire('pointerup');f.controller.dispose();await flush();assert.equal(f.calls.length,0,'Navigating away before opening the editor discards a pending gesture');
}
for(const escape of ['outside-click','focus-leave']){
 const f=fixture();f.fire('keydown',{key:'Enter'});if(escape==='outside-click')f.doc.fire('pointerdown',{target:{}});else f.fire('focusout',{relatedTarget:{}});assert(!f.controller.active);await flush();assert.equal(f.calls.length,0);f.controller.dispose();
}
{const f=fixture(1);f.fire('keydown',{key:'Enter'});assert(!f.controller.active,'A single visible system cannot start a self connection');f.controller.dispose();}
assert(!landscapeConnectionPath({x:0,y:0},{x:35,y:0}).includes('NaN'));
console.log('Landscape connections: mouse/touch/pen, inverse SVG coordinates, docked preview, click/keyboard alternatives, reverse/repeated pairs, cancellation, same-system/outside rejection and disposal verified.');
