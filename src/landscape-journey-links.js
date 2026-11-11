import {bindingSystems,JOURNEY_ELEMENTS} from './journey-landscape-models.js';
export function landscapeJourneyReferences(objects,landscape,scope){
 const out=[];for(const o of objects){const c=o.content;if(c.infrastructure?.landscape!==landscape.id&&landscape.id)continue;for(const b of c.infrastructure?.bindings||[]){let via='';
  if(scope.type==='system'&&bindingSystems(b,landscape).has(scope.id))via=b.systems.includes(scope.id)?'System direkt':(b.flows||[]).some(id=>{const f=landscape.flows.find(f=>f.id===id);return f&&(f.from===scope.id||f.to===scope.id);})?'über zugeordneten Datenfluss':'über Datenbestand';
  if(scope.type==='store'&&b.stores.includes(scope.id))via='Datenbestand direkt';
  if(scope.type==='flow'){const f=landscape.flows.find(f=>f.id===scope.id);if((b.flows||[]).includes(scope.id))via='Datenfluss direkt';else if(f&&(f.stores||[]).some(id=>b.stores.includes(id)))via='über übertragenen Datenbestand';}
  if(!via)continue;const stage=c.stages.find(s=>s.id===b.stage);if(!stage)continue;
  out.push({journey:o.id,journeyName:o.name,version:o.version,persona:c.persona?.name||'Perspektive nicht benannt',stage:stage.id,stageName:stage.name,element:JOURNEY_ELEMENTS[b.element]||b.element,text:b.element==='phase'?stage.name:b.element==='blueprint'?c.blueprint?.items.find(x=>x.id===b.blueprint)?.text||'Aktivität':stage[b.element]||'',via});
 }}return out;
}
