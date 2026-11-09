import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {industryPair,INDUSTRY_KEYS} from '../src/journey-industry-examples.js';
import {journeyElements,bindingSystems,phaseDependencies,missingDependencies,reconcileInfrastructure,copyInfrastructure} from '../src/journey-landscape-models.js';
import {copyBlueprintStage} from '../src/blueprint-models.js';
const pairs=Object.fromEntries(INDUSTRY_KEYS.map(key=>[key,industryPair(key)]));
for(const [key,{journey:j,landscape:l}] of Object.entries(pairs)){
 assert.equal(j.stages.length,7);assert.equal(j.blueprint.items.length,28);assert.equal(missingDependencies(j,l).length,0);
 for(const b of j.infrastructure.bindings){assert(journeyElements(j,b.stage).some(el=>el.element===b.element&&(el.blueprint||'')===(b.blueprint||'')));for(const id of bindingSystems(b,l))assert(l.systems.some(s=>s.id===id));}
 assert(phaseDependencies(j,j.stages[0].id,l).systems.size>1);
 assert(missingDependencies(j,{...l,systems:[],stores:[]}).length>0);
 const copy=structuredClone(j),before=copy.blueprint.items.filter(i=>i.stage===j.stages[0].id);copy.blueprint=copyBlueprintStage(copy.blueprint,j.stages[0].id,'copy');copy.stages.push({...j.stages[0],id:'copy'});const after=copy.blueprint.items.filter(i=>i.stage==='copy');copyInfrastructure(copy,j.stages[0].id,'copy',new Map(before.map((item,i)=>[item.id,after[i].id])));assert.equal(copy.infrastructure.bindings.filter(b=>b.stage==='copy').length,8);
 copy.stages=copy.stages.filter(s=>s.id!==j.stages[1].id);copy.blueprint.items=copy.blueprint.items.filter(i=>i.stage!==j.stages[1].id);reconcileInfrastructure(copy);assert(!copy.infrastructure.bindings.some(b=>b.stage===j.stages[1].id));
 const moved=copy.blueprint.items[0];moved.stage=copy.stages.at(-1).id;reconcileInfrastructure(copy);assert.equal(copy.infrastructure.bindings.find(b=>b.blueprint===moved.id).stage,moved.stage);
 assert(!industryPair(key,{blueprint:false}).journey.blueprint);
 console.log(key+': '+l.systems.length+' systems, '+l.stores.length+' stores, '+l.flows.length+' flows, '+j.infrastructure.bindings.length+' valid element bindings');
}
const run=spawnSync('php',['tests/journey-landscape.php'],{input:JSON.stringify(pairs),encoding:'utf8'});assert.equal(run.status,0,run.stdout+run.stderr);process.stdout.write(run.stdout);
