import catalog from '../app/readiness-catalog.json' with {type:'json'};
export const READINESS=catalog;
export const READINESS_ANSWERS={yes:'Etabliert',partial:'Teilweise / Pilot',no:'Noch nicht',unknown:'Weiß ich nicht'};
export const READINESS_BASELINES={analog:'Vor allem Office, E-Mail und Papier; wenig vernetzt und meist reaktiv.',islands:'Digitale Lösungen für einzelne Aufgaben; viele Übergaben noch manuell.',connected:'Überwiegend digitale, miteinander verbundene Arbeitsabläufe.',unknown:'Das kann ich noch nicht sicher beurteilen.'};
export const emptyReadiness=()=>({schemaVersion:1,organization:'',scope:'organization',area:'',baseline:'',answers:{},screen:'setup',step:0,completedAt:''});
export function readinessAnswered(c,id){return Object.hasOwn(READINESS_ANSWERS,c.answers?.[id]);}
export function readinessComplete(c){return !!c.organization?.trim()&&['organization','area'].includes(c.scope)&&(c.scope==='organization'||!!c.area?.trim())&&Object.hasOwn(READINESS_BASELINES,c.baseline)&&READINESS.criteria.every(k=>readinessAnswered(c,k.id));}
export function readinessReport(c){
 const stages=READINESS.stages.map(stage=>{const criteria=stage.criterionOrder.map(id=>READINESS.criteria.find(k=>k.id===id)).map(k=>({...k,answer:readinessAnswered(c,k.id)?c.answers[k.id]:'unanswered'}));return {...stage,criteria,yes:criteria.filter(k=>k.answer==='yes').length,partial:criteria.filter(k=>k.answer==='partial').length,unknown:criteria.filter(k=>['unknown','unanswered'].includes(k.answer)).length,established:criteria.length>0&&criteria.every(k=>k.answer==='yes')};});
 let digital=0;for(let i=1;i<=5;i++){if(!stages[i].established)break;digital=i;}
 const unknown=READINESS.criteria.filter(k=>['unknown',undefined].includes(c.answers?.[k.id])).length,answered=READINESS.criteria.filter(k=>readinessAnswered(c,k.id)).length;
 const ai=stages[6].established&&digital===5;
 const knownYes=stages.flatMap(s=>s.criteria).some(k=>k.answer==='yes');
 const analog=digital===0&&!knownYes&&unknown===0&&c.baseline==='analog';
 const level=ai?6:digital>0?digital:analog?0:null;
 const next=stages[digital<5?digital+1:6],gaps=next.criteria.filter(k=>k.answer!=='yes');
 const contradictions=[];
 const flag=(condition,text,question)=>{if(condition)contradictions.push({text,question});};
 flag(c.answers?.integration==='yes'&&c.answers?.processes==='no','Die Systeme sind als vollständig integriert angegeben, die Prozessdigitalisierung aber als „Noch nicht“.','work');
 flag(c.answers?.ai_core==='yes'&&c.answers?.automation==='no','KI automatisiert einen Kernbereich, einfache Routinen sind jedoch als „Noch nicht“ angegeben.','work');
 flag(c.baseline==='analog'&&c.answers?.integration==='yes','Der beschriebene analoge Arbeitsalltag passt noch nicht zur vollständig bestätigten Systemintegration.','ecosystem');
 return {stages,digital,level,ai,analog,unknown,answered,complete:readinessComplete(c),next,gaps,contradictions,islands:stages.filter(s=>s.id>(level??digital)&&s.criteria.some(k=>k.answer==='yes')),actions:[...gaps].sort((a,b)=>Number(['unknown','unanswered'].includes(b.answer))-Number(['unknown','unanswered'].includes(a.answer))).slice(0,3).map(k=>({...k,action:['unknown','unanswered'].includes(k.answer)?'Mit einer zuständigen Person anhand eines konkreten Ablaufs klären, ob dieses Kriterium im gewählten Bereich erfüllt ist.':k.action}))};
}
