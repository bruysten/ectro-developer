export const JOURNEY_ELEMENTS={phase:'Ganze Phase',goal:'Ziel',action:'Handlung',touchpoint:'Touchpoint',channel:'Kanal',pain:'Hürde',opportunity:'Verbesserung',kpi:'Erfolgskriterium',blueprint:'Blueprint-Aktivität'};
export const bindingKey=b=>[b.stage,b.element,b.blueprint||''].join('|');
export function journeyElements(c,stage){
 const s=c.stages.find(s=>s.id===stage);if(!s)return [];
 return [{stage,element:'phase',text:s.name||'Ganze Phase'},...Object.keys(JOURNEY_ELEMENTS).filter(k=>!['phase','blueprint'].includes(k)).map(element=>({stage,element,text:s[element]})),...(c.blueprint?.items||[]).filter(i=>i.stage===stage).map(i=>({stage,element:'blueprint',blueprint:i.id,text:i.text}))];
}
export function reconcileInfrastructure(c){
 if(!c.infrastructure)return;
 const stages=new Set(c.stages.map(s=>s.id)),items=c.blueprint?new Map(c.blueprint.items.map(i=>[i.id,i.stage])):null;
 c.infrastructure.bindings=c.infrastructure.bindings.filter(b=>b.element==='blueprint'&&items?items.has(b.blueprint):stages.has(b.stage)).map(b=>b.element==='blueprint'&&items?{...b,stage:items.get(b.blueprint)}:b);
}
export function copyInfrastructure(c,from,to,itemMap=new Map()){
 if(!c.infrastructure)return;
 const copies=c.infrastructure.bindings.filter(b=>b.stage===from&&(b.element!=='blueprint'||itemMap.has(b.blueprint))).map(b=>({...structuredClone(b),stage:to,...(b.element==='blueprint'?{blueprint:itemMap.get(b.blueprint)}:{})}));
 c.infrastructure.bindings.push(...copies);
}
export function bindingSystems(binding,landscape){
 const ids=new Set(binding.systems);for(const id of binding.stores){const s=landscape.stores.find(s=>s.id===id);if(s)ids.add(s.system);}return ids;
}
export function phaseDependencies(c,stage,landscape){
 const systems=new Set(),stores=new Set();for(const b of c.infrastructure?.bindings||[])if(b.stage===stage){for(const id of bindingSystems(b,landscape))systems.add(id);for(const id of b.stores)stores.add(id);}return {systems,stores};
}
export function missingDependencies(c,landscape){
 const systems=new Set(landscape.systems.map(s=>s.id)),stores=new Set(landscape.stores.map(s=>s.id));return (c.infrastructure?.bindings||[]).flatMap(b=>[...b.systems.filter(id=>!systems.has(id)).map(id=>({binding:b,id,type:'System'})),...b.stores.filter(id=>!stores.has(id)).map(id=>({binding:b,id,type:'Datenbestand'}))]);
}
