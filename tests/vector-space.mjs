import assert from 'node:assert/strict';
import {vectorSpace,unitVector,similarityEdges,vectorGroups} from '../src/vector-space.js';
const close=(a,b,t=1e-6)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
assert.deepEqual(unitVector([3,4]),[.6,.8]);
for(const invalid of [[],[0,0],[1,NaN],[Infinity,1]])assert.throws(()=>unitVector(invalid));
assert.throws(()=>vectorSpace([[1,0],[1,2,3]]));assert.throws(()=>vectorSpace([]));assert.throws(()=>vectorSpace(Array.from({length:201},()=>[1,0])));
const single=vectorSpace([[1,2,3]]);assert.equal(single.rank,0);assert.deepEqual(single.positions,[[0,0,0]]);assert.deepEqual(single.variance,[0,0,0]);
const identical=vectorSpace([[1,2],[2,4],[3,6]]);assert.equal(identical.rank,0);identical.positions.flat().forEach(v=>close(v,0));
const line=vectorSpace([[1,0],[-1,0],[1,0]]);assert.equal(line.rank,1);close(line.variance[0],1);line.positions.forEach(p=>assert.equal(p[2],0));
const input=[[1,0,0,0],[.9,.1,0,0],[0,1,0,0],[0,0,1,0]];
const original=structuredClone(input),space=vectorSpace(input,[.9,.1,0,0]);
assert.deepEqual(input,original,'Projection must not mutate embeddings');assert.equal(space.rank,3);
close(space.variance.reduce((s,v)=>s+v,0),1);
for(let i=0;i<input.length;i++)for(let j=0;j<input.length;j++){
  const projected=space.positions[i].reduce((s,v,k)=>s+(v-space.positions[j][k])**2,0);
  close(projected,2-2*space.similarity[i][j],1e-5);
  close(space.similarity[i][j],space.similarity[j][i]);
}
assert.deepEqual(vectorSpace(input).positions,space.positions,'Query must not rotate or recenter document axes');
space.query.position.forEach((v,i)=>close(v,space.positions[1][i]));close(space.query.scores[1],1);
assert.deepEqual(vectorSpace(input).positions,vectorSpace(input).positions,'PCA is deterministic');
const edges=similarityEdges(space.similarity,.95,1);assert(edges.some(e=>e.a===0&&e.b===1));assert(!edges.some(e=>e.a===0&&e.b===2));
assert.equal(new Set(edges.map(e=>e.a+':'+e.b)).size,edges.length,'Edges are unique');
assert.deepEqual(vectorGroups(5,[{a:0,b:1},{a:2,b:3},{a:1,b:3}]),[0,0,0,0,1]);
assert.equal(similarityEdges(space.similarity,1.1).length,0);
const high=Array.from({length:100},(_,i)=>Array.from({length:1024},(_,j)=>Math.sin(i*1.1+j*.31)+Math.cos(i*.4-j*.27)));
const start=performance.now(),large=vectorSpace(high);assert(large.positions.flat().every(Number.isFinite));assert.equal(large.similarity.length,100);
console.log(`Vector space verified: PCA distances/rank/query stability, similarity, groups, invalid vectors and 100 × 1024 dimensions (${Math.round(performance.now()-start)} ms).`);
