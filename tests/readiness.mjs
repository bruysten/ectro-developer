import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {READINESS,emptyReadiness,readinessReport,readinessComplete} from '../src/readiness-models.js';
import {readinessResultHtml,mountReadiness} from '../src/studio-readiness.js';
assert.equal(READINESS.stages.length,7);assert.equal(READINESS.questions.length,10);assert.equal(READINESS.criteria.length,30);
assert.deepEqual([1,2,3,4,5,6].map(stage=>READINESS.criteria.filter(k=>k.stage===stage).length),[4,5,5,5,5,6]);
assert.deepEqual([...READINESS.questions.flatMap(q=>q.criteria)].sort(),READINESS.criteria.map(k=>k.id).sort(),'Every supplied positive criterion is asked exactly once');
assert(READINESS.questions.every(q=>q.criteria.length===3));
const make=(fn=()=> 'yes')=>({...emptyReadiness(),organization:'Test organization',baseline:'connected',screen:'result',completedAt:'2026-11-09T09:00:00.000Z',answers:Object.fromEntries(READINESS.criteria.map(k=>[k.id,fn(k)]))});
assert.equal(readinessComplete(emptyReadiness()),false);assert(!readinessResultHtml(emptyReadiness()).includes('readiness-stages'));
assert.equal(readinessReport(make()).level,6);assert.equal(readinessReport(make()).ai,true);assert.equal(readinessReport(make()).islands.length,0);
for(let level=1;level<=5;level++){
 const c=make(k=>k.stage<=level?'yes':'no'),r=readinessReport(c);assert.equal(r.level,level);assert(!r.ai);assert.equal(r.next.id,level===5?6:level+1);
 const blocker=READINESS.criteria.find(k=>k.stage===level);c.answers[blocker.id]='partial';assert.equal(readinessReport(c).digital,level-1,'A pilot is not established maturity');
}
const unknown=make(()=> 'unknown');assert(readinessComplete(unknown));assert.equal(readinessReport(unknown).level,null);assert.equal(readinessReport(unknown).unknown,30);assert(readinessReport(unknown).actions.every(k=>k.action.includes('klären')));
const no=make(()=> 'no');no.baseline='analog';assert.equal(readinessReport(no).level,0);no.baseline='connected';assert.equal(readinessReport(no).level,null,'Missing digital foundations never label an unconfirmed organization as analog');
const island=make(k=>k.stage===6?'yes':'no');assert.equal(readinessReport(island).level,null);assert(!readinessReport(island).ai);assert.equal(readinessReport(island).islands.at(-1).id,6);
const chatbot=make(k=>k.id==='ai_chatbots'?'yes':'no');assert(!readinessReport(chatbot).ai,'A chatbot alone never qualifies as an AI organization');
const mixed=make();mixed.answers.integration='no';assert.equal(readinessReport(mixed).level,4);assert(!readinessReport(mixed).ai);assert.equal(readinessReport(mixed).actions[0].id,'integration');
mixed.answers.integration='unknown';assert.equal(readinessReport(mixed).level,4);assert.equal(readinessReport(mixed).unknown,1);
const inconsistent=make();inconsistent.answers.processes='no';assert(readinessReport(inconsistent).contradictions.length>0);
const partial=make();delete partial.answers.cloud;assert(!readinessComplete(partial));assert(!readinessResultHtml(partial).includes('readiness-stages'));
const area=make();area.scope='area';assert(!readinessComplete(area));area.area='Operations';assert(readinessComplete(area));
const hostile=make();hostile.organization='<img src=x onerror=alert(1)>';const html=readinessResultHtml(hostile);assert(!html.includes('<img'));assert(html.includes('&lt;img'));assert.equal((html.match(/class="readiness-stage /g)||[]).length,7);assert(html.includes('readiness-disruption'));assert(html.includes('KI-Modelle entwickeln kontinuierlich neues Wissen'));
// Monotonicity: confirming an additional criterion cannot reduce established digital foundations.
for(let n=0;n<100;n++){const c=make(k=>(n+k.id.length)%3===0?'yes':'partial'),before=readinessReport(c).digital;const key=READINESS.criteria[n%30].id;c.answers[key]='yes';assert(readinessReport(c).digital>=before);}
// Exercise the actual answer handler with the API's legacy empty-array shape.
const c={...emptyReadiness(),organization:'Test',baseline:'islands',screen:'questions',answers:[]},elements=new Map(),inputs=READINESS.questions[0].criteria.map(id=>({dataset:{readinessAnswer:id},value:'partial'}));let changes=0;
const root={innerHTML:'',classList:{add(){},remove(){}},querySelector(q){if(!elements.has(q))elements.set(q,{textContent:'',value:0,disabled:false});return elements.get(q);},querySelectorAll(q){return q==='[data-readiness-answer]'?inputs:[];}};
const dispose=mountReadiness(root,{content:c,changed(){changes++;}});assert(!root.innerHTML.includes('readiness-stages'));assert(elements.get('[data-readiness-next]').disabled);
inputs.forEach(input=>input.onchange());assert.equal(changes,3);assert.deepEqual(JSON.parse(JSON.stringify(c.answers)),Object.fromEntries(inputs.map(i=>[i.dataset.readinessAnswer,'partial'])));assert(!elements.get('[data-readiness-next]').disabled);dispose();
const fixtures={empty:emptyReadiness(),full:make(),unknown,no,area,mixed};
const php=spawnSync('php',['tests/readiness.php'],{input:JSON.stringify(fixtures),encoding:'utf8'});assert.equal(php.status,0,php.stdout+php.stderr);process.stdout.write(php.stdout);
const migration=spawnSync('php',['tests/studio-migration.php','landscape'],{encoding:'utf8'});assert.equal(migration.status,0,migration.stdout+migration.stderr);
console.log('Readiness: seven stages, thirty mapped criteria, gating, AI transition, unknowns, islands, contradictions, escaping, hidden result, resumed answers and legacy migration verified.');
