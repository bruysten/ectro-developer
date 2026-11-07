import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {uiError} from '../src/address.js';

// Exercise the actual application helper with deterministic native close events.
// Browsers queue these events, so an old close can reach a reopened base dialog.
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('function modal('),source.indexOf('async function confirm('));
class Dialog extends EventTarget {
  open=false; queued=0; removed=false;
  form={inert:false};submit={disabled:false};error={textContent:''};
  setAttribute(){}
  showModal(){this.open=true;}
  close(){this.open=false;this.queued++;}
  flushClose(){assert(this.queued>0);this.queued--;this.dispatchEvent(new Event('close'));}
  remove(){this.removed=true;}
}
const base=new Dialog(),nested=[];
const document={createElement:()=>new Dialog(),body:{append:dialog=>nested.push(dialog)}};
const $=(selector,dialog)=>selector==='#modal'?base:selector==='#modal-form'?dialog.form:selector==='.error'?dialog.error:dialog.submit;
// The real selector's form scope points back to the containing dialog.
const scoped=(selector,root)=>root?.owner?$(selector,root.owner):$(selector,root);
function prepare(dialog){dialog.form.owner=dialog;return dialog;}
prepare(base);document.createElement=()=>prepare(new Dialog());
const bind=(action,handler,dialog)=>{assert.equal(action,'close-modal');dialog.requestClose=handler;};
const modal=new Function('$','bind','ib','button','document','FormData','uiError',helper+';return modal;')(scoped,bind,()=>'',()=>'',document,class FormData{},uiError);
const drain=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};

const first=modal('Profile','',async()=>{});
await base.requestClose();assert.equal(await first,false);
assert.equal(base.queued,1);
let settled=false;
const next=modal('AI connections','',async()=>{});next.then(()=>settled=true);
base.flushClose();await drain();
assert(base.open);assert.equal(settled,false,'An old close event must not complete a reopened dialog');
await base.requestClose();assert.equal(await next,false);base.flushClose();

const saved=modal('Save','',async()=>{});
await base.form.onsubmit({preventDefault(){}});assert.equal(await saved,true);base.flushClose();

const failed=modal('Save conflict','',async()=>{throw Error('Version conflict');},'Save',{freezeOnSubmit:true});
await base.form.onsubmit({preventDefault(){}});
assert(base.open);assert.equal(base.error.textContent,'Version conflict');assert.equal(base.form.inert,false);assert.equal(base.submit.disabled,false);
await base.requestClose();await failed;base.flushClose();

const parent=modal('Parent','',async()=>{}),child=modal('Nested confirmation','',async()=>{});
assert.equal(nested.length,1);assert(base.open&&nested[0].open);
await nested[0].requestClose();assert.equal(await child,false);assert(nested[0].removed&&base.open);
await base.requestClose();await parent;base.flushClose();

let approved=false;
const guarded=modal('Unsaved work','',async()=>{},'Save',{beforeClose:()=>approved});
await base.requestClose();assert(base.open);approved=true;await base.requestClose();assert.equal(await guarded,false);base.flushClose();
const escaped=modal('Escape','',async()=>{});base.open=false;base.oncancel({preventDefault(){}});assert.equal(await escaped,false);
console.log('Dialog lifecycle verified: queued old close, reopen, submit, failed save, nested dialog, close guard and Escape.');
