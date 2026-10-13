import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
let result,checks=0;globalThis.self={postMessage:value=>result=value};
await import('../src/chat-preview-worker.js');
const preview=files=>{result=null;self.onmessage({data:zipSync(files)});return result;};
for(const path of ['word/document.xml','xl/sharedStrings.xml','xl/worksheets/sheet1.xml','ppt/slides/slide1.xml','content.xml']){
  assert.equal(preview({[path]:strToU8('<document>Fixture</document>')}).parts[0].xml,'<document>Fixture</document>');checks++;
}
assert.deepEqual(preview({'word/document.xml':strToU8('<doc/>'),'../private.xml':strToU8('excluded'),'word/macros.bin':strToU8('excluded')}).parts.map(p=>p.name),['word/document.xml']);checks++;
assert.ok(preview({'word/document.xml':new Uint8Array(2097153)}).error);checks++;
const many={};for(let i=1;i<=21;i++)many[`ppt/slides/slide${i}.xml`]=strToU8('<slide/>');assert.ok(preview(many).error);checks++;
self.onmessage({data:Uint8Array.of(0,1,2,3)});assert.ok(result.error);checks++;
console.log(`${checks} Office preview format/isolation/resource checks passed.`);
