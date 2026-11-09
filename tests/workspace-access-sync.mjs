import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountWorkspaceAccessSignals,WORKSPACE_ACCESS_POLL_MS} from '../src/workspace-access-sync.js';
import {workspaceAccessKey,replaceWorkspaceFlags,refreshWorkspaceNavigation} from '../src/workspace-access.js';
assert.equal(WORKSPACE_ACCESS_POLL_MS,10000);
const flags={files:true,readiness_lab:false,old:true},mounted={flags};replaceWorkspaceFlags(flags,{files:true,readiness_lab:true});assert.equal(mounted.flags,flags);assert(mounted.flags.readiness_lab);assert(!Object.hasOwn(flags,'old'));
function target(){const listeners=new Map();return {addEventListener(k,fn){if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(fn);},removeEventListener(k,fn){listeners.get(k)?.delete(fn);},emit(k,event={}){for(const fn of listeners.get(k)||[])fn(event);}};}
const bus=new Set(),messages=[];
class Channel extends Object {constructor(){super();Object.assign(this,target());bus.add(this);}postMessage(data){messages.push(data);for(const c of bus)if(c!==this)c.emit('message',{data});}close(){bus.delete(this);}}
const makeWindow=()=>({...target(),BroadcastChannel:Channel,crypto:{randomUUID:()=> 'test'},localStorage:{setItem(){}}});
let enabled=true,checks=0;const frontendWindow=makeWindow(),doc={...target(),hidden:false};const front=mountWorkspaceAccessSignals({check:()=>checks++,enabled:()=>enabled,windowRef:frontendWindow,documentRef:doc});
const admin=mountWorkspaceAccessSignals({check:()=>{throw Error('Admin must not refresh learner views');},enabled:()=>false,windowRef:makeWindow(),documentRef:{...target(),hidden:false}});
admin.notify();assert.equal(checks,1);assert.deepEqual(messages,[{type:'workspace-access-change'}],'No permission data or credentials travel through the channel');
frontendWindow.emit('focus');doc.emit('visibilitychange');frontendWindow.emit('online');assert.equal(checks,4);
doc.hidden=true;admin.notify();doc.emit('visibilitychange');assert.equal(checks,4);doc.hidden=false;doc.emit('visibilitychange');assert.equal(checks,5);
enabled=false;admin.notify();frontendWindow.emit('focus');assert.equal(checks,5);enabled=true;
frontendWindow.emit('storage',{key:'unrelated'});assert.equal(checks,5);frontendWindow.emit('storage',{key:'entrosphere:workspace-access-change'});assert.equal(checks,6);
front.dispose();admin.notify();frontendWindow.emit('focus');doc.emit('visibilitychange');assert.equal(checks,6);admin.dispose();assert.equal(bus.size,0);
const legacy=makeWindow();legacy.BroadcastChannel=class{constructor(){throw Error('Unavailable');}};let stored;legacy.localStorage.setItem=(k,v)=>stored={k,v};const fallback=mountWorkspaceAccessSignals({check(){},enabled:()=>true,windowRef:legacy,documentRef:{...target(),hidden:false}});fallback.notify();assert.equal(stored.k,'entrosphere:workspace-access-change');assert.match(stored.v,/^\d+:/);fallback.dispose();

