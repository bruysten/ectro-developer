import {ChangeSet,Text} from '@codemirror/state';
import {collab,getSyncedVersion,sendableUpdates,receiveUpdates} from '@codemirror/collab';

export function sharedDocument(user,project,file) {
  const key=`entrosphere-draft:${user}:${project}:${file.id}`;
  let draft;
  try { draft=JSON.parse(sessionStorage.getItem(key)); } catch {}
  if (!draft||typeof draft.base!=='string'||typeof draft.text!=='string'||!Array.isArray(draft.updates)||!Number.isInteger(draft.version)||draft.version<1||draft.version>file.version||typeof draft.client!=='string') draft=null;
  return {key,draft,content:draft?.base??file.content,version:draft?.version??file.version,client:draft?.client??crypto.randomUUID()};
}
export function sharedExtension(document) { return collab({startVersion:document.version,clientID:document.client}); }

export function synchronizeEditor(view,document,request,onState) {
  let confirmed=Text.of(document.content.split('\n')),stopped=false,blocked=false,running=null,timer=null;
  const pending=()=>sendableUpdates(view.state).length>0;
  const cache=()=>{
    try {
      if(pending()) sessionStorage.setItem(document.key,JSON.stringify({base:confirmed.toString(),version:getSyncedVersion(view.state),text:view.state.doc.toString(),client:document.client,updates:sendableUpdates(view.state).map(u=>u.changes.toJSON())}));
      else sessionStorage.removeItem(document.key);
    } catch { /* An unavailable browser store must not prevent synchronization. */ }
  };
  const status=(text,people=[],recover=false)=>{cache();onState({text,people,dirty:pending(),recover});};
  const schedule=(delay=1500)=>{clearTimeout(timer);if(!stopped&&!blocked)timer=setTimeout(()=>exchange().catch(()=>{}),delay);};
  async function exchange() {
    if(stopped||blocked)return;
    if(running)return running;
    running=(async()=>{
      try {
        const updates=[];let bytes=0;
        for(const update of sendableUpdates(view.state).slice(0,100)){const changes=update.changes.toJSON();const size=new TextEncoder().encode(JSON.stringify(changes)).length;if(updates.length&&bytes+size>3600000)break;updates.push(changes);bytes+=size;}
        const result=await request({version:getSyncedVersion(view.state),client:document.client,updates});
        if(stopped)return;
        if(result.resync){blocked=true;status('Lange getrennt · Entwurf sichern',[],true);throw Error('Der Änderungsverlauf ist abgelaufen. Ihr Entwurf bleibt erhalten.');}
        const received=result.updates.map(u=>({...u,changes:ChangeSet.fromJSON(u.changes)}));
        for(const update of received)confirmed=update.changes.apply(confirmed);
        if(received.length)view.dispatch(receiveUpdates(view.state,received));
        status(pending()?'Synchronisiert Änderungen …':'Synchronisiert',result.people);
        schedule(pending()?100:(globalThis.document.hidden?4000:1500));
        return result;
      } catch(error) {
        if(stopped)return;
        if([401,403,404,409,413,422].includes(error.status))blocked=true;
        status(blocked?error.message:'Verbindung unterbrochen · Entwurf bleibt erhalten',[],blocked);
        schedule(4000);throw error;
      }
    })();
    try{return await running;}finally{running=null;}
  }
  return {
    start(){if(document.draft){for(const changes of document.draft.updates)view.dispatch({changes:ChangeSet.fromJSON(changes)});}status(pending()?'Entwurf wiederhergestellt · synchronisiert …':'Verbinden …');schedule(0);},
    changed(){if(stopped)return;cache();if(!blocked){onState({text:'Synchronisiert Änderungen …',people:null,dirty:pending(),recover:false});schedule(400);}},
    async flush(){if(blocked)throw Error('Synchronisation pausiert. Bitte sichern Sie Ihren Entwurf.');for(let i=0;i<20;i++){await exchange();if(!pending())return;}throw Error('Änderungen werden noch synchronisiert. Bitte versuchen Sie es erneut.');},
    destroy(){cache();stopped=true;clearTimeout(timer);},
    discardDraft(){sessionStorage.removeItem(document.key);}
  };
}
