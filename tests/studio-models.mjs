import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {aggregateValues,studioExample,strategyExample,VISUAL_VIEWS,inferColumns,viewData,quantile,histogram,boxSummary,checkQuote,reasoningMetrics} from '../src/studio-models.js';
import {renderChart,csvText} from '../src/studio-charts.js';
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
const means=reasoningMetrics('averages');assert.equal(means.mean,1092);assert.equal(means.median,120);
assert.match(csvText([{name:'A;B',quote:'"x"'}]),/"A;B"/);assert.ok(csvText([{formula:'=1+1'}]).includes("'=1+1"));
const examples=Object.fromEntries(['conversation','assistant','evaluation','reasoning','visualization','journey'].map(k=>[k,studioExample(k)]));
const contract=spawnSync('php',['tests/studio.php'],{input:JSON.stringify(examples),encoding:'utf8'});assert.equal(contract.status,0,contract.stdout+contract.stderr);process.stdout.write(contract.stdout);
console.log('Studio models verified: all 15 views, full aggregates, nulls, negatives, safe text, quote checks and four interpretation lessons.');
