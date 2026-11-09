import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {archiveExample,archiveDocument,archiveDuplicates,archiveIssues,archiveSearch,archiveRagContent,archiveSourceText} from '../src/archive-models.js';
import {mountArchive} from '../src/studio-archive.js';
const c=archiveExample(),docs=c.documents;
assert.equal(archiveSearch(docs,'Retoure',{mode:'filename'}).length,0);
assert.deepEqual(archiveSearch(docs,'Retoure').map(h=>h.doc.id),['handbuch']);
assert.deepEqual(archiveSearch(docs,'Retoure Kundenservice').map(h=>h.doc.id),['handbuch']);
assert.equal(archiveSearch(docs,'Retoure unbekannt').length,0);
assert.deepEqual(archiveDuplicates(docs),[['handbuch','kopie']]);
assert.equal(archiveDuplicates([archiveDocument(),archiveDocument()]).length,0,'Empty texts are not duplicates');
assert.equal(archiveDuplicates([archiveDocument({text:'  ÄPFEL\n KAUFEN '}),archiveDocument({text:'äpfel kaufen'})]).length,1);
assert.equal(archiveSearch(docs,'Rücksendung').length,3);
assert.equal(archiveSearch(docs,'Rücksendung',{currentOnly:true}).length,1);
assert.equal(archiveSearch(docs,'Retoure',{classification:'public'}).length,0);
assert.equal(archiveSearch(docs,'  ').length,0);assert.equal(archiveSearch(docs,'!!!').length,0);
assert.ok(archiveSearch(docs,'Rechnung')[0].reasons.some(r=>r.field==='title'));
assert.equal(archiveIssues(docs[0]).length,0);assert.ok(archiveIssues(docs[4]).includes('Text fehlt'));
assert.equal(archiveSearch(docs,'zehn',{currentOnly:true}).length,0,'Old guidance is excluded by status, never silently preferred');
assert.equal(archiveRagContent(docs[0]).text,archiveSourceText(docs[0]));assert.match(archiveSourceText(docs[1]),/Status: Überholt/);
assert.equal(archiveSearch([archiveDocument({text:'a b c d e f g h i j k l m n o p q r s t'})],'a b c d e f g h i j k l m n o p q r s t missing').length,0,'No query terms are silently dropped');
const edited=structuredClone(docs);edited[0].tags=[];assert.equal(archiveSearch(edited,'Retoure').length,0,'Metadata changes affect findability');
const out=spawnSync('php',['tests/archive.php'],{input:JSON.stringify(c),encoding:'utf8'});assert.equal(out.status,0,out.stdout+out.stderr);process.stdout.write(out.stdout);
console.log('Archive search: filename/content contrast, AND matching, field evidence, filters, missing text and exact duplicates verified.');

// Exercise actual extraction guards without a browser or external PDF/AI service.
const source=readFileSync(new URL('../src/pdf-preview.js',import.meta.url),'utf8'),extractSource=source.slice(source.indexOf('export async function extractPDFText'),source.indexOf('export async function renderPDF')).replace('export ','');
async function extractFixture({pages=1,text='Readable text',size=100}={}){let destroyed=false,options;const extract=runInNewContext(extractSource+';extractPDFText',{setTimeout,clearTimeout,Uint8Array,getDocument:o=>{options=o;return {promise:Promise.resolve({numPages:pages,getPage:async()=>({getTextContent:async()=>({items:[{str:text,hasEOL:true}]}),cleanup(){}})}),destroy:async()=>{destroyed=true;}};}});try{return {text:await extract({size,arrayBuffer:async()=>new ArrayBuffer(0)}),destroyed,options};}catch(error){assert.equal(destroyed,size<=5*1024*1024);throw error;}}
const extracted=await extractFixture();assert.match(extracted.text,/\[Seite 1\]\nReadable text/);assert.equal(extracted.destroyed,true);assert.equal(extracted.options.isEvalSupported,false);assert.equal(extracted.options.enableXfa,false);
assert.equal((await extractFixture({text:''})).text,'');await assert.rejects(()=>extractFixture({pages:31}),/30 PDF-Seiten/);await assert.rejects(()=>extractFixture({text:'x'.repeat(12001)}),/12.000/);await assert.rejects(()=>extractFixture({size:6*1024*1024}),/5 MB/);
console.log('Archive PDF extraction: local safe settings, page attribution, empty scans, page/text/byte limits and task cleanup verified.');

let modalTitle='',modalBody='';const hostile=archiveDocument({id:'hostile',title:'<img src=x onerror=alert(1)>',text:'<script>untrusted()</script>',filename:'<unsafe>.txt'}),openButton={dataset:{edit:'hostile'}};
const root={innerHTML:'',querySelectorAll:q=>q==='[data-edit]'?[openButton]:[],querySelector:()=>null};
const dispose=mountArchive(root,{content:{documents:[hostile]},state:{},flags:{},info:{config:{}},icon:()=>'',alive:()=>true,modal:async(title,body)=>{modalTitle=title;modalBody=body;},fail:error=>{throw error;}});
assert.ok(!root.innerHTML.includes(hostile.title));assert.match(root.innerHTML,/&lt;script&gt;/);await openButton.onclick();assert.match(modalTitle,/&lt;img/);assert.match(modalBody,/&lt;script&gt;/);assert.ok(!modalBody.includes('<script>'));dispose();
console.log('Archive rendering: imported titles, body text, filenames and dialog titles stay inert.');

let editOptions;const guardedRoot={innerHTML:'',querySelectorAll:q=>q==='[data-edit]'?[openButton]:[],querySelector:()=>null};
mountArchive(guardedRoot,{content:{documents:[hostile]},state:{},flags:{},info:{config:{}},icon:()=>'',alive:()=>true,modal:async(title,body,onSubmit,label,options)=>{if(label==='Bearbeiten')await onSubmit();else editOptions=options;},fail:error=>{throw error;}});
await openButton.onclick();assert.equal(editOptions.freezeOnSubmit,true);assert.equal(await editOptions.beforeClose(),true,'Escape is routed through the modal close guard while a save is pending');
let projectOptions;const projectButton={dataset:{archive:'project'},closest:()=>null};const projectRoot={innerHTML:'',querySelectorAll:q=>q==='[data-archive]'?[projectButton]:[],querySelector:()=>null};
mountArchive(projectRoot,{content:{documents:[]},state:{},flags:{},info:{config:{}},icon:()=>'',alive:()=>true,get:async()=>({files:[{kind:'file',path:'example.txt'}]}),modal:async(title,body,onSubmit,label,options)=>{projectOptions=options;},fail:error=>{throw error;}});
await projectButton.onclick();await new Promise(resolve=>setImmediate(resolve));assert.equal(projectOptions.freezeOnSubmit,true);assert.equal(typeof projectOptions.beforeClose,'function');
console.log('Archive dialogs: save/import submissions block late cancellation until the in-flight operation settles.');
