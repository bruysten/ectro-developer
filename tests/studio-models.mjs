import './persona-models.mjs';
import './studio-visualization.mjs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {aggregateValues,studioExample,strategyExample,VISUAL_VIEWS,inferColumns,viewData,quantile,histogram,boxSummary,checkQuote,reasoningMetrics} from '../src/studio-models.js';
import {renderChart,csvText} from '../src/studio-charts.js';
import {samplingOverviewHtml,samplingResultHtml} from '../src/studio-sampling.js';
const data={columns:inferColumns([{g:'A',v:10},{g:'A',v:null},{g:'B',v:-5}]),rows:[{g:'A',v:10},{g:'A',v:null},{g:'B',v:-5}]};
assert.deepEqual(viewData(data,{x:'g',y:'v',kind:'bar',aggregate:'average'}).rows,[{g:'A',v:10},{g:'B',v:-5}]);
assert.deepEqual(viewData(data,{x:'g',y:'v',kind:'bar',aggregate:'count'}).rows,[{g:'A',Anzahl:2},{g:'B',Anzahl:1}]);
assert.equal(quantile([1,2,3,4],.5),2.5);assert.equal(boxSummary([1,2,3,4,100]).outliers[0],100);
assert.equal(histogram([-5,-1,0,3,3,5]).reduce((s,b)=>s+b.count,0),6);assert.equal(histogram([4,4,4])[0].count,3);
const mixed={rows:[{x:'A',series:'one',v:0},{x:'B',series:'two',v:5}],columns:[]};
const heat=renderChart(mixed,{kind:'heatmap',x:'x',y:'v',series:'series',aggregate:'sum'}).html;
assert.match(heat,/kein Wert/);assert.match(heat,/>0<\/text>/);assert.match(heat,/–/);
assert.throws(()=>renderChart(data,{kind:'donut',x:'g',y:'v',aggregate:'sum'}),/Negative/);
assert.throws(()=>renderChart(data,{kind:'scatter',x:'g',y:'v',aggregate:'none'}),/numerische/);
assert.throws(()=>renderChart({rows:Array.from({length:61},(_,i)=>({g:'g'+i,v:i})),columns:[]},{kind:'bar',x:'g',y:'v',aggregate:'sum'}),/61 Kategorien/);
assert.throws(()=>aggregateValues([1e308,1e308],'sum'),/Summe/);assert.equal(aggregateValues([1e308,1e308],'average'),1e308);
assert.throws(()=>histogram([-1e308,1e308]),/Wertebereich/);
const constant=renderChart({rows:[{x:5,y:2},{x:5,y:3}],columns:[]},{kind:'scatter',x:'x',y:'y',aggregate:'none'}).html;assert.ok(!constant.includes('NaN'));
const base=studioExample('visualization'),strategy=strategyExample();
for(const kind of Object.keys(VISUAL_VIEWS)){
 let source=base.source,view={...base.view,kind};
 if(['line','area','column'].includes(kind))view={...view,x:'monat',series:'kanal'};
 if(['stacked','heatmap'].includes(kind))view={...view,x:'monat',series:'kanal'};
 if(kind==='scatter')view={...view,x:'kunden',y:'umsatz'};
 if(kind==='network'){source={rows:[{source:'A',target:'B'}],columns:[]};view={...view,x:'source',target:'target'};}
 if(kind==='strategy'){source=strategy.source;view=strategy.view;}
 const output=renderChart(source,view);assert.ok(Array.isArray(output.rows),kind);assert.ok(kind==='table'||output.html.length>20,kind);
}
const injected=renderChart({rows:[{g:'<img src=x onerror=alert(1)>',v:2}],columns:[]},{kind:'bar',x:'g',y:'v',aggregate:'sum',title:'<script>alert(1)</script>'}).html;
assert.ok(!injected.includes('<img'));assert.ok(!injected.includes('<script>'));assert.match(injected,/&lt;script&gt;/);
const quote={source:'Q1',quote:'24 Personen'};assert.equal(checkQuote(quote,[{id:'Q1',text:'24 Personen waren dabei.'}]).found,true);assert.equal(checkQuote({...quote,quote:'25 Personen'},[{id:'Q1',text:'24 Personen waren dabei.'}]).found,false);
const simpson=reasoningMetrics('simpson').rows,segments=reasoningMetrics('simpson',{segmented:true}).rows;
assert.ok(simpson[0].quote<simpson[1].quote);assert.ok(segments[0].quote>segments[1].quote&&segments[2].quote>segments[3].quote);
const sample=reasoningMetrics('sampling');assert.equal(sample.sample,.8);assert.equal(sample.population,.5);
assert.equal(sample.sampleTotal,100);assert.equal(sample.populationTotal,1000);
assert.deepEqual(sample.groups.map(g=>[g.sampleShare,g.populationShare,g.rate,g.projected]),[[.8,.2,.9,180],[.2,.8,.4,320]]);
assert.equal(sample.sampleSatisfied,80);assert.equal(sample.projectedSatisfied,500);
assert.equal(reasoningMetrics('sampling',{weighted:true}).value,.5);
assert.equal(reasoningMetrics('sampling',{weighted:false}).value,.8);
const composition=samplingOverviewHtml(sample),raw=samplingResultHtml(sample,false),weighted=samplingResultHtml(sample,true);
assert.match(composition,/Annahme fürs Hochrechnen/);assert.match(composition,/72 von 80 Antworten/);assert.match(composition,/8 von 20 Antworten/);
assert.match(composition,/width:20%/);assert.match(composition,/width:80%/);
assert.match(raw,/80 %<\/strong> zufrieden · 80 von 100 Antworten/);
assert.match(raw,/72 \+ 8 = <strong>80/);
assert.match(weighted,/50 %<\/strong> zufrieden · 500 von 1.000 Kunden/);
assert.match(weighted,/180 \+ 320 = <strong>500/);
assert.match(weighted,/width:18%/);assert.match(weighted,/width:32%/);
assert.equal(samplingOverviewHtml(reasoningMetrics('sampling',{weighted:true})),composition,'Weighting changes group sizes, never the displayed within-group evidence');
assert.deepEqual(sample.rows,reasoningMetrics('sampling').rows,'The experiment never rewrites example evidence');

