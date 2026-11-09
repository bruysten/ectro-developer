import catalog from '../app/readiness-catalog.json' with {type:'json'};
export const READINESS=catalog;
export const READINESS_ANSWERS={yes:'Etabliert',partial:'Teilweise / Pilot',no:'Noch nicht',unknown:'Weiß ich nicht'};
export const READINESS_BASELINES={analog:'Vor allem Office, E-Mail und Papier; wenig vernetzt und meist reaktiv.',islands:'Digitale Lösungen für einzelne Aufgaben; viele Übergaben noch manuell.',connected:'Überwiegend digitale, miteinander verbundene Arbeitsabläufe.',unknown:'Das kann ich noch nicht sicher beurteilen.'};
export const emptyReadiness=()=>({schemaVersion:1,organization:'',scope:'organization',area:'',baseline:'',answers:{},screen:'setup',step:0,completedAt:''});
export function readinessAnswered(c,id){return Object.hasOwn(READINESS_ANSWERS,c.answers?.[id]);}
export function readinessComplete(c){return !!c.organization?.trim()&&['organization','area'].includes(c.scope)&&(c.scope==='organization'||!!c.area?.trim())&&Object.hasOwn(READINESS_BASELINES,c.baseline)&&READINESS.criteria.every(k=>readinessAnswered(c,k.id));}
// Score v2: equal stage weights, partial credit and a continuous foundation cap.
// Unknowns produce a conservative point and a separate possible upper bound.
export function readinessReport(c){
 const stages=READINESS.stages.map(stage=>{const criteria=stage.criterionOrder.map(id=>READINESS.criteria.find(k=>k.id===id)).map(k=>({...k,answer:readinessAnswered(c,k.id)?c.answers[k.id]:'unanswered'}));return {...stage,criteria,yes:criteria.filter(k=>k.answer==='yes').length,partial:criteria.filter(k=>k.answer==='partial').length,unknown:criteria.filter(k=>['unknown','unanswered'].includes(k.answer)).length,established:criteria.length>0&&criteria.every(k=>k.answer==='yes')};});
 const calculate=(unknownValue=0)=>{
  const progress=stages.map(s=>s.criteria.length?(s.yes+s.partial*.5+s.unknown*unknownValue)/s.criteria.length:0);
  let cap=1,digital=0;const contributions=[0];
  for(let i=1;i<=5;i++){cap=Math.min(cap,progress[i]);contributions[i]=cap;digital+=cap;}
  const ai=digital===5?progress[6]:0;contributions[6]=ai;
  return {position:digital+ai,digital,progress,contributions};
 };
 const lower=calculate(),upper=calculate(1),position=lower.position;
 // Do not round a not-yet-reached stage up to the next stage.
 const score=Math.floor((1+position)*10+1e-9)/10,upperScore=upper.position===position?score:Math.ceil((1+upper.position)*10-1e-9)/10;
 const level=Math.min(6,Math.floor(position+1e-9)),ai=position===6;
 const unknown=stages.reduce((n,s)=>n+s.unknown,0),answered=READINESS.criteria.filter(k=>readinessAnswered(c,k.id)).length;
 const next=stages.slice(1).find(s=>!s.established)||stages[6],gaps=next.criteria.filter(k=>k.answer!=='yes');
 const contradictions=[];
 const flag=(condition,text,question)=>{if(condition)contradictions.push({text,question});};
 flag(c.answers?.integration==='yes'&&c.answers?.processes==='no','Die Systeme sind als vollständig integriert angegeben, die Prozessdigitalisierung aber als „Noch nicht“.','work');
 flag(c.answers?.ai_core==='yes'&&c.answers?.automation==='no','KI automatisiert einen Kernbereich, einfache Routinen sind jedoch als „Noch nicht“ angegeben.','work');
 flag(c.baseline==='analog'&&c.answers?.integration==='yes','Der beschriebene analoge Arbeitsalltag passt noch nicht zur vollständig bestätigten Systemintegration.','ecosystem');
 return {scoringVersion:2,stages,position,score,upperPosition:upper.position,upperScore,digital:lower.digital,level,ai,analog:position===0&&unknown===0&&stages.every(s=>!s.yes&&!s.partial)&&c.baseline==='analog',unknown,known:READINESS.criteria.length-unknown,answered,progress:lower.progress,contributions:lower.contributions,complete:readinessComplete(c),next,gaps,contradictions,islands:stages.filter(s=>s.id>level&&s.criteria.some(k=>k.answer==='yes')),actions:[...gaps].sort((a,b)=>Number(['unknown','unanswered'].includes(b.answer))-Number(['unknown','unanswered'].includes(a.answer))).slice(0,3).map(k=>({...k,action:['unknown','unanswered'].includes(k.answer)?'Mit einer zuständigen Person anhand eines konkreten Ablaufs klären, ob dieses Kriterium im gewählten Bereich erfüllt ist.':k.action}))};
}
