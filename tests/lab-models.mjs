import './dataset-import.mjs';
import './disclosure-menus.mjs';
import './readiness.mjs';
import './journey-navigation.mjs';
import './landscape-blueprint.mjs';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import './studio-models.mjs';
import './canvas-models.mjs';
import assert from 'node:assert/strict';
import {networkExample,trainEpoch,evaluate,forward,networkLesson,resetNetwork,rgbHex,trainSample,networkRGB,dominantRGB} from '../src/neural.js';
import {quality,queryDataset,joinDatasets,chunks,cosine} from '../src/lab-data.js';
const net=networkExample('xor'),before=evaluate(net).train.loss;
for(let i=0;i<12000;i++)trainEpoch(net,.7);
assert(evaluate(net).train.loss<before/20,'Backpropagation must learn XOR');
assert(forward(net,[0,1]).at(-1)[0]>.8);
assert(forward(net,[1,1]).at(-1)[0]<.2);
const held=networkExample('numbers');held.samples=held.samples.map(s=>({...s,test:true}));assert.throws(()=>trainEpoch(held),/Trainingsbeispiel/);
const data={columns:[{name:'name',type:'text'},{name:'value',type:'number'}],rows:[{name:'A',value:2},{name:'A',value:3},{name:'B',value:null},{name:'B',value:'bad'},{name:'A',value:2}]};
assert.deepEqual(quality(data).map(i=>i.kind),['missing','type','duplicate']);
assert.deepEqual(queryDataset(data,{group:'name',aggregate:'sum',measure:'value'}),[{name:'A',sum:7},{name:'B',sum:0}]);
assert.equal(queryDataset(data,{column:'value',operator:'gte',term:'3'}).length,1);
assert.equal(joinDatasets(data,{columns:[{name:'key',type:'text'}],rows:[{key:'A'}]},'name','key').rows.length,3);
assert.equal(cosine([1,0],[0,1]),0);assert.equal(cosine([1,0],[1,0]),1);assert.throws(()=>cosine([1],[1,2]));
const text='a'.repeat(130),parts=chunks(text,60,10);assert.equal(parts.length,3);assert.equal(parts[1].start,50);assert.throws(()=>chunks(text,60,60));
assert.equal(networkExample('letters').samples[0].input.length,64);
console.log('Learning algorithms verified: XOR, held-out data, joins, quality, chunking and vector similarity.');

for(const kind of ['xor','colors','colors2','numbers','letters']){const net=networkExample(kind);assert.equal(networkLesson(net),kind);const legacy=structuredClone(net);delete legacy.example;assert.equal(networkLesson(legacy),kind);trainEpoch(net);assert.equal(networkLesson(net),kind);const reset=resetNetwork(net);assert.equal(reset.example,kind);assert.deepEqual(reset.samples,net.samples);assert.equal(reset.epochs,0);assert.equal(networkLesson(JSON.parse(JSON.stringify(net))),kind);}
const rgb=networkExample('colors');const beforeRGB=evaluate(rgb).train.loss;for(let i=0;i<500;i++)trainEpoch(rgb);assert(evaluate(rgb).train.loss<beforeRGB/5);assert.equal(networkLesson(rgb),'colors');assert.equal(rgbHex([1,0,.5]),'#ff0080');assert.equal(networkLesson({...rgb,example:undefined,samples:[]}), 'custom','Dimensions alone never label a custom network as RGB');assert.equal(resetNetwork(rgb,[2,4,1]).example,'custom');assert.equal(evaluate(networkExample('numbers')).train.accuracy,null,'Regression is not classified by a false binary accuracy');assert.deepEqual(evaluate(networkExample('numbers')).test.confusion,[]);
console.log('Network lessons verified: stable task identity through training/save/reset, legacy example recovery, explicit RGB channels, useful RGB learning and regression-aware metrics.');

const two=networkExample('colors2');assert.deepEqual(two.layers,[2,6,3]);for(const sample of two.samples){assert.equal(sample.input.length,2);assert.equal(sample.output.length,3);assert(Math.abs(networkRGB(two,sample.input).reduce((a,b)=>a+b,0)-1)<1e-9);}const beforeTwo=evaluate(two).train.loss;for(let i=0;i<1500;i++)trainEpoch(two);assert(evaluate(two).train.loss<beforeTwo/10);assert.equal(evaluate(two).test.accuracy,1);assert.equal(dominantRGB([.5,.5,0]),null);assert.equal(dominantRGB([0,1,0]),1);
const epoch=networkExample('colors2'),samples=structuredClone(epoch);trainEpoch(epoch,.3);for(const sample of samples.samples.filter(s=>!s.test))trainSample(samples,sample,.3);assert.deepEqual(epoch.weights,samples.weights);assert.deepEqual(epoch.biases,samples.biases);assert.throws(()=>trainSample(samples,samples.samples.find(s=>s.test)),/Testbeispiele/);
console.log('Two-input colors verified: normalized color shares, three outputs, held-out learning and exact per-sample/epoch weight parity.');

const workerSource=readFileSync(new URL('../src/lab-worker.js',import.meta.url),'utf8').replace(/^import .*;\n/,'');const traced=networkExample('colors2'),expected=structuredClone(traced),frames=[];trainEpoch(expected,.3);const workerContext={trainEpoch,trainSample,evaluate,postMessage:message=>frames.push(structuredClone(message))};runInNewContext(workerSource,workerContext);workerContext.onmessage({data:{network:traced,epochs:1,rate:.3,trace:true}});assert.equal(frames.length,4);assert.deepEqual(frames.at(-1).network.weights,expected.weights);assert.equal(frames.at(-1).network.epochs,1);assert(frames.slice(0,-1).every(frame=>!frame.trace.sample.test));
const large=networkExample('colors2');large.samples=Array.from({length:1000},(_,i)=>({...large.samples[i%3]}));frames.length=0;workerContext.onmessage({data:{network:large,epochs:1,rate:.3,trace:true}});assert(frames.length<=14,'Large datasets produce bounded snapshots instead of minutes of playback');
for(const file of ['ai-groups.php','graph-directions.php','converter-migration.php']){const result=spawnSync('php',[new URL(file,import.meta.url).pathname],{encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);console.log(result.stdout.trim());}
console.log('Training animation frames verified against real backpropagation, held-out exclusion and bounded large-dataset playback.');
