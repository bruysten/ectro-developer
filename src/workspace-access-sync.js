// Messages are invalidation hints only. Every receiving session rechecks its own server permissions.
export const WORKSPACE_ACCESS_POLL_MS=10000;
const key='entrosphere:workspace-access-change';
export function mountWorkspaceAccessSignals({check,enabled,windowRef=window,documentRef=document}){
 let channel=null,disposed=false;
 const refresh=()=>{if(!disposed&&enabled()&&!documentRef.hidden)check();};
 const message=event=>{if(event.data?.type==='workspace-access-change')refresh();};
 const storage=event=>{if(event.key===key)refresh();};
 try{channel=new windowRef.BroadcastChannel(key);channel.addEventListener('message',message);}catch{}
 windowRef.addEventListener('focus',refresh);windowRef.addEventListener('online',refresh);windowRef.addEventListener('storage',storage);documentRef.addEventListener('visibilitychange',refresh);
 return {
  notify(){if(disposed)return;try{if(channel){channel.postMessage({type:'workspace-access-change'});return;}}catch{}try{windowRef.localStorage.setItem(key,`${Date.now()}:${Math.random()}`);}catch{}},
  dispose(){disposed=true;channel?.removeEventListener('message',message);channel?.close();windowRef.removeEventListener('focus',refresh);windowRef.removeEventListener('online',refresh);windowRef.removeEventListener('storage',storage);documentRef.removeEventListener('visibilitychange',refresh);}
 };
}
