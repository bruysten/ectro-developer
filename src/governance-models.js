import defaultContributions from '../app/governance-contributions.json' with {type:'json'};
import catalog from '../app/governance-catalog.json' with {type:'json'};
import {flowDirection} from './landscape-models.js';
export const GOVERNANCE=catalog;
export const RACI=Object.fromEntries(defaultContributions.map(x=>[x.id,x.label]));
export const governanceContributions=c=>c.contributions||defaultContributions;
export const governanceContribution=(c,id)=>governanceContributions(c).find(x=>x.id===id);
export const governanceContributionLabel=(c,id)=>{const x=governanceContribution(c,id);return x?x.code+' · '+x.label:'Bereich nicht mehr verfügbar';};
export const governanceAccountable=(c,a)=>!!governanceContribution(c,a.raci)?.accountable;
export const QUALITY_LEVELS={unknown:'Noch nicht beurteilt',unfit:'Nicht geeignet',limited:'Bedingt geeignet',fit:'Geeignet'};
export const LIFECYCLE_ACTIONS={collect:'Erheben',store:'Speichern',edit:'Verarbeiten',use:'Nutzen',share:'Weitergeben',archive:'Archivieren',delete:'Löschen'};
export const AI_LEVELS={unknown:'Noch nicht beurteilt',none:'Noch nicht',planned:'Geplant',pilot:'Im Pilot',managed:'Im Betrieb',proven:'Nachweislich wirksam'};
export const GOV_VIEWS={overview:'Überblick',roles:'Rollen',quality:'Qualität',rules:'Regeln',lifecycle:'Lebenszyklus',ai:'AI-Readiness'};
export const GOVERNANCE_STATUSES={unknown:'Offen',good:'Im Ziel',warning:'Prüfen',bad:'Handlungsbedarf',stale:'Veraltet'};
export const govId=()=>crypto.randomUUID();
export const today=()=>new Date().toISOString().slice(0,10);
export const emptyGovernance=()=>({schemaVersion:1,contributions:structuredClone(defaultContributions),organization:'',landscape:'',readiness:'',sandbox:null,stakeholders:[],roles:structuredClone(catalog.roles),assignments:[],quality:[],rules:[],lifecycles:[],journeyLinks:[],ai:{useCase:'',scope:'Gesamte Organisation',answers:{}}});
export function govScopeKey(scope){return scope.type+':'+scope.id;}
export function govResources(l){return [{type:'organization',id:'',name:'Gesamte Organisation'},...(l?.systems||[]).map(s=>({type:'system',id:s.id,name:s.name})),...(l?.stores||[]).map(s=>({type:'store',id:s.id,name:s.name})),...(l?.flows||[]).map(s=>({type:'flow',id:s.id,name:s.name}))];}
export function govScopeName(scope,l){return govResources(l).find(r=>r.type===scope.type&&r.id===scope.id)?.name||'Verweis nicht mehr verfügbar';}
export function ageDays(date,at=today()){if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;const stamp=Date.parse(date+'T00:00:00Z');if(!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==date)return null;const n=(Date.parse(at+'T00:00:00Z')-stamp)/86400000;return Number.isFinite(n)?n:null;}
export function qualityResult(q,at=today()){
 const numeric=Number.isFinite(q.passed)&&Number.isFinite(q.total)&&q.total>0&&q.passed>=0&&q.passed<=q.total,percent=numeric?q.passed/q.total*100:null;
 const age=ageDays(q.measuredOn,at),stale=age!==null&&age>=0&&Number.isFinite(q.maxAgeDays)&&age>q.maxAgeDays;
 let status=percent===null?'unknown':percent>=q.target?'good':'bad';
 if(q.suitability==='unfit')status='bad';else if(q.suitability==='limited'&&status!=='bad')status='warning';else if(q.suitability==='fit'&&status==='unknown')status='warning';
 if(age===null||age<0||!q.evidence?.trim())status=status==='bad'?'bad':'unknown';else if(stale&&status!=='bad')status='stale';
 return {percent,status,age,stale,numeric,evidence:!!q.evidence?.trim(),label:GOVERNANCE_STATUSES[status]};
}
export function flowQuality(c,flow,at=today()){
 const measurements=c.quality.filter(q=>q.flow===flow),results=measurements.map(q=>({...qualityResult(q,at),measurement:q}));
 // One failing dimension cannot be hidden by averaging better dimensions.
 let status=['bad','stale','warning','unknown','good'].find(s=>results.some(r=>r.status===s))||'unknown';
 if(status==='good'&&new Set(measurements.map(q=>q.dimension)).size<6)status='unknown';
 return {status,results,measured:new Set(measurements.map(q=>q.dimension)).size,total:6,label:GOVERNANCE_STATUSES[status]};
}
// Shared by the form and direct board moves: validate before changing any assignment.
export function saveGovernanceAssignment(c,next,existingId=''){
 const current=existingId?c.assignments.find(a=>a.id===existingId):null;
 if(existingId&&!current)throw Error('Diese Zuordnung ist nicht mehr vorhanden.');
 if(!c.stakeholders.some(p=>p.id===next.stakeholder))throw Error('Stakeholder wählen.');
 if(!c.roles.some(r=>r.id===next.role))throw Error('Bitte eine Rolle wählen.');
 if(!governanceContribution(c,next.raci))throw Error('Einen gültigen Beitragsbereich wählen.');
 if(!['active','planned'].includes(next.state))throw Error('Einen gültigen Planungsstand wählen.');
 if(!next.scope||!['organization','system','store','flow'].includes(next.scope.type)||typeof next.scope.id!=='string')throw Error('Verantwortungsbereich wählen.');
 if(c.assignments.some(a=>a!==current&&a.stakeholder===next.stakeholder&&a.role===next.role&&govScopeKey(a.scope)===govScopeKey(next.scope)&&a.raci===next.raci))throw Error('Diese Person ist mit dieser Rolle hier bereits zugeordnet.');
 const assignment={...next,id:current?.id||next.id||govId(),scope:{...next.scope}};
 if(current)Object.assign(current,assignment);else c.assignments.push(assignment);
 return assignment;
}
export function governanceAssignments(c,scope){return c.assignments.filter(a=>a.scope.type===scope.type&&a.scope.id===scope.id);}
export function governanceFindings(c,l,at=today()){
 const findings=[];if(!governanceContributions(c).some(x=>x.accountable))findings.push({type:'roles',scope:{type:'organization',id:''},title:'Gesamtverantwortung nicht definiert',detail:'Unter „Beiträge anpassen“ festlegen, welcher Bereich die Gesamtverantwortung trägt.'});for(const r of govResources(l).filter(r=>r.type==='store'&&governanceContributions(c).some(x=>x.accountable))){const owners=governanceAssignments(c,r).filter(a=>governanceAccountable(c,a)&&a.state==='active');if(owners.length!==1)findings.push({type:'roles',scope:r,title:r.name,detail:owners.length?'Mehrere verantwortliche Stellen · Entscheidung klären':'Verantwortung noch nicht zugeordnet'});}
 for(const q of c.quality){const r=qualityResult(q,at);if(r.status!=='good')findings.push({type:'quality',scope:{type:'flow',id:q.flow},title:govScopeName({type:'flow',id:q.flow},l),detail:GOVERNANCE.dimensions[q.dimension].name+' · '+r.label});}
 for(const r of c.rules){if(r.state==='retired')continue;const result=ruleResult(c,r,at);if(result.status!=='good')findings.push({type:'rules',scope:r.scope,title:r.title,detail:result.label});}
 for(const a of c.lifecycles)for(const step of a.steps)if(!step.owner||!step.evidence||step.action==='delete'&&step.state!=='verified')findings.push({type:'lifecycle',scope:{type:'system',id:step.system},title:lifecycleName(a,l),detail:LIFECYCLE_ACTIONS[step.action]+' · '+(!step.owner?'Zuständigkeit fehlt':!step.evidence?'Beleg fehlt':'Löschschritt noch nicht belegt')});
 return findings;
}
export function ruleResult(c,r,at=today()){
 if(r.applicability==='excluded')return {status:r.reason?.trim()?'warning':'unknown',label:r.reason?.trim()?'Als nicht anwendbar eingeschätzt':'Ausschluss begründen'};
 if(r.applicability!=='applies')return {status:'unknown',label:'Anwendbarkeit noch prüfen'};
 if(r.state!=='approved')return {status:'unknown',label:r.state==='retired'?'Außer Kraft':'Entwurf · noch nicht freigegeben'};
 if(!r.owner||!r.evidence?.trim()||!r.reviewedOn)return {status:'unknown',label:'Verantwortung oder Prüfnachweis fehlt'};
 if(r.nextReview&&ageDays(r.nextReview,at)>0)return {status:'stale',label:'Überprüfung fällig'};
 if(r.control==='quality'){
  const qs=c.quality.filter(q=>q.flow===r.scope.id&&q.dimension===r.dimension);if(!qs.length)return {status:'unknown',label:'Passende Qualitätsmessung fehlt'};
  const q=qualityResult(qs[0],at);return {status:q.percent===null?q.status:q.status==='good'&&q.percent>=r.threshold?'good':q.status==='good'?'bad':q.status,label:q.percent===null?'Messwert fehlt':`${q.percent.toLocaleString('de-DE',{maximumFractionDigits:1})} % · Ziel ≥ ${r.threshold} %`};
 }
 return {status:r.test==='passed'?'good':r.test==='failed'?'bad':'unknown',label:r.test==='passed'?'Prüfung mit Beleg dokumentiert':r.test==='failed'?'Kontrolle nicht erfüllt':'Wirksamkeit noch nicht geprüft'};
}
export function aiGovernanceReport(c){const values={none:0,planned:.25,pilot:.5,managed:.75,proven:1},answers=GOVERNANCE.ai.map(q=>({...q,...c.ai.answers[q.id],value:values[c.ai.answers[q.id]?.level]??0})),known=answers.filter(a=>Object.hasOwn(values,a.level)).length,evidenced=answers.filter(a=>a.evidence?.trim()&&a.reviewedOn).length;return {score:Math.round(answers.reduce((n,a)=>n+a.value,0)/answers.length*100),known,evidenced,total:answers.length,answers,critical:answers.filter(a=>['rights','ownership','evaluation'].includes(a.id)&&a.value<.75)};}
export function sampleQuality(rows,field,test,{at=today(),maxAgeDays=30}={}){
 let passed=0;const seen=new Map();if(test==='unique')for(const row of rows){const v=row[field];if(v!==null&&v!==undefined&&String(v).trim()!=='')seen.set(JSON.stringify(v),(seen.get(JSON.stringify(v))||0)+1);}
 const results=rows.map((row,index)=>{const v=row[field],present=v!==null&&v!==undefined&&String(v).trim()!=='';let ok=false;
  if(test==='complete')ok=present;if(test==='unique')ok=present&&seen.get(JSON.stringify(v))===1;
  if(test==='number')ok=present&&typeof v==='number'&&Number.isFinite(v);
  if(test==='email')ok=present&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v));
  if(test==='fresh'){const age=ageDays(String(v||'').slice(0,10),at);ok=age!==null&&age>=0&&age<=maxAgeDays;}
  if(ok)passed++;return {index,value:v,ok};
 });return {passed,total:rows.length,results,dimension:test==='unique'?'uniqueness':test==='complete'?'completeness':test==='fresh'?'timeliness':'validity'};
}
export function lifecycleName(asset,landscape){
 return asset.nameFromSource?(landscape?.stores||[]).find(s=>s.id===asset.sourceStore)?.name||asset.name:asset.name;
}
export function lifecycleFromStore(landscape,storeId){
 const store=landscape?.stores?.find(s=>s.id===storeId);if(!store)throw Error('Einen vorhandenen Datenbestand wählen.');
 return {id:govId(),name:store.name,nameFromSource:true,purpose:store.purpose||'',sourceStore:store.id,flows:(landscape.flows||[]).filter(f=>(f.stores||[]).includes(store.id)).map(f=>f.id),steps:[]};
}
export function lifecycleTrace(asset,l){
 const systems=new Map((l?.systems||[]).map(s=>[s.id,s])),selected=(l?.flows||[]).filter(f=>asset.flows.includes(f.id));const arcs=selected.flatMap(f=>flowDirection(f)==='both'?[{from:f.from,to:f.to,flow:f},{from:f.to,to:f.from,flow:f}]:[{from:flowDirection(f)==='reverse'?f.to:f.from,to:flowDirection(f)==='reverse'?f.from:f.to,flow:f}]);
 const source=(l?.stores||[]).find(s=>s.id===asset.sourceStore)?.system||asset.steps.find(s=>s.action==='collect')?.system||asset.steps[0]?.system;
 const depth=new Map();if(source&&systems.has(source))depth.set(source,0);const queue=[...depth.keys()];for(let i=0;i<queue.length;i++)for(const a of arcs)if(a.from===queue[i]&&!depth.has(a.to)){depth.set(a.to,depth.get(a.from)+1);queue.push(a.to);}
 const ids=new Set([...asset.steps.map(s=>s.system),...arcs.flatMap(a=>[a.from,a.to]),...(source?[source]:[])]);
 return {source,arcs,nodes:[...ids].map(id=>({id,name:systems.get(id)?.name||'System fehlt',depth:depth.get(id)??null,steps:asset.steps.filter(s=>s.system===id)})),unreachable:selected.filter(f=>!depth.has(f.from)&&!depth.has(f.to)),missingFlows:asset.flows.filter(id=>!selected.some(f=>f.id===id))};
}
export function deletionSimulation(asset,l){return lifecycleTrace(asset,l).nodes.map(n=>{const deletion=n.steps.filter(s=>s.action==='delete'),hold=n.steps.find(s=>s.hold);return {...n,status:hold?'held':deletion.some(s=>s.state==='verified'&&s.evidence?.trim()&&s.owner)?'ready':deletion.length?'planned':'missing',reason:hold?.holdReason||''};});}
export function governanceExample(l,landscape=''){
 const c=emptyGovernance();c.organization=l.organization||'Lernorganisation';c.landscape=landscape;c.sandbox=landscape?null:structuredClone(l);
 c.stakeholders=[{id:'business',name:'Alex · Fachbereich',department:'Fachbereich',kind:'person'},{id:'operations',name:'Sam · Plattformteam',department:'IT',kind:'team'},{id:'control',name:'Robin · Datenschutz & Compliance',department:'Kontrollfunktionen',kind:'team'}];
 const store=l.stores[0],flow=l.flows.find(f=>flowDirection(f)==='reverse'?f.to===store?.system:f.from===store?.system)||l.flows[0],system=l.systems[0];
 c.assignments=[{id:'owner-org',role:'sponsor',stakeholder:'business',raci:'A',scope:{type:'organization',id:''},state:'active',note:''},...(store?[{id:'owner-data',role:'data_owner',stakeholder:'business',raci:'A',scope:{type:'store',id:store.id},state:'active',note:''},{id:'custodian-data',role:'custodian',stakeholder:'operations',raci:'R',scope:{type:'store',id:store.id},state:'active',note:''}]:[])];
 if(flow)c.quality=[{id:'sample-complete',flow:flow.id,dimension:'completeness',passed:92,total:100,target:98,suitability:'limited',measuredOn:today(),maxAgeDays:30,method:'Synthetische Stichprobe · 100 Datensätze',evidence:'Lernfall: Acht Datensätze enthalten keinen Pflichtwert. Keine Messung echter Unternehmensdaten.',note:'Für den operativen Versand fehlen benötigte Angaben.'}];
 c.rules=[{id:'retention-example',title:'Aufbewahrung und Löschung nachvollziehbar regeln',framework:'GDPR',reference:'Art. 5 Abs. 1 lit. e; Art. 17 · Anwendbarkeit im Einzelfall prüfen',scope:store?{type:'store',id:store.id}:{type:'organization',id:''},control:'manual',dimension:'completeness',threshold:98,applicability:'unknown',reason:'',state:'draft',owner:'control',evidence:'',reviewedOn:'',nextReview:'',test:'unknown',description:'Zweck, Auslöser, Fristen und mögliche Aufbewahrungsgründe festhalten. Keine pauschale gesetzliche Frist voraussetzen.'}];
 if(system)c.lifecycles=[{id:'lifecycle-example',name:store?.name||'Beispieldaten',nameFromSource:!!store,purpose:'Den Weg eines ausgewählten Datenbestands untersuchen.',sourceStore:store?.id||'',flows:flow?[flow.id]:[],steps:[{id:'collect-example',system:store?.system||system.id,action:'collect',owner:'business',state:'planned',retentionDays:null,hold:false,holdReason:'',evidence:''},{id:'store-example',system:store?.system||system.id,action:'store',owner:'operations',state:'planned',retentionDays:90,hold:false,holdReason:'',evidence:'Synthetische Annahme, keine gesetzliche Aufbewahrungsfrist.'}]}];
 c.ai.useCase='Interner Wissensassistent · synthetischer Lernfall';c.ai.answers={purpose:{level:'pilot',evidence:'Lernfall: Ein Fachbereich erprobt Suchfragen.',reviewedOn:today()},data:{level:'planned',evidence:'Lernfall: Erste Qualitätsprüfung liegt vor; weitere Daten fehlen.',reviewedOn:today()}};
 return c;
}
