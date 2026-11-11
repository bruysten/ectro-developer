import assert from 'node:assert/strict';
import {planEmbeddings,applyEmbeddings,embeddingContextCurrent} from '../src/rag-embeddings.js';
const source=()=>({text:'Synthetic source',size:100,overlap:10,chunks:[{text:'First',vector:[9],graphLink:'graph:node'},{text:'Second',vector:[8]}],answer:'Old answer',queryVector:[9],hits:[1],selected:[0]});
const conn={id:'embedding',model:'synthetic-vector',capability:'embedding'},r=source(),plan=planEmbeddings(r,conn);
assert.throws(()=>planEmbeddings(r,{...conn,capability:'chat'}),/Embedding-Zugang/);
assert.throws(()=>planEmbeddings({...r,chunks:[]},conn),/Abschnitte/);
for(const bad of [null,[],[[1,2]],[[1],[2,3]],[[NaN],[2]],[[1],['2']]]){const before=structuredClone(r);assert.throws(()=>applyEmbeddings(r,plan,bad),/ungültig/);assert.deepEqual(r,before);}
r.chunks[0].graphLink='other:node';assert(embeddingContextCurrent(r,plan));
applyEmbeddings(r,plan,[[1,2],[3,4]]);assert.equal(r.chunks[0].graphLink,'other:node');assert.deepEqual(r.chunks[1].vector,[3,4]);assert.equal(r.embeddingModel,conn.model);assert.equal(r.embeddingConnection,conn.id);assert.equal(r.answer,'');assert(!r.queryVector);
for(const change of [v=>v.text+=' edited',v=>v.chunks.reverse(),v=>v.chunks[0].text+=' edited',v=>v.size=101]){const v=source(),p=planEmbeddings(v,conn);change(v);assert(!embeddingContextCurrent(v,p));const before=structuredClone(v);assert.throws(()=>applyEmbeddings(v,p,[[1],[2]]),/geändert/);assert.deepEqual(v,before);}
console.log('Embedding capability, source identity, atomic vector updates and malformed response checks passed.');
