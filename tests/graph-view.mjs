import assert from 'node:assert/strict';
import {GRAPH_NODE_RADIUS,graphNodePosition,graphEdgeGeometry,bindGraphDrag} from '../src/graph-view.js';

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
const edges=graph.edges.map((e,i)=>{const el=element({edge:String(i)});el.path=element();el.label=element();el.querySelector=q=>q==='path'?el.path:el.label;return el;});
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
assert(edges.slice(0,3).every(e=>e.path.attrs.d),'All incident edges, including incoming edges and loops, follow before release');
assert.equal(edges[3].path.attrs.d,undefined,'Unrelated edges are not redrawn');
assert.equal(edges[0].label.attrs.x,'450');assert.equal(edges[0].label.attrs.y,'262');
assert.equal(changes,0);assert.equal(draws,0,'The stage stays mounted during capture');
const firstPath=edges[0].path.attrs.d;
nodes[0].onpointermove(event(350,260));assert.notEqual(edges[0].path.attrs.d,firstPath);
nodes[0].onpointerup(event(350,260));assert.equal(changes,1);assert.equal(draws,1);
assert.equal(nodes[0].captured,null);assert.deepEqual(chosen,[]);

// Move the other endpoint, then cancel: restore the data and redraw the graph.
nodes[1].onpointerdown(event(600,300));nodes[1].onpointermove(event(650,350));
assert.equal(edges[0].label.attrs.x,'500');
nodes[1].onpointercancel(event(650,350));assert.equal(graph.nodes[1].x,600);assert.equal(graph.nodes[1].y,300);assert.equal(changes,1);assert.equal(draws,2);

// Coordinate-less imports start dragging from their displayed position, without jumping.
const initial=graphNodePosition(graph.nodes[2],2);
nodes[2].onpointerdown(event(initial.x,initial.y));nodes[2].onpointermove(event(initial.x+10,initial.y+5));
assert.equal(graph.nodes[2].x,initial.x+10);assert.equal(graph.nodes[2].y,initial.y+5);
nodes[2].onlostpointercapture(event(0,0));assert.equal(graph.nodes[2].x,undefined);assert.equal(graph.nodes[2].y,undefined);
nodes[0].onpointerdown(event(350,260));nodes[0].onpointerup(event(350,260));assert.deepEqual(chosen,['a']);
nodes[1].onkeydown({key:'Enter',preventDefault(){}});assert.deepEqual(chosen,['a','b']);
assert.equal(changes,1,'Selection, cancellation and capture loss do not save a drag');
console.log('Graph attachment verified: live incoming/outgoing edges, labels, loops, scaled coordinates, imports and drag cancellation.');
