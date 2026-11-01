// Deterministic PCA of unit embeddings. Query vectors never change the document axes.
export function unitVector(vector,dimension){
  if(!Array.isArray(vector)||!vector.length||vector.length>4096||(dimension!==undefined&&vector.length!==dimension)||vector.some(v=>!Number.isFinite(v)))throw Error('Vektoren müssen dieselbe Dimension und endliche Zahlen haben.');
  const norm=Math.sqrt(vector.reduce((s,v)=>s+v*v,0));
  if(!Number.isFinite(norm)||norm===0)throw Error('Ein Nullvektor hat keine semantische Richtung.');
  return vector.map(v=>v/norm);
}
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export function vectorSpace(vectors,query=null){
  if(!Array.isArray(vectors)||!vectors.length||vectors.length>200)throw Error('1–200 Textvektoren erforderlich.');
  const d=unitVector(vectors[0]).length,rows=vectors.map(v=>unitVector(v,d)),n=rows.length;
  const similarity=rows.map((a,i)=>rows.map((b,j)=>i===j?1:Math.max(-1,Math.min(1,dot(a,b)))));
  const mean=Array.from({length:d},(_,k)=>rows.reduce((s,r)=>s+r[k],0)/n);
  const rowMean=similarity.map(r=>r.reduce((s,v)=>s+v,0)/n),grand=rowMean.reduce((s,v)=>s+v,0)/n;
  const gram=similarity.map((r,i)=>r.map((v,j)=>v-rowMean[i]-rowMean[j]+grand));
  const total=Math.max(0,gram.reduce((s,r,i)=>s+r[i],0)),basis=[],eigen=[],loadings=[];
  for(let axis=0;axis<Math.min(3,n-1);axis++){
    let v=Array.from({length:n},(_,i)=>Math.sin((i+1)*(axis+1)*1.73)+Math.cos((i+1)*.37));
    const orthogonal=w=>{for(const b of basis){const t=dot(w,b);w=w.map((x,i)=>x-t*b[i]);}const norm=Math.sqrt(dot(w,w));return norm>1e-10?w.map(x=>x/norm):null;};
    v=orthogonal(v);if(!v)break;
    for(let step=0;step<120;step++){const next=orthogonal(gram.map(r=>dot(r,v)));if(!next){v=null;break;}const delta=Math.abs(dot(v,next));v=next;if(1-delta<1e-11)break;}
    if(!v)break;const value=dot(v,gram.map(r=>dot(r,v)));if(value<Math.max(1e-10,total*1e-9))break;
    // Fix the arbitrary eigenvector sign for reproducible labels and screenshots.
    const pivot=v.reduce((best,x,i)=>Math.abs(x)>Math.abs(v[best])?i:best,0);if(v[pivot]<0)v=v.map(x=>-x);
    basis.push(v);eigen.push(value);loadings.push(Array.from({length:d},(_,k)=>rows.reduce((s,r,i)=>s+(r[k]-mean[k])*v[i],0)/Math.sqrt(value)));
  }
  const project=row=>Array.from({length:3},(_,k)=>loadings[k]?dot(row.map((v,i)=>v-mean[i]),loadings[k]):0);
  const normalizedQuery=query?unitVector(query,d):null;
  return {dimension:d,normalized:rows,similarity,positions:rows.map(project),variance:Array.from({length:3},(_,k)=>total>1e-10?(eigen[k]||0)/total:0),rank:loadings.length,query:normalizedQuery?{position:project(normalizedQuery),vector:normalizedQuery,scores:rows.map(r=>dot(r,normalizedQuery))}:null};
}
export function similarityEdges(similarity,threshold=.7,neighbors=3){
  const seen=new Set(),edges=[];
  similarity.forEach((row,i)=>row.map((score,j)=>({score,j})).filter(x=>x.j!==i&&x.score>=threshold).sort((a,b)=>b.score-a.score||a.j-b.j).slice(0,neighbors).forEach(({j,score})=>{const a=Math.min(i,j),b=Math.max(i,j),key=a+':'+b;if(!seen.has(key)){seen.add(key);edges.push({a,b,score});}}));
  return edges;
}
export function vectorGroups(count,edges){const groups=Array.from({length:count},(_,i)=>i);for(const {a,b} of edges){const old=groups[b],next=groups[a];for(let i=0;i<count;i++)if(groups[i]===old)groups[i]=next;}const ids=[...new Set(groups)];return groups.map(v=>ids.indexOf(v));}
