const context=rag=>JSON.stringify([rag.text,rag.size,rag.overlap,rag.chunks.map(c=>c.text)]);
export function planEmbeddings(rag,connection){
 if(!connection||connection.capability!=='embedding')throw Error('Einen freigegebenen Embedding-Zugang auswählen. Textgenerierungsmodelle sind dafür nicht geeignet.');
 if(!rag.chunks?.length)throw Error('Zuerst Abschnitte bilden.');
 return {connection:connection.id,model:connection.model,texts:rag.chunks.map(c=>c.text),context:context(rag)};
}
export const embeddingContextCurrent=(rag,plan)=>!!rag.chunks&&context(rag)===plan.context;
export function applyEmbeddings(rag,plan,vectors){
 if(!embeddingContextCurrent(rag,plan))throw Error('Die Textabschnitte wurden inzwischen geändert. Embeddings für den aktuellen Text erneut erzeugen.');
 const dim=vectors?.[0]?.length;if(!Array.isArray(vectors)||vectors.length!==rag.chunks.length||!dim||dim>4096||vectors.some(v=>!Array.isArray(v)||v.length!==dim||v.some(n=>typeof n!=='number'||!Number.isFinite(n))))throw Error('Die Embedding-Antwort ist unvollständig oder ungültig.');
 rag.chunks.forEach((c,i)=>c.vector=vectors[i]);rag.embeddingConnection=plan.connection;rag.embeddingModel=plan.model;delete rag.queryVector;rag.hits=[];rag.selected=[];rag.context='';rag.answer='';
}