const means=reasoningMetrics('averages');assert.equal(means.mean,1092);assert.equal(means.median,120);
assert.match(csvText([{name:'A;B',quote:'"x"'}]),/"A;B"/);assert.ok(csvText([{formula:'=1+1'}]).includes("'=1+1"));
const examples=Object.fromEntries(['conversation','assistant','evaluation','reasoning','visualization','journey'].map(k=>[k,studioExample(k)]));
const contract=spawnSync('php',['tests/studio.php'],{input:JSON.stringify(examples),encoding:'utf8'});assert.equal(contract.status,0,contract.stdout+contract.stderr);process.stdout.write(contract.stdout);
console.log('Studio models verified: all 15 views, full aggregates, nulls, negatives, safe text, quote checks and four interpretation lessons.');

// Exercise the real selection handler with the empty record shape returned by
// the API. Named properties on an Array would disappear during JSON saving.
const {mountReasoning}=await import('../src/studio-reasoning.js');
const reasoningContent={lesson:'sampling',responses:[],notes:''},answerInput={value:'1'},elements=new Map();let answerChanges=0;
const exerciseRoot={innerHTML:'',querySelector(selector){if(!elements.has(selector))elements.set(selector,{innerHTML:'',hidden:false,addEventListener(){}});return elements.get(selector);},querySelectorAll:selector=>selector==='[name="interpretation"]'?[answerInput]:[]};
await mountReasoning(exerciseRoot,{content:reasoningContent,state:{},changed:()=>answerChanges++});
answerInput.onchange();assert.deepEqual(JSON.parse(JSON.stringify(reasoningContent.responses)),{sampling:1});
answerInput.value='0';answerInput.onchange();assert.deepEqual(JSON.parse(JSON.stringify(reasoningContent.responses)),{sampling:0});
assert.equal(answerChanges,2);
console.log('Reasoning interpretation verified: first and revised choices survive JSON serialization from an empty API record.');
