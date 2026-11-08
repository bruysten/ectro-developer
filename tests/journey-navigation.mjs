import assert from 'node:assert/strict';
import {bindJourneyNavigation,journeyColumns,journeyRevealScroll} from '../src/journey-navigation.js';
for(const width of [120,190,280,320,375,640,768,1024,1320,1920])for(const count of [0,1,2,6,20]){
 const n=journeyColumns(width,count);assert(n>=1&&n<=Math.max(1,count));
 if(n>1)assert((width-(n-1)*12)/n>=190);
}
assert.equal(journeyRevealScroll(0,600,800,990,3400),390);
assert.equal(journeyRevealScroll(390,600,500,690,3400),390);
assert.equal(journeyRevealScroll(390,600,100,290,3400),100);
assert.equal(journeyRevealScroll(3200,600,3700,3900,3300),3300);

function el(){const listeners=new Map();return {disabled:false,value:'',textContent:'',innerHTML:'',dataset:{},style:{setProperty(){}},addEventListener(k,fn){listeners.set(k,fn);},removeEventListener(k){listeners.delete(k);},emit(k,event={}){listeners.get(k)?.(event);}};}
let stages=Array.from({length:20},(_,i)=>({id:'p'+i,name:'Phase '+i})),selected='p0',calls=0,scrolls=[],resized,stopped=false,frames=[];
const picker=el(),previous=el(),next=el(),position=el(),board=el();
board.clientWidth=600;board.scrollWidth=4040;board.scrollLeft=0;
board.getBoundingClientRect=()=>({left:100});board.contains=card=>board.children.includes(card);
board.scrollTo=opts=>{scrolls.push(opts);board.scrollLeft=opts.left;};
function cards(){board.children=stages.map((s,i)=>({...el(),dataset:{stage:s.id},closest(){return this;},focus(opts){this.focused=opts;},getBoundingClientRect(){return {left:103+i*202-board.scrollLeft,right:291+i*202-board.scrollLeft};}}));}
cards();let reduced=false;
const windowRef={matchMedia:()=>({matches:reduced}),ResizeObserver:class{constructor(fn){resized=fn;}observe(){}disconnect(){stopped=true;}},requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame(){}};
let curveResizes=0;
const nav=bindJourneyNavigation({board,picker,previous,next,position,getStages:()=>stages,getSelected:()=>selected,onSelect:id=>{calls++;selected=id;cards();nav.refresh();},onResize:()=>curveResizes++,windowRef});
nav.refresh();assert(previous.disabled);assert(!next.disabled);assert.equal(position.textContent,'Phase 1 von 20');assert.equal(board.children.filter(c=>c.tabIndex===0).length,1);
picker.value='p19';picker.emit('change');assert.equal(selected,'p19');assert(next.disabled);assert(!previous.disabled);assert.equal(position.textContent,'Phase 20 von 20');assert(board.scrollLeft>3000,'Direct selection reveals the last of twenty phases');
assert.equal(scrolls.at(-1).behavior,'smooth');
const lastScroll=board.scrollLeft,scrollCount=scrolls.length;
stages[19].name='A very long edited phase';cards();nav.refresh();assert.equal(board.scrollLeft,lastScroll);assert.equal(scrolls.length,scrollCount,'Typing updates labels without moving the strip');assert(picker.innerHTML.includes('A very long edited phase'));
previous.emit('click');assert.equal(selected,'p18');
let prevented=0;const key=(key,extra={})=>board.emit('keydown',{target:board.children.find(c=>c.dataset.stage===selected),key,preventDefault(){prevented++;},...extra});
key('Home');assert.equal(selected,'p0');assert(previous.disabled);assert.deepEqual(board.children[0].focused,{preventScroll:true});
key('End');assert.equal(selected,'p19');key('ArrowLeft');assert.equal(selected,'p18');key('ArrowRight');assert.equal(selected,'p19');key('ArrowRight');assert.equal(selected,'p19');
const before=calls;key('ArrowLeft',{ctrlKey:true});assert.equal(calls,before);assert.equal(prevented,5);
board.emit('click',{target:board.children[7]});assert.equal(selected,'p7');assert.equal(picker.value,'p7');
reduced=true;picker.value='p15';picker.emit('change');assert.equal(scrolls.at(-1).behavior,'instant');
board.clientWidth=280;resized();frames.pop()();assert(board.scrollLeft>=15*202-280,'Narrowing the viewport keeps the selected card visible');
// Reordering / deletion can change the selected position without changing its ID.
[stages[15],stages[19]]=[stages[19],stages[15]];cards();nav.refresh();assert.equal(position.textContent,'Phase 20 von 20');assert(next.disabled);
stages.splice(0,5);cards();nav.refresh();assert.equal(position.textContent,'Phase 15 von 15');
// Empty and one-phase journeys have no dangling navigation destinations.
stages=[];selected='';cards();nav.refresh();assert(picker.disabled&&previous.disabled&&next.disabled);assert.equal(position.textContent,'Noch keine Phasen');
stages=[{id:'only',name:'<img onerror="bad">'}];selected='only';cards();nav.refresh();assert(!picker.disabled&&previous.disabled&&next.disabled);assert(picker.innerHTML.includes('&lt;img'));
assert.equal(curveResizes,2,'The mood curve is resized initially and on width changes, not while typing');
nav.dispose();assert(stopped);const disposedCalls=calls;picker.emit('change');next.emit('click');assert.equal(calls,disposedCalls);
console.log('Journey phase navigation: 20 phases, complete-card fitting, direct/arrow/keyboard selection, edit stability, resize, reorder, removal, escaping, reduced motion and disposal verified.');