// Execute the production access check: permission gains never rebuild an editor,
// even while it is dirty, and a signal arriving during a request is not dropped.
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('async function checkAccessWindow(){'),source.indexOf('async function reconcileWorkspaceAccess(){'));
function harness(dirty=true){
 const state={user:{id:'a',groups:[],access:{allowed:true},address:{mode:'formal'}},flags:{files:true,readiness_lab:false},checks:0,reconciles:0,shell:0,route:0,armed:0,queue:[],responses:[]};
 const live=new Function('s','workspaceAccessKey','replaceWorkspaceFlags',`let user=s.user,flags=s.flags,csrf='',accessScreen=false,accessRefreshPending=false,accessChecking=false,accessCheckQueued=false,accessTimer=null;const clearTimeout=()=>{};const admin=false,dirty=${dirty},document={querySelector:()=>null},$=()=>null,location={hash:'#ai-lab'},getAddressMode=()=> 'formal',setAddressMode=()=>{},showAccessWindow=()=>{},boot=async()=>{},api=async()=>{s.checks++;return await s.responses.shift();},reconcileWorkspaceAccess=async()=>{s.reconciles++;return true;},shell=()=>s.shell++,route=async()=>s.route++,armAccessWindow=()=>s.armed++,setTimeout=()=>0,queueMicrotask=fn=>s.queue.push(fn);${code};return {check:checkAccessWindow,setUser:u=>user=u};`)(state,workspaceAccessKey,replaceWorkspaceFlags);return {state,...live};
}
const fresh=allowed=>({csrf:'fixture',user:{id:'a',groups:[{id:'g',name:'Group'}],access:{allowed:true},address:{mode:'formal'}},features:{files:true,readiness_lab:allowed}});
let h=harness();h.state.responses.push(fresh(true));await h.check();assert(h.state.flags.readiness_lab);assert.equal(h.state.reconciles,1);assert.equal(h.state.shell,0);assert.equal(h.state.route,0);assert.equal(h.state.armed,1);
h=harness(false);h.state.responses.push(fresh(true));await h.check();assert.equal(h.state.shell,0,'A clean workspace is not rebuilt for a new lab either');assert.equal(h.state.route,0);
h=harness();let resolve;h.state.responses.push(new Promise(r=>resolve=r),fresh(false));const waiting=h.check();await h.check();resolve(fresh(true));await waiting;assert.equal(h.state.queue.length,1);await h.state.queue.shift()();assert.equal(h.state.checks,2);assert(!h.state.flags.readiness_lab);assert.equal(h.state.reconciles,2);assert.equal(h.state.shell,0);
h=harness();h.state.responses.push(new Promise(r=>resolve=r));const stale=h.check();h.setUser({id:'new-account'});resolve(fresh(true));await stale;assert(!h.state.flags.readiness_lab);assert.equal(h.state.reconciles,0,'An old session response never applies to a new account');

// Navigation updates keep its open section, scroll and keyboard focus.
const element=route=>({dataset:{route},setAttribute(k,v){this[k]=v;},focus(options){this.focused=options;},closest(){return this;}});
const oldLink=element('graph'),newLink=element('graph'),newLab=element('readiness-lab'),summary=element('summary');
const oldGroup={open:true,querySelector:()=>null};let selected=false;
const newGroup={open:false,classList:{toggle(k,v){selected=v;}},querySelector(q){return q==='summary'?summary:q==='[aria-current="page"]'&&newLink['aria-current']==='page'?newLink:null;}};
let drawn=false;const nav={scrollTop:184,ownerDocument:{activeElement:oldLink},contains:()=>true,querySelector:()=>drawn?newGroup:oldGroup,querySelectorAll:()=>[newLink,newLab],set innerHTML(value){drawn=true;}};
refreshWorkspaceNavigation(nav,'fresh markup','graph');assert(newGroup.open);assert(selected);assert.equal(nav.scrollTop,184);assert.deepEqual(newLink.focused,{preventScroll:true});assert.equal(newLab['aria-current'],'false');
console.log('Live workspace access: authoritative hints, fallback, visibility/focus, coalescing, stable flags, dirty-editor preservation, account races and navigation state verified.');

// Refresh cadence respects server-side access boundaries, and backs off in hidden tabs.
const timerCode=source.slice(source.indexOf('function armAccessWindow(){'),source.indexOf('async function checkAccessWindow(){'));
for(const [hidden,boundary,expected] of [[false,null,10000],[true,null,60000],[false,2000,2000]]){
 let delay;new Function('document','user','accessWindowDelay','WORKSPACE_ACCESS_POLL_MS','setTimeout',`let accessTimer=null;const admin=false,clearTimeout=()=>{},checkAccessWindow=()=>{};${timerCode};armAccessWindow();`)({hidden},{access:{boundary},address:{}},value=>value?.boundary??null,WORKSPACE_ACCESS_POLL_MS,(fn,ms)=>{delay=ms;return 1;});assert.equal(delay,expected);
}

// Pure lab grants retain an existing chat; actual chat changes update only its host.
const chatCode=source.slice(source.indexOf('  if(!flags.chat||chatGroup&&!groupIds.has(chatGroup))resetChat();'),source.indexOf('  const view=',source.indexOf('async function reconcileWorkspaceAccess(){')));
for(const [allowed,existing,group,expected] of [[true,true,'active',[0,0]],[true,false,'active',[0,1]],[false,true,'active',[1,0]],[true,true,'expired',[1,1]]]){
 const counts=[0,0];new Function('flags','groupIds','chatGroup','counts',`let chatBubble=${existing?'{}':'null'};const user={id:'a'},ensureChat=()=>{},resetChat=()=>{counts[0]++;chatBubble=null;},createChatBubble=()=>{counts[1]++;return {};};${chatCode}`)({chat:allowed},new Set(['active']),group,counts);assert.deepEqual(counts,expected);
}
