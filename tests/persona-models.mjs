import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {PERSONA_MODELS,PERSONA_FIELDS,personaDraft,personaExample,personaComparison,applyPersonaToJourney,personaInitials} from '../src/persona-models.js';
const content=personaExample(),profile={id:'a'.repeat(32),version:3,content},journey={persona:{name:'Before'},stages:[{id:'phase',name:'Start',evidenceType:'observed'}],source:null};
const applied=applyPersonaToJourney(journey,profile);assert.equal(journey.persona.name,'Before');assert.equal(applied.personaRef.version,3);assert.deepEqual(applied.stages,journey.stages);profile.content.goal='Library changed';assert.notEqual(applied.persona.goal,profile.content.goal);assert.notEqual(applied.personaSnapshot.goal,profile.content.goal);
const a={id:'a',content:personaExample()},b={id:'b',content:personaExample(true)};assert(personaComparison([a,b],true).some(row=>row.key==='goal'));assert.equal(personaComparison([a,a],true).length,0);assert(personaComparison([a,b]).every(row=>row.values.length===2));
const model=personaDraft({model:'complete',fields:{thinks:'A retained observation',questions:'Still open'}});for(const key of Object.keys(PERSONA_MODELS)){model.model=key;assert.equal(personaDraft(model).fields.thinks,'A retained observation');}
assert.equal(personaInitials('Alex Weber'),'AW');assert.equal(personaInitials(''),'?' );assert.equal(personaDraft({model:'__proto__'}).model,'simple');assert(Object.keys(PERSONA_FIELDS).every(key=>typeof personaDraft().fields[key]==='string'));
assert.equal(personaInitials('Alex · Weiterbildung'),'A');assert.equal(personaDraft(null).model,'simple');assert.deepEqual(personaDraft({evidence:[null,{source:12,note:{}}]}).evidence,[{source:'',note:''}]);
const fixtures=Object.fromEntries(Object.keys(PERSONA_MODELS).map(model=>[model,{...personaExample(),model,fields:{...personaDraft().fields,needs:'Clear guidance',thinks:'Kept across every model'}}]));
const result=spawnSync('php',['tests/personas.php'],{input:JSON.stringify(fixtures),encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);process.stdout.write(result.stdout);
console.log('Persona models verified: all five models, lossless view switching, immutable journey snapshots and explicit comparison gaps.');
