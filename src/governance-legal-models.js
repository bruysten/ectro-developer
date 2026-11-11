import catalog from '../app/governance-legal-catalog.json' with {type:'json'};
import {ruleResult} from './governance-models.js';
export const LEGAL=catalog;
export const LEGAL_STATES={unknown:'Einordnung offen',open:'Nachweise offen',gap:'Abweichung',stale:'Erneut prüfen',documented:'Prüfliste belegt',excluded:'Nicht relevant · begründet',indirect:'Indirekter Bezug',preparation:'Vorbereitung offen'};
export const LEGAL_CHECK_STATES={open:'Noch offen',met:'Mit Nachweis erfüllt',gap:'Abweichung festgestellt',excluded:'Ausnahme begründet'};
const day=()=>new Date().toISOString().slice(0,10),scopeKey=s=>s.type+':'+s.id;
export const legalResource=(a,l)=>a.scope.type==='organization'?{name:'Gesamte Organisation'}:(l?.[{system:'systems',store:'stores',flow:'flows'}[a.scope.type]]||[]).find(x=>x.id===a.scope.id);
export const legalCaseName=(a,l)=>legalResource(a,l)?.name||a.label||'Ressource nicht verfügbar';
export function legalWhen(when,facts){if(!when)return true;const alternatives=Array.isArray(when)?when:[when],results=alternatives.map(group=>{const parts=Object.entries(group).map(([key,allowed])=>!facts[key]||facts[key]==='unknown'?null:allowed.includes(facts[key]));return parts.includes(false)?false:parts.includes(null)?null:true;});return results.includes(true)?true:results.includes(null)?null:false;}
export function legalQuestions(law,facts={}){return LEGAL.frameworks[law].facts.filter(q=>legalWhen(q.when,facts)===true||law==='gdpr'&&facts.personal==='no'&&['sensitive','criminal','automated'].includes(q.id)&&facts[q.id]==='yes');}
export function legalScope(law,facts={}){
 const get=k=>facts[k]||'unknown',unknown=detail=>({relevance:'unknown',detail});
 if(law==='gdpr'){
  if(get('personal')==='no'){if(['sensitive','criminal','automated'].some(k=>get(k)==='yes'))return unknown('Personenbezug und Zusatzangaben widersprechen sich.');return {relevance:'excluded',detail:'Für diesen Zweck keine personenbezogene Verarbeitung angegeben.'};}
  if(get('eu')==='no')return {relevance:'excluded',detail:'Kein räumlicher Anwendungsbereich angegeben; Begründung prüfen.'};
  if(get('personal')!=='yes'||get('eu')!=='yes'||get('role')==='unknown')return unknown('Personenbezug, räumlichen Anwendungsbereich und Rolle klären.');
 }else if(law==='dma'){
  if(get('eu')==='no'||get('role')==='none')return {relevance:'excluded',detail:'Kein einschlägiger eigener Plattformbezug angegeben.'};
  if(get('eu')!=='yes'||get('role')==='unknown')return unknown('EU-Bezug und Rolle klären.');
  if(get('role')==='business_user'&&get('designated')==='unknown')return unknown('Benennung des fremden Plattformdienstes klären.');
  if(get('role')==='business_user'&&get('designated')==='no')return {relevance:'excluded',detail:'Kein förmlich benannter fremder Dienst angegeben; konkreten Plattformbezug begründen.'};
  if(get('role')==='business_user')return {relevance:'indirect',detail:'Geschäftsnutzer: Rechte und Datenabhängigkeiten prüfen; keine eigenen Gatekeeper-Pflichten unterstellen.'};
  if(get('role')==='gatekeeper'&&get('designated')!=='yes')return unknown('Die Gatekeeper-Angabe benötigt die Benennung des konkreten Dienstes.');
  if(get('role')==='provider'&&get('designated')!=='yes'){if(get('thresholds')==='unknown'||get('designated')==='unknown')return unknown('Benennung und mögliche Meldepflicht klären.');if(get('thresholds')==='no')return {relevance:'excluded',detail:'Weder Benennung noch einschlägige Meldepflicht angegeben; fachlich begründen.'};}
 }else if(law==='dsa'){
  if(get('eu')==='no'||get('role')==='none'||get('role')==='provider'&&get('service')==='none')return {relevance:'excluded',detail:'Kein erfasster eigener Dienst im Anwendungsbereich angegeben.'};
  if(get('eu')!=='yes'||get('role')==='unknown')return unknown('EU-Bezug und eigene Rolle klären.');
  if(get('role')==='user')return {relevance:'indirect',detail:'Nutzung eines fremden Dienstes: eigene Abhilfe- und Informationsmöglichkeiten prüfen.'};
  if(get('service')==='unknown')return unknown('Art des eigenen Vermittlungsdienstes klären.');
 }else{
  if(get('ai')==='no'||get('eu')==='no')return {relevance:'excluded',detail:'Für diesen Zweck kein erfasster KI-/EU-Bezug angegeben.'};
  if(get('ai')!=='yes'||get('eu')!=='yes'||get('role')==='unknown'||get('risk')==='unknown')return unknown('KI-Bezug, EU-Bezug, Rolle und Risikoklasse klären.');
 }
 return {relevance:'applies',detail:'Für die angegebenen Tätigkeiten passende Pflichten prüfen.'};
}
function canonical(v){return Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
export function legalHash(value){const text=JSON.stringify(canonical(value));let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return (hash>>>0).toString(16).padStart(8,'0');}
export function legalResourceBasis(a,l){const clean=x=>x?Object.fromEntries(Object.entries(x).filter(([k])=>k!=='mapPosition')):null,r=legalResource(a,l);if(a.scope.type==='organization')return null;if(!r)return null;
 const systems=a.scope.type==='system'?[r]:a.scope.type==='store'?(l?.systems||[]).filter(s=>s.id===r.system):(l?.systems||[]).filter(s=>[r.from,r.to].includes(s.id));
 const stores=a.scope.type==='flow'?(l?.stores||[]).filter(s=>(r.stores||[]).includes(s.id)):[];
 return {resource:clean(r),systems:systems.map(clean).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),stores:stores.map(clean).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)};}
