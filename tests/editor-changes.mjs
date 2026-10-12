import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {ChangeSet,Text} from '@codemirror/state';
let seed=17;
const random=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
const symbols=['a','ß','🌍','🧑‍💻','\n','中','é'];
const cases=[];
for(let i=0;i<300;i++){
  const points=Array.from({length:random(80)},()=>symbols[random(symbols.length)]);
  const content=points.join(''),start=random(points.length+1),end=start+random(points.length-start+1);
  const from=points.slice(0,start).join('').length,to=points.slice(0,end).join('').length;
  const insert=Array.from({length:random(15)},()=>symbols[random(symbols.length)]).join('');
  const changes=ChangeSet.of({from,to,insert},content.length);
  cases.push({content,changes:changes.toJSON(),expected:changes.apply(Text.of(content.split('\n'))).toString()});
}
const result=spawnSync('php',['tests/apply-editor-changes.php'],{input:JSON.stringify(cases),encoding:'utf8'});
assert.equal(result.status,0,result.stderr);
assert.deepEqual(JSON.parse(result.stdout),cases.map(c=>c.expected));
console.log('300 CodeMirror/PHP change-protocol checks passed.');
