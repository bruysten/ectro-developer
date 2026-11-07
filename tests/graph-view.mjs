import assert from 'node:assert/strict';
import {GRAPH_NODE_RADIUS,graphNodePosition,graphEdgeGeometry,graphEdgeOffsets,bindGraphDrag} from '../src/graph-view.js';

// Check attachment for every direction, including vertical and reverse edges.
for(let angle=0;angle<Math.PI*2;angle+=Math.PI/16){
  const a={x:180,y:200},b={x:180+200*Math.cos(angle),y:200+200*Math.sin(angle)};
  const geometry=graphEdgeGeometry(a,b),points=geometry.path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
  assert(Math.abs(Math.hypot(points[0]-a.x,points[1]-a.y)-GRAPH_NODE_RADIUS)<1e-9);
  assert(Math.abs(Math.hypot(points[2]-b.x,points[3]-b.y)-GRAPH_NODE_RADIUS)<1e-9);
}
for(const y of [45,200]){
  const loop=graphEdgeGeometry({x:100,y},{x:100,y});
  assert(loop.path.includes(' C '));assert(!/NaN|Infinity/.test(loop.path));
}

function element(dataset={}){
  return {dataset,attrs:{},captured:null,setAttribute(k,v){this.attrs[k]=String(v);},
    setPointerCapture(id){this.captured=id;},hasPointerCapture(id){return this.captured===id;},releasePointerCapture(){this.captured=null;}};
}
const graph={nodes:[{id:'a',x:200,y:200},{id:'b',x:600,y:300},{id:'imported'}],edges:[{from:'a',to:'b'},{from:'b',to:'a'},{from:'a',to:'a'},{from:'b',to:'imported'}]};
const nodes=graph.nodes.map(n=>element({node:n.id}));
const edges=graph.edges.map((e,i)=>{const el=element({edge:String(i)});el.path=element();el.hit=element();el.label=element();el.querySelector=q=>q==='path'?el.path:q==='.graph-edge-hit'?el.hit:el.label;return el;});
const stage={querySelectorAll:q=>q==='[data-node]'?nodes:edges,
  createSVGPoint:()=>({x:0,y:0,matrixTransform(){return {x:this.x/2,y:this.y/2};}}),
  getScreenCTM:()=>({inverse:()=>({})})};
let changes=0,draws=0,chosen=[];
bindGraphDrag(stage,graph,{changed:()=>changes++,draw:()=>draws++,chooseNode:id=>chosen.push(id),fail:e=>{throw e;}});
const event=(x,y,id=1)=>({clientX:x*2,clientY:y*2,pointerId:id,button:0,preventDefault(){}});
nodes[0].onpointerdown(event(200,200));nodes[0].onpointermove(event(300,240,2));
assert.equal(graph.nodes[0].x,200,'An unrelated pointer cannot move the node');
nodes[0].onpointermove(event(300,240));
assert.deepEqual({x:graph.nodes[0].x,y:graph.nodes[0].y},{x:300,y:240});
assert.equal(nodes[0].attrs.transform,'translate(300,240)');
assert(edges.slice(0,3).every(e=>e.path.attrs.d===e.hit.attrs.d),'Invisible click targets track the visible edges during dragging');
assert(edges.slice(0,3).every(e=>e.path.attrs.d),'All incident edges, including incoming edges and loops, follow before release');
assert.equal(edges[3].path.attrs.d,undefined,'Unrelated edges are not redrawn');
assert.equal(edges[0].label.attrs.x,String(graphEdgeGeometry({x:300,y:240},{x:600,y:300},graphEdgeOffsets(graph)[0]).label.x));
assert.notEqual(edges[0].path.attrs.d,edges[1].path.attrs.d,'Incoming and outgoing parallel edges are separated');
assert.equal(changes,0);assert.equal(draws,0,'The stage stays mounted during capture');
const firstPath=edges[0].path.attrs.d;
nodes[0].onpointermove(event(350,260));assert.notEqual(edges[0].path.attrs.d,firstPath);
nodes[0].onpointerup(event(350,260));assert.equal(changes,1);assert.equal(draws,1);
assert.equal(nodes[0].captured,null);assert.deepEqual(chosen,[]);

// Move the other endpoint, then cancel: restore the data and redraw the graph.
nodes[1].onpointerdown(event(600,300));nodes[1].onpointermove(event(650,350));
assert.equal(edges[0].label.attrs.x,String(graphEdgeGeometry({x:350,y:260},{x:650,y:350},graphEdgeOffsets(graph)[0]).label.x));
nodes[1].onpointercancel(event(650,350));assert.equal(graph.nodes[1].x,600);assert.equal(graph.nodes[1].y,300);assert.equal(changes,1);assert.equal(draws,2);

