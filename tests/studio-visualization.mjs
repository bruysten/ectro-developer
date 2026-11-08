import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {renderChart,formatNumber} from '../src/studio-charts.js';
import {VISUAL_VIEWS,studioExample,strategyExample,inferColumns,viewData,histogram} from '../src/studio-models.js';
import {CHART_STYLE,CHART_PRESETS,normalizeChartStyle,chartStylePreset,contrastRatio} from '../src/studio-style.js';
const base=studioExample('visualization'),strategy=strategyExample(),svgs=[];
let checks=0;
for(const kind of Object.keys(VISUAL_VIEWS)){
 let data=base.source,view={...base.view,kind};
 if(['line','area','column','stacked','heatmap'].includes(kind))view={...view,x:'monat',series:'kanal'};
 if(kind==='scatter')view={...view,x:'kunden',y:'umsatz',series:'kanal'};
 if(kind==='network'){data={rows:[{source:'A',target:'B'},{source:'B',target:'B'},{source:null,target:'A'},{source:'null',target:'B'}],columns:[]};view={...view,x:'source',target:'target'};}
 if(kind==='strategy'){data=strategy.source;view=strategy.view;}
 const before=JSON.stringify(data),expected=renderChart(data,view).rows;
 for(const preset of Object.keys(CHART_PRESETS))for(const pointShape of ['circle','square','diamond']){
  const style={...chartStylePreset(preset),pointShape,radius:9,fontFamily:'serif',lineWidth:4,donutWidth:80},output=renderChart(data,view,style);
  assert.deepEqual(output.rows,expected,`${kind}: styling never changes values`);
  assert.equal(JSON.stringify(data),before,`${kind}: rendering never mutates sources`);
  assert.doesNotMatch(output.html,/(?:NaN|Infinity|undefined)(?:[ ,";])/);
  assert(!output.html.includes('${'),'No uninterpolated template values in output');
  const svg=output.html.match(/<svg\b[\s\S]*?<\/svg>/)?.[0];
  if(kind!=='table'&&kind!=='kpi'){
   assert(svg,kind);assert(svg.includes('Georgia, serif'));assert(svg.includes(`background:${style.background}`));
   svgs.push(svg);
  }
  const empty=renderChart({...data,rows:[]},view,style);assert.equal(empty.rows.length,0);assert.match(empty.html,/Keine passenden Daten/);
  const filtered=renderChart(data,{...view,filterColumn:view.x,filter:'not-found-unique'},style);assert.equal(filtered.rows.length,0);
  checks++;
 }
 if(['line','area','column','stacked','heatmap','strategy'].includes(kind)){
  const noLegend=renderChart(data,view,{showLegend:false,showGrid:false}).html;
  assert(!noLegend.includes('class="studio-legend"'));if(kind!=='heatmap')assert(noLegend.includes('stroke="none"'));
 }
}
const parsed=spawnSync('python3',['-c','import json,sys,xml.etree.ElementTree as E; a=json.load(sys.stdin); [E.fromstring(s) for s in a]; print(len(a))'],{input:JSON.stringify(svgs),encoding:'utf8'});
assert.equal(parsed.status,0,parsed.stderr);assert.equal(Number(parsed.stdout),svgs.length,'Every styled SVG is independently well-formed XML');
const data={rows:[{g:'A',v:2,s:'one'},{g:'A',v:4,s:'one'},{g:'B',v:null,s:'two'}],columns:[]};
for(const [aggregate,expected] of [['sum',6],['average',3],['median',3],['min',2],['max',4],['count',2]]){
 const result=viewData(data,{kind:'column',x:'g',y:'v',series:'s',aggregate});assert.equal(result.rows[0][aggregate==='count'?'Anzahl':'v'],expected);
 assert.equal(result.rows[1][aggregate==='count'?'Anzahl':'v'],aggregate==='count'?1:null);
}
for(const bad of [{x:'v',y:'v'},{x:'g',series:'v',y:'v'},{x:'g',series:'g',y:'v'}])assert.throws(()=>viewData(data,{kind:'column',aggregate:'sum',...bad}),/unterschiedliche|andere Spalte/);
assert.throws(()=>renderChart(data,{kind:'line',x:'missing',y:'v',aggregate:'sum'}),/nicht vorhanden/);
assert.throws(()=>renderChart(data,{kind:'line',x:'g',y:'v',series:'s',aggregate:'none'}),/Mehrere Werte/);
assert.throws(()=>renderChart(data,{kind:'heatmap',x:'g',y:'v',aggregate:'sum'}),/zweite Dimension/);
assert.throws(()=>renderChart(data,{kind:'strategy',x:'g',y:'v',aggregate:'sum'}),/Angebote/);
assert.throws(()=>renderChart({rows:[{g:'A',v:6,s:'a'}]}, {kind:'strategy',x:'g',y:'v',series:'s',aggregate:'sum'}),/0 bis 5/);
for(const kind of ['donut','treemap'])for(const values of [[0,0],[-1,3]])assert.throws(()=>renderChart({rows:values.map((v,i)=>({g:String(i),v}))},{kind,x:'g',y:'v',aggregate:'sum'}),/positive Gesamtsumme|Negative/);
for(const kind of ['stacked','area'])assert.throws(()=>renderChart({rows:[{g:'A',v:-1}]},{kind,x:'g',y:'v',aggregate:'sum'}),/nichtnegative/);
assert.throws(()=>histogram([0,Number.MIN_VALUE]),/Wertebereich/);
const safe=normalizeChartStyle({background:'url(https://bad.test)',text:'" onload="x',fontFamily:'__proto__',pointShape:'<script>',fontSize:Infinity,radius:-5,palette:['#abcdef','url(x)']});
assert.equal(safe.background,CHART_STYLE.background);assert.equal(safe.fontFamily,'sans');assert.equal(safe.fontSize,12);assert.equal(safe.radius,0);assert.equal(safe.palette[0],'#abcdef');assert.equal(safe.palette[1],CHART_STYLE.palette[1]);
const hostile=renderChart(base.source,base.view,{background:'url(https://bad.test)',fontFamily:'<script>',text:'" onload="x'}).html;assert(!hostile.includes('bad.test'));assert(!hostile.includes('onload'));
assert(formatNumber(1e100).length<20,'Very large values use a readable scientific label');
assert.equal(contrastRatio('#000000','#ffffff'),21);assert.equal(contrastRatio('#abcdef','#abcdef'),1);
const one=normalizeChartStyle(),two=normalizeChartStyle();one.palette[0]='#ffffff';assert.equal(two.palette[0],CHART_STYLE.palette[0]);
console.log(`Visualization audit: ${checks} view/preset/shape combinations, ${svgs.length} XML-valid SVGs, all aggregates, empty/filter states, invalid mappings, signed data and safe styling passed.`);
const network=renderChart({rows:[{source:'null',target:'B'},{source:null,target:'B'},{source:'B',target:'B'}]}, {kind:'network',x:'source',target:'target'}, {lineWidth:6,pointSize:9});
assert.match(network.html,/markerUnits="userSpaceOnUse"/);
assert.equal((network.html.match(/marker-end=/g)||[]).length,2,'Null endpoints never create a phantom edge to a node called null');
assert.match(network.html,/1 unvollständige Beziehungen/);
assert.match(network.html,/ C/,'Self loops remain visible');
assert.throws(()=>renderChart({rows:[{source:null,target:null}]},{kind:'network',x:'source',target:'target'}),/keine Knoten/);
assert.throws(()=>renderChart({rows:Array.from({length:13},(_,i)=>({x:String(i),s:'one',v:i}))},{kind:'heatmap',x:'x',y:'v',series:'s',aggregate:'sum'}),/13 Kategorien/);
const sparse=renderChart({rows:[{x:'1',s:'A',v:1},{x:'2',s:'A',v:null},{x:'3',s:'A',v:3}]},{kind:'line',x:'x',y:'v',series:'s',aggregate:'sum'});
assert.equal((sparse.html.match(/<polyline /g)||[]).length,2,'Missing values break a line instead of inventing interpolation');

// Spacing changes marks, never values, totals, bin limits or source order.
const gapSvgs=[];
for(const kind of ['donut','bar','column','stacked','histogram','heatmap','treemap','kpi']){
 const view={...base.view,kind,...(['stacked','heatmap'].includes(kind)?{x:'monat',series:'kanal'}:{})};
 const original=renderChart(base.source,view,{elementGap:0});
 for(const elementGap of [8,20]){const spaced=renderChart(base.source,view,{elementGap});assert.deepEqual(spaced.rows,original.rows);assert.deepEqual(spaced.detailRows,original.detailRows);assert.notEqual(spaced.html,original.html,kind+' implements spacing');assert(!/NaN|Infinity/.test(spaced.html));const svg=spaced.html.match(/<svg\b[\s\S]*?<\/svg>/)?.[0];if(svg)gapSvgs.push(svg);}
}
const parseGaps=spawnSync('python3',['-c','import json,sys,xml.etree.ElementTree as E;[E.fromstring(s) for s in json.load(sys.stdin)]'],{input:JSON.stringify(gapSvgs),encoding:'utf8'});assert.equal(parseGaps.status,0,parseGaps.stderr);
const tiny={rows:[{g:'Groß',v:1000000},{g:'Klein',v:.001}]};
const ring=renderChart(tiny,{kind:'donut',x:'g',y:'v',aggregate:'sum'},{elementGap:20});
for(const match of ring.html.matchAll(/stroke-dasharray="([^"]+)"/g))assert(Number(match[1].split(' ')[0])>0,'Tiny positive segments stay visible');
const singleRing=renderChart({rows:[{g:'Einzeln',v:5}]},{kind:'donut',x:'g',y:'v',aggregate:'sum'},{elementGap:20});assert.match(singleRing.html,/stroke-dashoffset="0"/,'A single segment has no artificial split');
assert.equal(normalizeChartStyle({elementGap:999}).elementGap,20);assert.equal(normalizeChartStyle({elementGap:-1}).elementGap,0);assert.equal(normalizeChartStyle({elementGap:'8'}).elementGap,0);
console.log('Spacing verified for eight views, signed bars, tiny shares, a full single ring and unchanged source/aggregate values.');
