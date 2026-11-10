import assert from 'node:assert/strict';
import {arrangeLandscape,landscapePositions} from '../src/landscape-layout.js';
import {bindLandscapeDrag} from '../src/landscape-map-drag.js';
import {industryLandscape} from '../src/landscape-examples.js';

for(const key of ['publishing','insurance','energy','manufacturing']){
 const c=industryLandscape(key),before=JSON.stringify(c),positions=arrangeLandscape(c.systems,c.flows);
 assert.deepEqual(positions,arrangeLandscape(c.systems,c.flows));assert.equal(JSON.stringify(c),before);
 for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++)assert(Math.abs(positions[i].x-positions[j].x)>=250||Math.abs(positions[i].y-positions[j].y)>=150,'Automatic layout reserves space for node names and realms');
}
const systems=Array.from({length:150},(_,i)=>({id:'s'+i})),state={},positions=structuredClone(landscapePositions(systems,[],state));
landscapePositions(systems.filter((_,i)=>i%2===0),[],{});assert.deepEqual({...landscapePositions(systems,[{from:'s0',to:'s1'}],state)},positions,'Adding a flow does not rearrange the map');
const stored=systems.map(s=>({...s,mapPosition:state.positions[s.id]}));stored[0].mapPosition={x:-300,y:-500};
assert.deepEqual(landscapePositions(JSON.parse(JSON.stringify(stored)),[],{}).s0,{x:-300,y:-500},'Reload honors manually saved coordinates');
const added=landscapePositions([...stored,{id:'new'}],[],state);assert.deepEqual(added.s0,{x:-300,y:-500});assert.deepEqual(added.s149,positions.s149,'Adding a system leaves existing placements alone');
assert.deepEqual(landscapePositions(stored,[],state).s1,positions.s1);assert(!Object.hasOwn(state.positions,'new'),'Removed nodes are pruned');
assert.equal(Object.keys(landscapePositions([{id:'__proto__'},{id:'constructor'}],[],{})).length,2,'Arbitrary imported IDs cannot become object prototypes');
const large=arrangeLandscape(Array.from({length:2000},(_,i)=>({id:String(i)})),[]);assert.equal(new Set(large.map(n=>`${n.x}:${n.y}`)).size,2000);assert(large.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));

const classes=()=>({add(){},remove(){}}),handlers={},el={dataset:{mapSystem:'a'},classList:classes(),attrs:{},capture:null,focus(){},setPointerCapture(id){this.capture=id;},hasPointerCapture(id){return id===this.capture;},releasePointerCapture(){this.capture=null;},setAttribute(k,v){this.attrs[k]=v;},closest(q){return q==='[data-map-system]'?this:null;}};
const svg={classList:classes(),addEventListener(k,v){handlers[k]=v;},removeEventListener(k,v){if(handlers[k]===v)delete handlers[k];},createSVGPoint:()=>({x:0,y:0,matrixTransform(){return {x:this.x*2-100,y:this.y*2-200};}}),getScreenCTM:()=>({inverse:()=>({})})};
const graph={nodes:[{id:'a',x:0,y:0}],edges:[]};let saves=0,choices=0,paints=0,cancels=0;
const drag=bindLandscapeDrag(svg,graph,{onMove(){paints++;},onCommit(){saves++;},onSelect(){choices++;},onCancel(){cancels++;}});
const event=(x,y,extra={})=>({target:el,pointerId:1,button:0,clientX:x,clientY:y,preventDefault(){},stopPropagation(){},...extra});
handlers.pointerdown(event(50,100));handlers.pointermove(event(80,50,{pointerId:2}));assert.deepEqual(graph.nodes[0],{id:'a',x:0,y:0});
handlers.pointermove(event(80,50));assert.deepEqual(graph.nodes[0],{id:'a',x:60,y:-100},'Drag uses the inverse SVG matrix at any zoom, including negative coordinates');assert.equal(saves,0);assert(paints>0);
handlers.pointerup(event(80,50));assert.equal(saves,1);assert.equal(choices,0);assert.equal(el.capture,null);
handlers.click(event(80,50,{detail:1}));assert.equal(choices,0,'A completed drag never selects or opens a node');
handlers.pointerdown(event(80,50));handlers.pointerup(event(80,50));assert.equal(choices,1);assert.equal(saves,1,'Ordinary selection never dirties the model');
for(const kind of ['pointercancel','lostpointercapture','Escape']){
 const before={...graph.nodes[0]};handlers.pointerdown(event(80,50));handlers.pointermove(event(120,140));
 if(kind==='Escape')handlers.keydown(event(0,0,{key:'Escape'}));else handlers[kind](event(120,140));
 assert.deepEqual(graph.nodes[0],before);assert.equal(saves,1,'Cancellation restores the live drawing without persisting');
}
handlers.keydown(event(0,0,{key:'ArrowLeft'}));assert.equal(graph.nodes[0].x,50);assert.equal(saves,2);
handlers.keydown(event(0,0,{key:'ArrowUp',shiftKey:true}));assert.equal(graph.nodes[0].y,-140);assert.equal(saves,3);
handlers.keydown(event(0,0,{key:'Enter'}));assert.equal(choices,2);
const beforeDispose={...graph.nodes[0]};handlers.pointerdown(event(80,50));handlers.pointermove(event(120,140));drag.dispose();assert.deepEqual(graph.nodes[0],beforeDispose);assert.equal(Object.keys(handlers).length,0);assert.equal(saves,3);assert.equal(cancels,4);
console.log('Landscape placement: four industry layouts, 2,000 nodes, saved coordinates, stable changes, scaled pointer dragging, cancel/dispose and keyboard movement verified.');