export function legalBasis(c,a,law,l,rule=''){return legalHash([LEGAL.version,c.landscape||'',a.scope,a.purpose,LEGAL.frameworks[law].facts.map(q=>[q.id,a.reviews?.[law]?.facts?.[q.id]||'unknown']),legalResourceBasis(a,l),rule?(c.rules.find(r=>r.id===rule)||null):null]);}
export function legalReview(c,a,law,l,{at=day()}={}){
 const definition=LEGAL.frameworks[law],r=a.reviews?.[law]||{},facts=r.facts||{},scope=legalScope(law,facts),available=!!legalResource(a,l),pending=scope.relevance==='excluded'?[]:legalQuestions(law,facts).filter(q=>(facts[q.id]||'unknown')==='unknown');
 let cachedBasis;const basis=()=>cachedBasis??=legalBasis(c,a,law,l);
 const scopeCurrent=!!r.reviewToken&&r.basis===basis(),scopeConfirmed=available&&scopeCurrent&&!!r.reviewer&&!!r.rationale?.trim()&&!!r.reviewedOn&&r.reviewedOn<=at&&(!r.nextReview||r.nextReview>=at);
 const controls=definition.controls.map(def=>{const match=legalWhen(def.when,facts),check=r.checks?.[def.id]||{},effective=def.effectiveByRisk?.[facts.risk]||'',future=!!effective&&effective>at;let state='open',detail='Noch nicht geprüft';
  const current=!!check.reviewToken&&check.basis===(check.rule?legalBasis(c,a,law,l,check.rule):basis()),linked=check.rule?c.rules.find(x=>x.id===check.rule):null,linkedResult=linked?ruleResult(c,linked,at):null;
  if(match===false){state='not_applicable';detail='Nach den Kontextangaben nicht einschlägig';}
  else if(match===null){state='conditional';detail='Voraussetzung noch klären';}
  else if(!available){state='stale';detail='Ressource nicht mehr verfügbar';}
  else if(check.state==='gap'){state='gap';detail='Abweichung dokumentiert';}
  else if(['met','excluded'].includes(check.state)){
   if(!current){state='stale';detail='Kontext geändert · erneut prüfen';}
   else if(!check.owner||!check.evidence?.trim()||!check.reviewedOn){state='open';detail='Zuständigkeit oder Nachweis fehlt';}
   else if(check.nextReview&&check.nextReview<at){state='stale';detail='Erneute Prüfung fällig';}
   else if(check.rule&&(!linkedResult||linkedResult.status!=='good')){state='open';detail='Verknüpfte Regel nicht mit gültigem Prüfnachweis erfüllt';}
   else {state=check.state==='excluded'?'excluded':'met';detail=check.state==='excluded'?'Ausnahme dokumentiert':'Mit Nachweis erfüllt';}
  }
  return {...def,instruction:def.detail,check,match,state,detail,effective,future,overdue:!!check.dueDate&&check.dueDate<at&&!['met','excluded','not_applicable'].includes(state)};
 });
 const applicable=scope.relevance==='excluded'?[]:controls.filter(x=>x.match!==false),gaps=applicable.filter(x=>x.state==='gap'&&!x.future&&x.kind==='duty'),open=applicable.filter(x=>!['met','excluded'].includes(x.state));
 let status=scope.relevance==='unknown'||pending.length?'unknown':!scopeConfirmed?(r.reviewToken?'stale':'open'):scope.relevance==='excluded'?'excluded':gaps.length?'gap':open.some(x=>!x.future)?'open':open.length?'preparation':scope.relevance==='indirect'?'indirect':'documented';
 if(gaps.length&&scope.relevance==='applies')status='gap';if(!available)status='stale';if(law==='ai_act'&&facts.risk==='prohibited'&&scope.relevance!=='excluded')status='gap';
 return {law,...scope,status,available,pending,scopeConfirmed,scopeCurrent,controls,applicable,gaps,open,confirmed:scopeConfirmed,covered:applicable.filter(x=>['met','excluded'].includes(x.state)).length,total:applicable.length};
}
export function legalReport(c,l,{at=day(),scopes=null}={}){
 const cases=(c.legal||[]).filter(a=>!scopes||scopes.has(scopeKey(a.scope))),rows=cases.flatMap(a=>Object.keys(LEGAL.frameworks).map(law=>({case:a,...legalReview(c,a,law,l,{at})}))),todos=[],risks=[];
 for(const row of rows){const common={caseId:row.case.id,scope:row.case.scope,resource:legalCaseName(row.case,l),law:row.law,purpose:row.case.purpose};
  if(!row.available)todos.push({...common,id:row.case.id+':'+row.law+':source',title:'Datenbezug prüfen',detail:'Die zugeordnete Ressource ist nicht verfügbar.',priority:'high',owner:'',dueDate:''});
  if(row.relevance==='unknown'||row.pending.length||!row.scopeConfirmed)todos.push({...common,id:row.case.id+':'+row.law+':scope',title:row.pending.length?'Anwendbarkeit klären':'Einordnung belegen / erneuern',detail:row.pending.map(q=>q.title).join(' · ')||row.detail,priority:'high',owner:row.case.reviews?.[row.law]?.reviewer||'',dueDate:row.case.reviews?.[row.law]?.nextReview||''});
  if(row.law==='ai_act'&&row.case.reviews?.ai_act?.facts?.risk==='prohibited'&&row.relevance!=='excluded')risks.push({...common,id:row.case.id+':ai_act:prohibited',title:'Möglichen Verbotstatbestand fachlich klären',detail:'Den Einsatz und mögliche Ausnahmen vor Einsatz klären.',priority:'high',owner:row.case.reviews?.ai_act?.reviewer||'',dueDate:''});
  if(['excluded','unknown'].includes(row.relevance))continue;
  for(const x of row.open){const item={...common,id:row.case.id+':'+row.law+':'+x.id,control:x.id,title:x.title,detail:x.future?'Vorbereitung · einschlägig ab '+x.effective:x.detail,priority:x.priority,owner:x.check.owner||'',dueDate:x.check.dueDate||x.effective||'',overdue:x.overdue,reference:x.article,practical:x.kind==='practical'};todos.push(item);if(x.state==='gap'&&!x.future&&x.kind==='duty')risks.push(item);}
 }
 const frameworks=Object.fromEntries(Object.keys(LEGAL.frameworks).map(law=>{const r=rows.filter(x=>x.law===law);return [law,{total:r.length,relevant:r.filter(x=>x.relevance==='applies').length,indirect:r.filter(x=>x.relevance==='indirect').length,documented:r.filter(x=>x.status==='documented').length,excluded:r.filter(x=>x.status==='excluded').length,gaps:r.filter(x=>x.status==='gap').length,open:r.filter(x=>!['documented','excluded','indirect','gap'].includes(x.status)).length}];}));
 const all=[...(l?.systems||[]).map(x=>'system:'+x.id),...(l?.stores||[]).map(x=>'store:'+x.id),...(l?.flows||[]).map(x=>'flow:'+x.id)],captured=new Set(cases.filter(a=>legalResource(a,l)).map(a=>scopeKey(a.scope)));
 return {cases,rows,todos,risks,frameworks,captured:all.filter(x=>captured.has(x)).length,totalResources:all.length,overdue:todos.filter(x=>x.overdue||x.dueDate&&x.dueDate<at).length};
}

