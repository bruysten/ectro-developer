export const GRAPH_TYPE_ICONS=[['category','Objekt'],['person','Person'],['apartment','Unternehmen'],['location_on','Ort'],['description','Dokument'],['event','Ereignis'],['inventory_2','Produkt'],['school','Lernen'],['psychology','Wissen'],['database','Daten'],['public','Welt'],['hub','Netzwerk']];
export const GRAPH_TYPE_COLORS=[['#b50072','Magenta'],['#227c91','Petrol'],['#7055c9','Violett'],['#a44a1a','Orange'],['#35854c','Grün'],['#ad7200','Gold'],['#3463ac','Blau'],['#59636f','Grau']];
export function graphTypeAppearance(type={}){
  let hash=0;for(const char of type.name||'Objekt')hash=(hash*31+char.codePointAt(0))>>>0;
  const fallback=/person|mensch|teilnehmer/i.test(type.name||'')?'person':/firma|unternehmen|organisation/i.test(type.name||'')?'apartment':'category';
  const icon=GRAPH_TYPE_ICONS.some(([id])=>id===type.icon)?type.icon:fallback;
  const color=/^#[0-9a-f]{6}$/i.test(type.color||'')?type.color:GRAPH_TYPE_COLORS[fallback==='person'?0:fallback==='apartment'?1:hash%GRAPH_TYPE_COLORS.length][0];
  const rgb=color.slice(1).match(/../g).map(v=>{const c=parseInt(v,16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
  const luminance=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  return {color,icon,ink:luminance>.179?'#000000':'#ffffff'};
}
function typeStyle(value){
  if(!/^#[0-9a-f]{6}$/i.test(value.color||''))throw Error('Bitte eine gültige Farbe auswählen.');
  if(!GRAPH_TYPE_ICONS.some(([id])=>id===value.icon))throw Error('Bitte ein vorhandenes Icon auswählen.');
  return {color:value.color.toLowerCase(),icon:value.icon};
}
function relationKey(r){return JSON.stringify([r.name,r.from,r.to]);}
function nodeTypes(graph){return new Map(graph.nodes.map(n=>[n.id,n.type||'Objekt']));}
function matches(edge,rule,types){return edge.label===rule.name&&types.get(edge.from)===rule.from&&types.get(edge.to)===rule.to;}
function name(value){
  const n=String(value??'').trim();
  if(!n||[...n].length>80||/[\x00-\x1f\x7f]/.test(n)||['__proto__','constructor','prototype'].includes(n))throw Error('Bitte eine gültige Bezeichnung mit höchstens 80 Zeichen eingeben.');
  return n;
}

// Legacy free-form edges become reusable types without changing existing data.
export function graphRelationCatalog(graph){
  const types=nodeTypes(graph),catalog=new Map();
  for(const r of graph.relations||[])catalog.set(relationKey(r),{...r});
  for(const edge of graph.edges){
    if(!types.has(edge.from)||!types.has(edge.to))continue;
    const r={name:edge.label,from:types.get(edge.from),to:types.get(edge.to)};
    if(!catalog.has(relationKey(r)))catalog.set(relationKey(r),r);
  }
  return [...catalog.values()];
}
export function graphRelationUsage(graph,rule){const types=nodeTypes(graph);return graph.edges.filter(e=>matches(e,rule,types)).length;}
export function completeGraphModel(graph){
  const next=structuredClone(graph),types=new Map((next.types||[]).map(t=>[t.name,{...t,fields:t.fields||[]}]));
  for(const n of next.nodes)if(!types.has(n.type||'Objekt'))types.set(n.type||'Objekt',{name:n.type||'Objekt',fields:[]});
  next.types=[...types.values()];next.relations=graphRelationCatalog(next);
  return next;
}
function ruleInput(graph,value){
  const rule={name:name(value.name),from:value.from,to:value.to};
  if(!graph.types.some(t=>t.name===rule.from)||!graph.types.some(t=>t.name===rule.to))throw Error('Bitte vorhandene Start- und Zieltypen auswählen.');
  return rule;
}
export function addGraphRelation(graph,value){
  const next=completeGraphModel(graph),rule=ruleInput(next,value);
  if(next.relations.some(r=>relationKey(r)===relationKey(rule)))throw Error('Dieser Beziehungstyp ist für diese Start- und Zieltypen bereits vorhanden.');
  next.relations.push(rule);return next;
}
export function editGraphRelation(graph,index,value){
  const next=completeGraphModel(graph),old=next.relations[index];
  if(!old)throw Error('Beziehungstyp nicht gefunden.');
  const rule=ruleInput(next,value);
  if(next.relations.some((r,i)=>i!==index&&relationKey(r)===relationKey(rule)))throw Error('Dieser Beziehungstyp ist bereits vorhanden.');
  if((rule.from!==old.from||rule.to!==old.to)&&graphRelationUsage(next,old))throw Error('Start- und Zieltyp werden noch von Verbindungen verwendet. Zuerst diese Verbindungen ändern.');
  const types=nodeTypes(next);
  for(const edge of next.edges)if(matches(edge,old,types))edge.label=rule.name;
  next.relations[index]=rule;return next;
}
export function removeGraphRelation(graph,index){
  const next=completeGraphModel(graph),rule=next.relations[index];
  if(!rule)throw Error('Beziehungstyp nicht gefunden.');
  if(graphRelationUsage(next,rule))throw Error('Dieser Beziehungstyp wird noch verwendet. Zuerst die zugehörigen Verbindungen ändern oder entfernen.');
  next.relations.splice(index,1);return next;
}
export function setGraphEdge(graph,edge){
  const next=completeGraphModel(graph),types=nodeTypes(next);
  if(!types.has(edge.from)||!types.has(edge.to)||!next.relations.some(r=>matches(edge,r,types)))throw Error('Der Beziehungstyp passt nicht zu Start- und Zielknoten.');
  const index=next.edges.findIndex(e=>e.id===edge.id);
  if(index<0)next.edges.push(structuredClone(edge));else next.edges[index]=structuredClone(edge);
  return next;
}
export function addGraphNodeType(graph,value){
  const next=completeGraphModel(graph),type={name:name(value.name),fields:[],...typeStyle(value)};
  if(next.types.some(t=>t.name===type.name))throw Error('Dieser Knotentyp ist bereits vorhanden.');
  next.types.push(type);return next;
}
export function editGraphNodeType(graph,index,value){
  const next=completeGraphModel(graph),old=next.types[index];
  if(!old)throw Error('Knotentyp nicht gefunden.');
  const newName=name(value.name),style=typeStyle(value);
  if(next.types.some((t,i)=>i!==index&&t.name===newName))throw Error('Dieser Knotentyp ist bereits vorhanden.');
  next.types[index]={...old,name:newName,...style};
  for(const node of next.nodes)if(node.type===old.name)node.type=newName;
  for(const rule of next.relations){if(rule.from===old.name)rule.from=newName;if(rule.to===old.name)rule.to=newName;}
  return next;
}
export function removeGraphNodeType(graph,index){
  const next=completeGraphModel(graph),type=next.types[index];
  if(!type)throw Error('Knotentyp nicht gefunden.');
  if(next.nodes.some(n=>n.type===type.name)||next.relations.some(r=>r.from===type.name||r.to===type.name))throw Error('Dieser Knotentyp wird noch von Knoten oder Beziehungstypen verwendet.');
  next.types.splice(index,1);return next;
}
export function setGraphNode(graph,node){
  const next=completeGraphModel(graph);
  if(!next.types.some(t=>t.name===node.type))throw Error('Bitte einen vorhandenen Knotentyp auswählen.');
  const index=next.nodes.findIndex(n=>n.id===node.id);
  if(index<0)next.nodes.push(structuredClone(node));else next.nodes[index]=structuredClone(node);
  return next;
}
