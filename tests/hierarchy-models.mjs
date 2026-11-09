import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {buildHierarchy,hierarchyExample,HIERARCHY_KINDS,partitionHierarchy,hyperbolicFocus} from '../src/hierarchy-models.js';
import {renderChart} from '../src/studio-charts.js';
import {chartStylePreset} from '../src/studio-style.js';
const example=hierarchyExample(),before=JSON.stringify(example),tree=buildHierarchy(example.source,example.view),svgs=[];
assert.equal(tree.root.value,204);assert.equal(tree.root.records,11);assert.equal(tree.depth,3);
for(const node of tree.nodes)if(node.children.length)assert.equal(node.value,node.children.reduce((s,n)=>s+n.value,0));
const partitions=partitionHierarchy(tree.root);
for(const node of tree.nodes)if(node.children.length){const p=partitions.get(node.id);assert(Math.abs(node.children.reduce((sum,c)=>{const q=partitions.get(c.id);return sum+q.end-q.start;},0)-(p.end-p.start))<1e-12);}
for(const kind of HIERARCHY_KINDS)for(const preset of ['clear','dark','contrast'])for(const focus of [tree.root,...tree.root.children,tree.nodes.at(-1)]){
 const view={...example.view,kind},style={...chartStylePreset(preset),hierarchyDepth:2,elementGap:12},result=renderChart(example.source,view,style,{focus:focus.id});
 assert.equal(result.hierarchy.root.value,204);assert.equal(result.focus,focus.id);assert.equal(result.filtered,11);assert.equal(result.rows.length,tree.nodes.length-1);
 assert.doesNotMatch(result.html,/NaN|Infinity|undefined/);assert(result.html.includes('data-h-focus='));
 svgs.push(result.html.match(/<svg\b[\s\S]*?<\/svg>/)[0]);
 const styled=renderChart(example.source,view,{...style,treeOrder:'value',treeSpacing:1.5,hierarchyLabels:false});assert.deepEqual(styled.rows,result.rows,'Styling/focus never changes exported values');
}
assert.equal(JSON.stringify(example),before);
const edges={rows:[{source:'a',target:'b',source_label:'Root',target_label:'Child'},{source:'a',target:'c'},{source:'a',target:'b'},{source:'d',target:'e'},{source:'x',target:null}]};
const edgeView={kind:'sunburst',hierarchyMode:'edges',x:'source',target:'target',aggregate:'count'},forest=buildHierarchy(edges,edgeView);
assert.equal(forest.root.children.length,2);assert.equal(forest.root.value,3);assert.equal(forest.missing,1);assert.equal(forest.nodes.find(n=>n.name==='Child').value,1);
for(const rows of [[{source:'a',target:'a'}],[{source:'a',target:'b'},{source:'b',target:'a'}],[{source:'r',target:'s'},{source:'a',target:'b'},{source:'b',target:'a'}]])assert.throws(()=>buildHierarchy({rows},edgeView),/Kreis/);
assert.throws(()=>buildHierarchy({rows:[{source:'a',target:'c'},{source:'b',target:'c'}]},edgeView),/mehrere/);
assert.throws(()=>buildHierarchy({rows:Array.from({length:14},(_,i)=>({source:String(i),target:String(i+1)}))},edgeView),/12 Ebenen/);
assert.throws(()=>buildHierarchy({rows:Array.from({length:501},(_,i)=>({g:'n'+i}))},{levels:['g'],aggregate:'count'}),/500 Knoten/);
for(const aggregate of ['average','median','min','max','none'])assert.throws(()=>buildHierarchy(example.source,{...example.view,aggregate}),/Anzahl oder Summe/);
for(const v of [-1,Infinity,NaN,'7'])assert.throws(()=>buildHierarchy({rows:[{g:'A',v}]},{levels:['g'],aggregate:'sum',y:'v'}),/nichtnegative/);
assert.throws(()=>buildHierarchy(example.source,{...example.view,levels:['bereich','bereich']}),/unterschiedliche/);
assert.throws(()=>buildHierarchy(example.source,{...example.view,levels:['missing']}),/Hierarchiespalten/);
const missing=buildHierarchy({rows:[{a:null,b:'B',v:0},{a:'A',b:'B',v:null}]},{levels:['a','b'],aggregate:'sum',y:'v'});assert.equal(missing.root.value,0);assert.equal(missing.root.records,2);assert.equal(missing.missing,1);assert(missing.nodes.some(n=>n.name==='(Ohne Angabe)'));
const filtered=renderChart(example.source,{...example.view,filterColumn:'bereich',filter:'Medien'});assert.equal(filtered.filtered,4);assert.equal(filtered.hierarchy.root.value,86);
const hostile=renderChart({rows:[{a:'<script>alert(1)</script>',v:2}]},{kind:'sunburst',levels:['a'],y:'v',aggregate:'sum'});assert(!hostile.html.includes('<script>'));assert(hostile.html.includes('&lt;script&gt;'));
const origin=hyperbolicFocus({x:.4,y:.2},{x:.4,y:.2});assert(Math.hypot(origin.x,origin.y)<1e-12);
const distance=(a,b)=>Math.acosh(1+2*((a.x-b.x)**2+(a.y-b.y)**2)/((1-a.x*a.x-a.y*a.y)*(1-b.x*b.x-b.y*b.y)));
for(const z of [{x:0,y:0},{x:.4,y:.3},{x:-.9,y:.1}]){const a={x:.3,y:-.2},b={x:-.2,y:.4},q=hyperbolicFocus(z,a),r=hyperbolicFocus(b,a);assert(Math.hypot(q.x,q.y)<1);assert(Math.abs(distance(z,b)-distance(q,r))<1e-10,'Poincaré focus preserves hyperbolic distance');}
const parsed=spawnSync('python3',['-c','import json,sys,xml.etree.ElementTree as E;[E.fromstring(s) for s in json.load(sys.stdin)]'],{input:JSON.stringify(svgs),encoding:'utf8'});assert.equal(parsed.status,0,parsed.stderr);
console.log(`Hierarchy views verified: ${svgs.length} standalone SVGs, all five views/presets/focus levels, conserved totals, Poincaré isometry, forests, duplicate edges, cycles, depth/node limits, missing/zero/hostile data and source immutability.`);

const deep={rows:Array.from({length:11},(_,i)=>({source:String(i),target:String(i+1)}))};const deepTree=buildHierarchy(deep,edgeView);for(const node of deepTree.nodes){const output=renderChart(deep,{...edgeView,kind:'hyperbolic'},{treeSpacing:1.5},{focus:node.id});assert.doesNotMatch(output.html,/NaN|Infinity/);}

const singleton=buildHierarchy({rows:[{source:null,target:'Einzeln'}]},edgeView);assert.equal(singleton.root.value,1);assert.equal(singleton.root.children[0].name,'Einzeln');assert.throws(()=>buildHierarchy({rows:[{source:null,target:'a'},{source:'b',target:'a'}]},edgeView),/Wurzel und Kind/);
