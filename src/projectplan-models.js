import {GOVERNANCE,AI_LEVELS,aiGovernanceReport,govScopeName,governanceContributions,aiAssessmentBasis} from './governance-models.js';
import {READINESS,READINESS_ANSWERS,readinessReport} from './readiness-models.js';
export const PROJECT_TRACKS={it:'IT & Systeme',digital:'Prozesse & Fähigkeiten',ai:'KI & Automatisierung',change:'Menschen & Veränderung'};
export const PROJECT_PHASES={discover:'Klären',pilot:'Pilot',validate:'Prüfen',rollout:'Ausrollen',operate:'Verankern'};
export const TASK_STATUSES={todo:'Offen',doing:'In Arbeit',blocked:'Blockiert',done:'Fertig gemeldet'};
export const STATE_KINDS={landscape:'Systemlandschaft',readiness:'Digitaler Standort',governance:'Governance & AI-Readiness'};
export const emptyProjectPlan=()=>({schemaVersion:1,purpose:'',outcome:'',startDate:'',states:{},stakeholders:[],tasks:[],gates:[]});
// Compare semantics; moving a map node is not an infrastructure transformation.
function semanticRecord(value){if(!value)return value;const {mapPosition,...rest}=value;return rest;}
function companionDifferences(start,target){
 const before=new Map((start.companions||[]).filter(o=>o.kind==='governance').map(o=>[o.id,o])),after=new Map((target.companions||[]).filter(o=>o.kind==='governance').map(o=>[o.id,o]));
 return [...new Set([...before.keys(),...after.keys()])].flatMap(id=>{const a=before.get(id),b=after.get(id);if(!a||!b)return [{title:(b||a).name,change:b?'Neu':'Ablösen',type:'assignments',domain:'governance',before:a,after:b}];return stateDifference({...a,available:true},{...b,available:true}).items.map(item=>({...item,title:b.name+' · '+item.title,domain:'governance'}));});
}
export function stateDifference(start,target){
 if(!start?.available||!target?.available||start.kind!==target.kind)return {available:false,items:[]};
 const a=start.content,b=target.content,items=[];
 const records=(key,title,clean=x=>x)=>{const before=new Map((a[key]||[]).map(x=>[x.id,x])),after=new Map((b[key]||[]).map(x=>[x.id,x]));for(const item of b[key]||[]){const old=before.get(item.id);items.push({type:key,title:title(item,b),change:!old?'Neu':JSON.stringify(clean(old))!==JSON.stringify(clean(item))?'Ändern':'Beibehalten',before:old,after:item});}for(const item of a[key]||[])if(!after.has(item.id))items.push({type:key,title:title(item,a),change:'Ablösen',before:item,after:null});};
 if(start.kind==='landscape'){for(const key of ['systems','stores','flows'])records(key,x=>x.name,semanticRecord);items.push(...companionDifferences(start,target));return {available:true,items};}
 if(start.kind==='governance'){
  for(const q of GOVERNANCE.ai){const old=a.ai.answers[q.id]?.level||'unknown',next=b.ai.answers[q.id]?.level||'unknown';const clean=v=>({level:v?.level||'unknown',evidence:v?.evidence||'',reviewedOn:v?.reviewedOn||'',basis:aiAssessmentBasis(v),assessments:(v?.assessments||[]).map(({id,scope,level,evidence,reviewedOn})=>({id,scope,level,evidence,reviewedOn}))});if(JSON.stringify(clean(a.ai.answers[q.id]))!==JSON.stringify(clean(b.ai.answers[q.id])))items.push({title:q.name,change:old!==next?AI_LEVELS[old]+' → '+AI_LEVELS[next]:'Bezüge & Bewertungen ändern',type:'ai'});}
  if(JSON.stringify(governanceContributions(a))!==JSON.stringify(governanceContributions(b)))items.push({title:'Beitragsbereiche & Gesamtverantwortung',change:'Ändern',type:'assignments'});
  for(const key of ['stakeholders','roles','assignments','quality','rules','lifecycles'])records(key,(x,doc)=>key==='assignments'?(doc.roles.find(r=>r.id===x.role)?.name||'Rolle')+' · '+(doc.stakeholders.find(p=>p.id===x.stakeholder)?.name||'Stakeholder'):key==='quality'?GOVERNANCE.dimensions[x.dimension].name+' · '+(target.companions?.find(o=>o.kind==='landscape')?.content.flows.find(f=>f.id===x.flow)?.name||'Datenfluss'):x.name||x.title,key==='lifecycles'?x=>({...x,nameFromSource:x.nameFromSource??false}):x=>x);
  return {available:true,items,score:[aiGovernanceReport(a).score,aiGovernanceReport(b).score]};
 }
 for(const key of new Set([...Object.keys(a.answers||{}),...Object.keys(b.answers||{})]))if(a.answers?.[key]!==b.answers?.[key])items.push({title:READINESS.criteria.find(q=>q.id===key)?.prompt||key,change:(READINESS_ANSWERS[a.answers?.[key]]||'Offen')+' → '+(READINESS_ANSWERS[b.answers?.[key]]||'Offen'),type:'digital'});
 items.push(...companionDifferences(start,target));return {available:true,items,reports:[readinessReport(a),readinessReport(b)]};
}
export function projectSchedule(tasks){
 const byId=new Map(tasks.map(t=>[t.id,t])),out=new Map(),visiting=new Set();
 const solve=id=>{if(out.has(id))return out.get(id);if(visiting.has(id))throw Error('Abhängigkeiten enthalten einen Kreis.');visiting.add(id);const t=byId.get(id);if(!t)throw Error('Arbeitspaket in Abhängigkeit fehlt.');const start=Math.max(0,...t.depends.map(d=>solve(d).end)),row={start,end:start+Number(t.days||0)};visiting.delete(id);out.set(id,row);return row;};for(const t of tasks)solve(t.id);return {rows:out,duration:Math.max(0,...[...out.values()].map(r=>r.end))};
}
export function projectPlanGaps(c){return c.tasks.flatMap(t=>[...(!t.owner?[{id:t.id,title:t.title,reason:'Verantwortung fehlt'}]:[]),...(!t.criterion.trim()?[{id:t.id,title:t.title,reason:'Abnahmekriterium fehlt'}]:[]),...(t.status==='done'&&!t.evidence.trim()?[{id:t.id,title:t.title,reason:'Ergebnisnachweis fehlt'}]:[])]).concat(c.gates.filter(g=>g.decision!=='go').map(g=>({id:g.id,title:g.title,reason:'Entscheidung: '+({open:'offen',hold:'zurückgestellt',stop:'Stop'}[g.decision]||g.decision)})));}
export function projectStakeholders(states){
 const people=new Map();
 // States are passed start, then target: a person's target role replaces their old suggestion.
 for(const state of states.filter(s=>s?.available)){const docs=state.kind==='governance'?[{content:state.content,name:state.name,id:state.source||state.id}]:(state.companions||[]).filter(o=>o.kind==='governance');for(const doc of docs){const c=doc.content;for(const p of c.stakeholders){const roleNames=[...new Set(c.assignments.filter(a=>a.stakeholder===p.id).map(a=>c.roles.find(r=>r.id===a.role)?.name).filter(Boolean))];people.set(doc.id+':'+p.id,{id:crypto.randomUUID(),name:p.name,role:roleNames.join(', ').slice(0,180),source:(state.name+' · Stand '+state.version).slice(0,200)});}}}
 return [...people.values()].filter((p,i,all)=>all.findIndex(q=>q.name===p.name&&q.role===p.role)===i);
}
export function projectTasksFromDifference(kind,items){return items.filter(i=>i.change!=='Beibehalten').slice(0,60).map(i=>({id:crypto.randomUUID(),title:((i.change==='Neu'?'Einführen':i.change==='Ablösen'?'Ablösen':'Entwickeln')+': '+i.title).slice(0,180),track:i.domain==='governance'||kind==='governance'?(i.type==='ai'?'ai':['stakeholders','roles','assignments'].includes(i.type)?'change':'digital'):kind==='landscape'?'it':'digital',phase:'pilot',status:'todo',owner:'',days:1,depends:[],criterion:'',evidence:'',notes:'Aus Start-/Zielvergleich abgeleitet. Aufwand und Abnahme sind noch zu planen.'}));}
