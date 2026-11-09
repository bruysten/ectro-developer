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
const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
assert.equal(readinessReport(make()).score,7);assert.equal(readinessReport(make()).level,6);assert.equal(readinessReport(make()).ai,true);assert.equal(readinessReport(make()).islands.length,0);
for(let level=1;level<=5;level++){
 const c=make(k=>k.stage<=level?'yes':'no'),r=readinessReport(c);assert.equal(r.level,level);assert.equal(r.score,level+1);assert(!r.ai);assert.equal(r.next.id,level===5?6:level+1);
 const blocker=READINESS.criteria.find(k=>k.stage===level);c.answers[blocker.id]='partial';const changed=readinessReport(c);assert(changed.digital>level-1&&changed.digital<level,'Pilots receive partial credit without counting as full establishment');
}
const unknown=make(()=> 'unknown');assert(readinessComplete(unknown));assert.equal(readinessReport(unknown).score,1);assert.equal(readinessReport(unknown).upperScore,7);assert.equal(readinessReport(unknown).known,0);assert.equal(readinessReport(unknown).unknown,30);assert(readinessReport(unknown).actions.every(k=>k.action.includes('klären')));
const no=make(()=> 'no');no.baseline='analog';assert.equal(readinessReport(no).score,1);assert(readinessReport(no).analog);no.baseline='connected';assert.equal(readinessReport(no).score,1);assert(!readinessReport(no).analog,'An index starting point does not assert an analog working day');
const island=make(k=>k.stage===6?'yes':'no');assert.equal(readinessReport(island).score,1);assert(!readinessReport(island).ai);assert.equal(readinessReport(island).islands.at(-1).id,6);
const chatbot=make(k=>k.id==='ai_chatbots'?'yes':'no');assert.equal(readinessReport(chatbot).score,1);assert(!readinessReport(chatbot).ai,'A chatbot alone cannot bypass missing foundations');
const mixed=make();mixed.answers.integration='no';const mixedReport=readinessReport(mixed);assert.equal(mixedReport.score,5.8);close(mixedReport.position,4.8);assert(!mixedReport.ai);assert.equal(mixedReport.actions[0].id,'integration');assert.equal(mixedReport.contributions[6],0);
mixed.answers.integration='unknown';assert.equal(readinessReport(mixed).score,5.8);assert.equal(readinessReport(mixed).upperScore,7);assert.equal(readinessReport(mixed).unknown,1);
const inconsistent=make();inconsistent.answers.processes='no';assert(readinessReport(inconsistent).contradictions.length>0);assert.equal(readinessReport(inconsistent).score,4.7,'A single foundational gap reduces later contributions continuously rather than dropping the entire result');
const pilots=make(()=> 'partial');assert.equal(readinessReport(pilots).score,3.5);assert.equal(readinessReport(pilots).contributions[6],0);
const aiPilot=make(k=>k.stage===6?'partial':'yes');assert.equal(readinessReport(aiPilot).score,6.5);assert(!readinessReport(aiPilot).ai);
const almostAi=make();almostAi.answers.ai_value='partial';assert.equal(readinessReport(almostAi).score,6.9,'Rounding must not declare the AI stage reached');assert(!readinessReport(almostAi).ai);
const sample=make(()=> 'no');for(const [id,value] of Object.entries({workflows:'yes',processes:'yes',cloud:'yes',acceptance:'yes',data_decisions:'yes',training:'yes'}))sample.answers[id]=value;
close(readinessReport(sample).position,1.35);assert.equal(readinessReport(sample).upperScore,2.3,'Known answers must not create artificial uncertainty through rounding');assert.equal(readinessReport(sample).score,2.3,'Three of four, two of five and one of five produce a concrete intermediate value');
const blockedUnknowns=make(k=>k.stage===1?'no':'unknown');assert.equal(readinessReport(blockedUnknowns).upperScore,1,'Unknown higher capabilities do not erase known missing foundations');
for(const c of [unknown,no,island,chatbot,mixed,pilots,aiPilot,almostAi,sample,blockedUnknowns]){
 const r=readinessReport(c),html=readinessResultHtml(c);assert(Number.isFinite(r.score));assert(r.score>=1&&r.score<=r.upperScore&&r.upperScore<=7);assert(!html.includes('Stand noch offen'));assert(!html.includes('Noch keine durchgängige'));assert(html.includes('readiness-marker'));assert(html.includes('Standort:'));assert(html.includes('Berechnung je Entwicklungsstufe'));
}
assert(readinessResultHtml(unknown).includes('0 von 30 Angaben bekannt'));assert(readinessResultHtml(unknown).includes('readiness-range'));assert(!readinessResultHtml(make()).includes('class="readiness-range"'));
const partial=make();delete partial.answers.cloud;assert(!readinessComplete(partial));assert(!readinessResultHtml(partial).includes('readiness-stages'));
const area=make();area.scope='area';assert(!readinessComplete(area));area.area='Operations';assert(readinessComplete(area));
const hostile=make();hostile.organization='<img src=x onerror=alert(1)>';const html=readinessResultHtml(hostile);assert(!html.includes('<img'));assert(html.includes('&lt;img'));assert.equal((html.match(/class="readiness-stage /g)||[]).length,7);assert(html.includes('readiness-disruption'));assert(html.includes('KI-Modelle entwickeln kontinuierlich neues Wissen'));
// All response improvements are monotone; unknown resolutions stay in the disclosed range.
let seed=173;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
for(let n=0;n<300;n++){
 const c=make(()=>['no','partial','yes','unknown'][Math.floor(random()*4)]),before=readinessReport(c);
 const resolved={...c,answers:Object.fromEntries(Object.entries(c.answers).map(([id,v])=>[id,v==='unknown'?(random()<.5?'yes':'no'):v]))};const resolvedReport=readinessReport(resolved);
 assert(resolvedReport.position>=before.position-1e-9&&resolvedReport.position<=before.upperPosition+1e-9);
 for(const k of READINESS.criteria){const improved={...c,answers:{...c.answers,[k.id]:'yes'}},after=readinessReport(improved);assert(after.position>=before.position-1e-9);assert(after.score>=before.score);assert(after.upperPosition>=before.upperPosition-1e-9);}
}
// Basic working-day self-description never manufactures or removes score points.
for(const baseline of ['analog','islands','connected','unknown'])assert.equal(readinessReport({...sample,baseline}).score,2.3);
// Exercise the actual answer handler with the API's legacy empty-array shape.
const c={...emptyReadiness(),organization:'Test',baseline:'islands',screen:'questions',answers:[]},elements=new Map(),inputs=READINESS.questions[0].criteria.map(id=>({dataset:{readinessAnswer:id},value:'partial'}));let changes=0;
const root={innerHTML:'',classList:{add(){},remove(){}},querySelector(q){if(!elements.has(q))elements.set(q,{textContent:'',value:0,disabled:false});return elements.get(q);},querySelectorAll(q){return q==='[data-readiness-answer]'?inputs:[];}};
const dispose=mountReadiness(root,{content:c,changed(){changes++;}});assert(!root.innerHTML.includes('readiness-stages'));assert(elements.get('[data-readiness-next]').disabled);
inputs.forEach(input=>input.onchange());assert.equal(changes,3);assert.deepEqual(JSON.parse(JSON.stringify(c.answers)),Object.fromEntries(inputs.map(i=>[i.dataset.readinessAnswer,'partial'])));assert(!elements.get('[data-readiness-next]').disabled);dispose();
const fixtures={empty:emptyReadiness(),full:make(),unknown,no,area,mixed};
const php=spawnSync('php',['tests/readiness.php'],{input:JSON.stringify(fixtures),encoding:'utf8'});assert.equal(php.status,0,php.stdout+php.stderr);process.stdout.write(php.stdout);
const migration=spawnSync('php',['tests/studio-migration.php','landscape'],{encoding:'utf8'});assert.equal(migration.status,0,migration.stdout+migration.stderr);
console.log('Readiness: seven stages, thirty mapped criteria, continuous scoring, foundation caps, AI transition, uncertainty bounds, monotonicity, contradictions, escaping, hidden result, resumed answers and legacy migration verified.');
