import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canvasOperation} from '../src/canvas-models.js';
const source=readFileSync(new URL('../src/canvas.js',import.meta.url),'utf8');
const mutation=source.slice(source.indexOf(' async function mutate('),source.indexOf(' function moveUI('));
const code=source.slice(source.indexOf(' async function removeCard('),source.indexOf(' async function editCard('));
async function scenario({cancel=false,shared=false,retry=false,conflict=false,editor=false,otherDraft=false,archived=false}={}){
 const state={calls:[],html:'',editing:editor,busy:false,selected:{id:'board',group_id:shared?'group':null,archived},draft:{card:{id:otherDraft?'other-card':'card'}},cleared:0,adopted:0,focus:0};
 const error=Object.assign(Error('Changed'),{status:409});
 const remove=new Function('s','canvasOperation','modal','api','error',`let selected=s.selected,editing=s.editing,busy=false,pendingMove=null;let epoch=0;const catalog={invalidate(){}},live=()=>true,moveUI=()=>{},e=t=>String(t).replaceAll('<','&lt;'),status=()=>{},readDraft=()=>s.draft,stash=()=>s.cleared++,get=async()=>({canvas:{...selected,version:2}}),adopt=()=>s.adopted++,root={querySelectorAll:()=>[]},$=()=>({focus:()=>s.focus++});${mutation};${code};return async(card,fromEditor)=>{const removed=await removeCard(card,fromEditor);s.editing=editing;return removed;};`)(state,canvasOperation,async(title,html,submit,label,options)=>{
  state.html=html;assert.equal(title,'Karte löschen');assert(options.freezeOnSubmit);if(cancel)return;
  if(retry)await assert.rejects(submit,/Lost response/);
  if(conflict){await assert.rejects(submit,/inzwischen geändert/);return;}
  await submit();
 },async(action,payload)=>{assert.equal(action,'canvas.mutate');state.calls.push({payload});if(conflict)throw error;if(retry&&state.calls.length===1)throw Error('Lost response');return {canvas:state.selected};},error);
 state.removed=await remove({id:'card',version:3,section:'value',text:'<script>example</script>'},editor);return state;
}
let s=await scenario({cancel:true});assert.equal(s.calls.length,0);assert(!s.removed);assert.equal(s.cleared,0);
s=await scenario({shared:true,retry:true});assert(s.removed);assert.equal(s.calls.length,2);assert.equal(s.calls[0].payload.mutation,s.calls[1].payload.mutation);assert.deepEqual(s.calls[0].payload,{id:'board',op:'remove',card_id:'card',card_version:3,mutation:s.calls[0].payload.mutation});assert(s.html.includes('gesamte Gruppe'));assert(!s.html.includes('<script>'));assert.equal(s.cleared,1);assert.equal(s.focus,1);assert(!s.editing);
s=await scenario({conflict:true});assert(!s.removed);assert.equal(s.adopted,1);assert.equal(s.cleared,0);assert(!s.editing);
s=await scenario({editor:true});assert(s.removed);assert(s.editing,'Nested deletion preserves the card editor lifecycle');
s=await scenario({otherDraft:true});assert(s.removed);assert.equal(s.cleared,0,'Deleting one card never erases a draft for another card');
s=await scenario({archived:true});assert(!s.removed);assert.equal(s.calls.length,0);
console.log('Direct card deletion verified: cancellation, shared scope, safe preview, exact card revision, stable retries, conflicts, editor lifecycle and unrelated drafts.');
