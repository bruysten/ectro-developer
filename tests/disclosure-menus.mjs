import assert from 'node:assert/strict';
import {mountDisclosureMenus} from '../src/disclosure-menus.js';
const listeners=new Map(),doc={menus:[],querySelectorAll(){return this.menus;},addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type,fn){assert.equal(listeners.get(type),fn);listeners.delete(type);}};
function menu(){const m={open:true,contains:target=>target?.menu===m,querySelector:()=>summary,matches:()=>true};const summary={menu:m,parentElement:m,focus(options){this.focused=options;}};return {m,summary,target:(kind,disabled=false)=>({menu:m,disabled,getAttribute:()=>null,closest:selector=>selector.startsWith('details.')?m:selector==='summary'?(kind==='summary'?summary:null):selector==='button,a[href]'&&kind==='action'?{disabled,getAttribute:()=>null}:null})};}
const emit=(type,event)=>listeners.get(type)?.(event);
const a=menu(),b=menu();doc.menus=[a.m,b.m];const dispose=mountDisclosureMenus(doc);
emit('pointerdown',{target:a.target('summary')});assert(a.m.open);assert(!b.m.open,'Outside pointer/touch closes only the other menu');
b.m.open=true;emit('click',{target:a.target('summary')});assert(a.m.open,'Native summary remains responsible for its own toggle');assert(!b.m.open);
emit('click',{target:a.target('action',true)});assert(a.m.open,'Disabled actions do not close the fly-out');
emit('click',{target:a.target('action')});assert(!a.m.open);assert.deepEqual(a.summary.focused,{preventScroll:true},'Restore focus before a selected action can open a dialog');
a.m.open=true;emit('focusin',{target:a.target('action')});assert(a.m.open);emit('focusin',{target:{}});assert(!a.m.open,'Tabbing out dismisses without pulling focus back');
a.m.open=true;b.m.open=true;let prevented=0,stopped=0;emit('keydown',{key:'Escape',target:b.target('action'),preventDefault(){prevented++;},stopPropagation(){stopped++;}});assert(!a.m.open&&!b.m.open);assert(b.summary.focused);assert.equal(prevented,1);assert.equal(stopped,1,'Escape dismisses the menu without cancelling the graph selection beneath it');
emit('keydown',{key:'Escape',target:{},preventDefault(){prevented++;},stopPropagation(){stopped++;}});assert.equal(prevented,1,'No open fly-out: Escape belongs to the active tool');
a.m.open=true;b.m.open=true;emit('toggle',{target:b.m});assert(!a.m.open&&b.m.open);
const learningPanel={open:true,matches:()=>false};emit('toggle',{target:learningPanel});assert(b.m.open&&learningPanel.open,'Ordinary details and sidebar sections remain independent');
const dynamic=menu();doc.menus.push(dynamic.m);emit('click',{target:dynamic.target('summary')});assert(!b.m.open&&dynamic.m.open,'Menus rendered later use the same event delegation');
emit('pointerdown',{target:{}});assert(!dynamic.m.open);
dispose();assert.equal(listeners.size,0);
// Clamp both viewport edges and recompute after a resize without accumulating offsets.
let resize,shift;const panel={style:{setProperty(k,v){shift=v;}},getBoundingClientRect:()=>({left:-13,right:177})};
const win={addEventListener(type,fn){resize=fn;},removeEventListener(type,fn){assert.equal(fn,resize);resize=null;}};
a.m.open=true;a.m.querySelector=selector=>selector==='summary'?a.summary:panel;doc.menus=[a.m];doc.defaultView=win;doc.documentElement={clientWidth:320};const stop=mountDisclosureMenus(doc);emit('toggle',{target:a.m});assert.equal(shift,'25px');panel.getBoundingClientRect=()=>({left:150,right:340});resize();assert.equal(shift,'-32px');panel.getBoundingClientRect=()=>({left:20,right:210});resize();assert.equal(shift,'0px');stop();assert.equal(resize,null);
console.log('Lab action fly-outs: outside pointer/touch, native toggles, action selection, Escape/focus, disabled items, dynamic rendering and disposal verified.');
