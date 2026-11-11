export const AI_SECTIONS={prompt:'Prompts',rag:'RAG',network:'Neuronales Netz'};
export function chooseAiSection({kinds,tools,objects,requested='',current='',entry='',remembered={}}){
 const allowed=kinds.filter(k=>!tools||tools.includes(k)),explicit=objects.find(o=>o.id===requested&&allowed.includes(o.kind));
 const kind=explicit?.kind||(allowed.includes(current)?current:allowed.includes(entry)?entry:allowed.find(k=>objects.some(o=>o.kind===k))||allowed[0]||'');
 return {allowed,kind,object:explicit||objects.find(o=>o.kind===kind&&o.id===remembered[kind])||objects.find(o=>o.kind===kind)||null};
}
