import {landscapeMapSystems} from '../src/landscape-map.js';
import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {landscapeExample,newSystem,removeSystem,removeStore,landscapeImpact,landscapeIssues,landscapeFilter,landscapeRows,SYSTEM_SECTIONS} from '../src/landscape-models.js';
import {blueprintExample,blueprintImpact,reconcileBlueprint,copyBlueprintStage,blueprintRows} from '../src/blueprint-models.js';
import {journeyExample} from '../src/studio-models.js';
const l=landscapeExample(),original=structuredClone(l),j=journeyExample();j.blueprint=blueprintExample(j.stages);
assert.deepEqual([...landscapeFilter(l,{query:'Einwilligungen'})],['system-1']);assert.deepEqual([...landscapeFilter(l,{query:'CSV-Export'})],['system-1','system-3']);assert.deepEqual([...landscapeFilter(l,{realm:'Betrieb'})],['system-2']);assert.equal(landscapeFilter(l,{query:'unfindbar'}).size,0);
assert.equal(l.systems.length,4);assert.equal(l.stores.length,3);assert.equal(l.flows.length,4);assert.equal(landscapeImpact(l,'system-0').size,4);assert.equal(landscapeImpact(l,'system-3').size,1);assert.equal(landscapeImpact({...l,flows:[...l.flows,{from:'system-3',to:'system-0'}]},'system-0').size,4,'Cycles terminate');
const removed=removeSystem(l,'system-0');assert(!removed.stores.some(s=>s.system==='system-0'));assert(!removed.flows.some(f=>f.from==='system-0'||f.to==='system-0'));assert.deepEqual(l,original,'Deleting is immutable until applied');assert(removeStore(l,'store-orders').flows.every(f=>!f.stores.includes('store-orders')));assert.equal(landscapeRows(l,'flows')[0].from,'Website & Shop');assert.equal(landscapeIssues(l).find(i=>i.key==='assumptions').ids.length,4);
const b=j.blueprint,first=b.items[3];assert.equal(blueprintImpact(b,first.id).size,4);const trimmed=reconcileBlueprint(b,j.stages.slice(1));assert.equal(trimmed.items.length,b.items.length-4);assert(trimmed.links.every(l=>trimmed.items.some(i=>i.id===l.from)&&trimmed.items.some(i=>i.id===l.to)));const copied=copyBlueprintStage(b,j.stages[0].id,'copy-stage');assert.equal(copied.items.length,b.items.length+4);assert.equal(copied.links.length,b.links.length+3);assert.equal(new Set(copied.items.map(i=>i.id)).size,copied.items.length);assert.equal(blueprintRows(j).length,20);
const full=structuredClone(l);for(const [key,,,type] of SYSTEM_SECTIONS.flatMap(s=>s.fields))full.systems[0][key]=type==='number'?42:type==='date'?'2026-11-08':'<script> · '+key;
const run=spawnSync('php',[new URL('landscape-blueprint.php',import.meta.url).pathname],{input:JSON.stringify({landscape:full,journey:j}),encoding:'utf8'});assert.equal(run.status,0,run.stdout+run.stderr);process.stdout.write(run.stdout);console.log('Landscape/blueprint models verified: four service layers, shared phases, dependency cycles, cascade cleanup, copies and every system-profile field.');

const migration=spawnSync('php',['tests/studio-migration.php','intermediate'],{encoding:'utf8'});assert.equal(migration.status,0,migration.stdout+migration.stderr);console.log('Intermediate eleven-kind projects migrate to Landscape without widening restricted tools.');

const many=Array.from({length:150},(_,i)=>({...newSystem(),id:'s'+i,name:'System '+i})),mapState={},visible=landscapeMapSystems(many,'',new Set(),mapState);assert.equal(visible.length,120);assert.deepEqual(landscapeMapSystems(many,'s30',new Set(),mapState).map(s=>s.id),visible.map(s=>s.id),'Selecting a visible system never rearranges the large-map subset');assert(landscapeMapSystems(many,'s149',new Set(),mapState).some(s=>s.id==='s149'),'A selected system outside the initial excerpt becomes visible');

// Directions are actual data paths; access describes pull/read, push/write or both.
const {newFlow,flowRoutes,flowPath,flowDescription,flowIncoming,flowOutgoing,flowStoreAllowed}=await import('../src/landscape-models.js');
const base=newFlow('system-0','system-1');assert.equal(base.access,'unknown');assert.deepEqual(flowRoutes({from:'a',to:'b'}),[['a','b']]);
for(const direction of ['forward','reverse','both'])for(const access of ['unknown','read','write','readwrite']){
 const f={...base,id:'tested',direction,access,name:'Test',stores:[]},c={...l,flows:[f]},routes=flowRoutes(f);
 assert.equal(flowIncoming(f,'system-0'),direction!=='forward');assert.equal(flowOutgoing(f,'system-0'),direction!=='reverse');
 assert.equal(landscapeImpact(c,'system-0').size,direction==='reverse'?1:2);assert.equal(landscapeImpact(c,'system-1').size,direction==='forward'?1:2);
 assert.equal(flowStoreAllowed(f,l.stores[0]),direction!=='reverse');assert.equal(flowStoreAllowed(f,l.stores[1]),direction!=='forward');assert(!flowStoreAllowed(f,l.stores[2]));
 assert.equal(landscapeRows(c,'systems')[0].eingehend,direction==='forward'?0:1);assert.equal(landscapeRows(c,'flows')[0].direction,direction);assert.equal(landscapeRows(c,'flows')[0].access,access);
 assert.equal(flowRoutes(JSON.parse(JSON.stringify(f))).length,routes.length);assert(flowPath(f).includes(direction==='both'?'↔':direction==='reverse'?'←':'→'));
}
assert.equal(flowDescription({from:'ERP',to:'CRM',access:'read'}),'CRM liest aus ERP');assert.equal(flowDescription({from:'ERP',to:'CRM',direction:'reverse',access:'write'}),'CRM schreibt nach ERP');assert.equal(flowDescription({from:'ERP',to:'CRM',direction:'both',access:'read'}),'ERP und CRM lesen voneinander');
assert.equal(landscapeFilter({...l,flows:[{...base,access:'write'}]},{query:'schreibend'}).size,2);
console.log('Landscape: all 12 direction/access combinations, legacy defaults, data-source eligibility, reachability, counts, descriptions and CSV semantics verified.');