export function legalSystemHints(a,l,law){const resource=legalResource(a,l),ids=a.scope.type==='system'?[a.scope.id]:a.scope.type==='store'?[resource?.system]:a.scope.type==='flow'?[resource?.from,resource?.to]:[];return (l?.systems||[]).filter(s=>ids.includes(s.id)&&['relevant','not_relevant'].includes(s.regulatory?.[law])).map(s=>({name:s.name,status:s.regulatory[law]}));}
export function legalCsvRows(report,person=id=>id||'Noch offen'){
 return report.rows.flatMap(row=>{const r=row.case.reviews?.[row.law]||{},base={Ressource:row.case.label||row.resource||'',Zweck:row.case.purpose,Rechtsrahmen:LEGAL.frameworks[row.law].name,Relevanz:row.relevance,Einordnung:LEGAL_STATES[row.status],Erfasste_Ressourcen:report.captured+' / '+report.totalResources,Quelle:LEGAL.frameworks[row.law].source},summary={...base,Prüfschritt:'Anwendbarkeit',Referenz:'Geltungsbereich & Rolle',Stand:row.scopeConfirmed?'Dokumentiert':'Offen / erneut prüfen',Verantwortlich:person(r.reviewer),Nachweis:r.rationale||'',Geprüft_am:r.reviewedOn||'',Termin:r.nextReview||''};return [summary,...(['unknown','excluded'].includes(row.relevance)?[]:row.applicable.map(x=>({...base,Prüfschritt:x.title,Referenz:x.article,Stand:x.detail,Vorbereitung_ab:x.effective,Verantwortlich:person(x.check.owner),Termin:x.check.dueDate||'',Nachweis:x.check.evidence||'',Geprüft_am:x.check.reviewedOn||''})))];});
}
