import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {workspaceAccessKey,pruneWorkspaceSelect,workspaceRouteAllowed} from '../src/workspace-access.js';

const groups=[{id:'a',name:'Aktiv'},{id:'b',name:'Abgelaufen'}];
assert.equal(workspaceAccessKey(groups,{graph:true,files:true}),workspaceAccessKey([...groups].reverse(),{files:true,graph:true}));
assert.notEqual(workspaceAccessKey(groups,{files:true}),workspaceAccessKey(groups.slice(0,1),{files:true}),'Membership changes matter even when voice is unchanged');
assert.notEqual(workspaceAccessKey(groups,{graph:true}),workspaceAccessKey(groups,{graph:false}));
assert.equal(workspaceAccessKey(),workspaceAccessKey(null,null));

// Native-select semantics: removing the selected option normally selects the
// first option, which must never silently turn a shared project into a private one.
function selectFixture(value){
 const select={dataset:{},options:[],listeners:[],validity:'',value,
  setCustomValidity(message){this.validity=message;},
  addEventListener(name,fn){this.listeners.push(fn);},
  prepend(option){this.options.unshift(option);if(option.selected)this.value=option.value;},
  change(value){this.value=value;const listeners=this.listeners.splice(0);listeners.forEach(fn=>fn());},
 };
 const option=(value,textContent)=>({value,textContent,remove(){const at=select.options.indexOf(this);if(at<0)return;select.options.splice(at,1);if(select.value===this.value)select.value=select.options[0]?.value||'';}});
 select.ownerDocument={createElement:()=>option('','')};
 select.options=[option('','Persönlich'),option('a','Aktiv'),option('b','Abgelaufen')];return select;
}
let select=selectFixture('');
assert.equal(pruneWorkspaceSelect(select,new Set(['a'])),false);
assert.deepEqual(select.options.map(o=>o.value),['','a']);assert.equal(select.value,'');
select=selectFixture('b');
assert.equal(pruneWorkspaceSelect(select,new Set(['a'])),true);
assert.equal(select.value,'access-revoked');assert(select.validity);assert(select.options[0].disabled);
pruneWorkspaceSelect(select,new Set(['a']));
assert.equal(select.options.filter(o=>o.value==='access-revoked').length,1);assert.equal(select.listeners.length,1);
select.change('a');assert.equal(select.validity,'');assert.equal(select.dataset.accessPrevious,undefined);assert.equal(select.value,'a');
select=selectFixture('b');pruneWorkspaceSelect(select,new Set(['a']));
assert.equal(pruneWorkspaceSelect(select,new Set(['a','b'])),false);
assert.equal(select.value,'b');assert.equal(select.validity,'');assert.equal(select.options[0].textContent,'Abgelaufen');

assert(workspaceRouteAllowed('data-lab',{converter:true}));
assert(!workspaceRouteAllowed('data-lab',{files:true}));
assert(!workspaceRouteAllowed('graph',{graph:true,files:false}));
assert(!workspaceRouteAllowed('editor',{files:true,editor:false}));
assert(!workspaceRouteAllowed('chat',{chat:false}));
assert(!workspaceRouteAllowed('canvas-lab',{files:true,canvas_lab:false},{canvas:{route:'canvas-lab',feature:'canvas_lab'}}));
assert(workspaceRouteAllowed('dashboard',{}));

// Exercise the production request helpers, including the status used by canvas
// and team views to discard revoked server data.
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('async function api('),source.indexOf('function bind('));
for(const admin of [false,true]){
 const calls=[];let notifications=0;let response={ok:true,status:200,headers:{get:()=>null},json:async()=>({ok:true})};
 const {get,api}=new Function('fetch','admin','workspaceSignals',`let user={id:'fixture'},csrf='fixture',dbProject=null;const databaseContext=()=>({}),uiError=x=>x,boot=async()=>{};${helpers};return {get,api};`)(async(url,init)=>{calls.push({url,init});return response;},admin,{notify(){notifications++;}});
 await get('lab.projects');await api('templates');await api('project.create',{name:'Fixture'});assert.equal(notifications,0);await api('admin.group.features.save',{});await api('admin.user.save',{});await api('admin.settings',{});assert.equal(notifications,3);
 for(const call of calls)assert.equal(call.init.headers['X-Workspace-Portal'],admin?'admin':'frontend');
 for(const status of [403,404]){
  response={ok:false,status,headers:{get:()=>null},json:async()=>({error:'Nicht verfügbar',code:'fixture'})};
  for(const request of [()=>get('canvas.get',{id:'fixture'}),()=>api('canvas.create',{})])await assert.rejects(request,error=>error.status===status&&error.code==='fixture');
 }
}
// A successful fresh login must arm the boundary timer too, without requiring
// the learner to reload the page first.
const loginSource=source.match(/\$\('#login-form'\)\.onsubmit=(async e=>\{.*\});/)[1];
const loginContext={armed:0,routed:0,submit:{disabled:false},error:{textContent:''}};
const loginSubmit=new Function('$','FormData','context',`let user,csrf,flags,accessScreen=true,accessRefreshPending=true;const setup=false,admin=false;const api=async()=>({user:{must_change_password:false},features:{files:true},csrf:'fixture'}),armAccessWindow=()=>context.armed++,shell=()=>{},route=async()=>context.routed++,uiError=x=>x;return ${loginSource};`)(selector=>selector==='button[type="submit"]'?loginContext.submit:loginContext.error,class{*[Symbol.iterator](){yield ['email','fixture@example.test'];yield ['password','test-only'];}},loginContext);
await loginSubmit({preventDefault(){},target:{}});
assert.equal(loginContext.armed,1);assert.equal(loginContext.routed,1);assert.equal(loginContext.submit.disabled,false);assert.equal(loginContext.error.textContent,'');
console.log('Workspace visibility checks passed: membership snapshots, revoked selections, route grants and API error/context propagation.');