// Coordinate-less imports start dragging from their displayed position, without jumping.
const initial=graphNodePosition(graph.nodes[2],2);
nodes[2].onpointerdown(event(initial.x,initial.y));nodes[2].onpointermove(event(initial.x+10,initial.y+5));
assert.equal(graph.nodes[2].x,initial.x+10);assert.equal(graph.nodes[2].y,initial.y+5);
nodes[2].onlostpointercapture(event(0,0));assert.equal(graph.nodes[2].x,undefined);assert.equal(graph.nodes[2].y,undefined);
nodes[0].onpointerdown(event(350,260));nodes[0].onpointerup(event(350,260));assert.deepEqual(chosen,['a']);
nodes[1].onkeydown({key:'Enter',preventDefault(){}});assert.deepEqual(chosen,['a','b']);
assert.equal(changes,1,'Selection, cancellation and capture loss do not save a drag');
for(const offset of [-90,-30,30,90]){
  const a={x:100,y:200},b={x:600,y:300},g=graphEdgeGeometry(a,b,offset),points=g.path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
  assert(Math.abs(Math.hypot(points[0]-a.x,points[1]-a.y)-35)<1e-9);
  assert(Math.abs(Math.hypot(points[4]-b.x,points[5]-b.y)-35)<1e-9);
}
console.log('Graph attachment verified: live incoming/outgoing edges, labels, loops, scaled coordinates, imports and drag cancellation.');

// Imported graphs remain legible without rewriting supplied coordinates.
const {arrangeGraph,graphFitView}=await import('../src/graph-view.js');
const imported=Array.from({length:14},(_,i)=>({id:'n'+i}));
const positions=imported.map(graphNodePosition);
assert.equal(new Set(positions.map(p=>`${p.x},${p.y}`)).size,14);
assert(positions[5].y>positions[0].y,'Missing coordinates wrap into rows rather than a single long line');
for(const count of [0,1,8,170]){
  const g={nodes:Array.from({length:count},(_,i)=>({id:'n'+i,x:42,y:42})),edges:count>1?[{from:'n0',to:'n1',label:'verbindet'},{from:'n0',to:'n0',label:'selbst'}]:[]},before=JSON.stringify(g);
  const arranged=arrangeGraph(g);
  assert.equal(JSON.stringify(g),before,'Auto layout only proposes coordinates; the caller controls undo and saving');
  assert.deepEqual(arranged,arrangeGraph(g),'Repeated layout is deterministic');
  assert.equal(arranged.length,count);
  assert.equal(new Set(arranged.map(p=>`${p.x},${p.y}`)).size,count,'Disconnected and overlapping imports receive distinct positions');
  assert(arranged.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=45&&p.y>=45));
  for(const [width,height] of [[320,360],[900,480],[1600,600]]){
    const model={...g,nodes:arranged},view=graphFitView(model,width,height);
    assert([view.x,view.y,view.width,view.height].every(Number.isFinite));
    assert(Math.abs(view.width/view.height-width/height)<1e-8);
    for(const p of arranged){assert(p.x-35>=view.x&&p.x+35<=view.x+view.width);assert(p.y-35>=view.y&&p.y+77<=view.y+view.height);}
  }
}
const loopGraph={nodes:[{id:'loop',x:150,y:200}],edges:[{from:'loop',to:'loop',label:'eine Beziehung zu sich selbst'}]};
const loopView=graphFitView(loopGraph,800,400),loopGeometry=graphEdgeGeometry(loopGraph.nodes[0],loopGraph.nodes[0]);
assert(loopGeometry.label.y>=loopView.y,'Fit includes loop labels above the node');
console.log('Graph workspace verified: non-mutating deterministic layouts, disconnected imports, responsive fitting and self-loop bounds.');

// A fitted graph must stay fitted when the canvas changes width, including
// crossing the breakpoint that moves the inspector below the canvas.
const {bindGraphViewport}=await import('../src/graph-view.js');
const originalObserver=globalThis.ResizeObserver,originalDocument=globalThis.document;
let resized,disconnected=false,rect={left:0,top:0,width:900,height:400};
const listeners=new Map(),output={},search={},results={hidden:true};
const viewportStage={...element(),getBoundingClientRect:()=>rect,
  parentElement:{querySelector:()=>output},closest:()=>({querySelector:q=>q==='[data-graph-search]'?search:results}),
  addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
globalThis.ResizeObserver=class{constructor(fn){resized=fn;}observe(){}disconnect(){disconnected=true;}};
globalThis.document={addEventListener(){},removeEventListener(){}};
try{
  const graph={nodes:[{id:'a',x:100,y:100},{id:'b',x:600,y:200}],edges:[]},state={};
  const viewport=bindGraphViewport(viewportStage,graph,state,{});
  assert.equal(state.autoFit,true);
  rect={...rect,width:288,height:360};resized();
  assert.deepEqual(state.view,graphFitView(graph,288,360),'Resize recomputes fit instead of clipping nodes at a desktop scale');
  viewport.zoom(1.2);assert.equal(state.autoFit,false);
  const scale=rect.width/state.view.width;
  rect={...rect,width:700,height:400};resized();
  assert(Math.abs(rect.width/state.view.width-scale)<1e-8,'Manual zoom survives resizing');
  viewport.fit();assert.equal(state.autoFit,true);
  assert.deepEqual(state.view,graphFitView(graph,700,400));
  viewport.dispose();assert(disconnected);assert.equal(listeners.size,0);
}finally{
  if(originalObserver===undefined)delete globalThis.ResizeObserver;else globalThis.ResizeObserver=originalObserver;
  if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
}
console.log('Graph viewport verified: responsive auto-fit, preserved manual zoom and listener cleanup.');
