import {completeGraphModel} from './graph-model.js';
const validName=v=>{const n=String(v??'').trim();if(!n||[...n].length>80||/[\x00-\x1f\x7f]/.test(n)||['__proto__','constructor','prototype'].includes(n))throw Error('Einen gültigen Eigenschaftsnamen mit höchstens 80 Zeichen angeben.');return n;};
export function graphPropertyValue(value,type){
 if(!['text','number','boolean'].includes(type))throw Error('Unbekannter Eigenschaftstyp.');
 if(value===null||value===undefined||value==='')return null;
 if(type==='text'){const text=String(value);if(text.length>1000)throw Error('Eigenschaftswerte dürfen höchstens 1.000 Zeichen haben.');return text;}
 if(type==='number'){const n=typeof value==='string'&&value.trim()===''?NaN:Number(value);if(typeof value==='boolean'||!Number.isFinite(n))throw Error('Für diese Eigenschaft eine gültige Zahl angeben.');return n;}
 if(type==='boolean'){const key=String(value).trim().toLocaleLowerCase('de');if(['true','ja','1'].includes(key))return true;if(['false','nein','0'].includes(key))return false;throw Error('Für diese Eigenschaft Ja oder Nein wählen.');}
 throw Error('Unbekannter Eigenschaftstyp.');
}
export function graphPropertyDefinition(g,node,key){return g.types?.find(t=>t.name===node.type)?.fields?.find(f=>f.name===key);}
export function setGraphNodeProperty(graph,nodeId,oldKey,value){
 const next=completeGraphModel(graph),node=next.nodes.find(n=>n.id===nodeId);if(!node)throw Error('Knoten nicht gefunden.');const key=validName(value.name),definition=graphPropertyDefinition(next,node,oldKey||key);node.properties??={};
 if(key!==oldKey&&Object.hasOwn(node.properties,key))throw Error('Diese Eigenschaft existiert an diesem Knoten bereits.');
 if(definition&&(key!==oldKey||definition.type!==value.type))throw Error('Name und Typ dieser Eigenschaft werden am Knotentyp verwaltet.');
 const parsed=graphPropertyValue(value.value,value.type);if(definition?.required&&(parsed===null||parsed===''))throw Error('Dieses Pflichtfeld benötigt einen Wert.');
 if(oldKey&&oldKey!==key)delete node.properties[oldKey];node.properties[key]=parsed;if(Object.keys(node.properties).length>30)throw Error('Höchstens 30 Eigenschaften je Knoten.');return next;
}
export function removeGraphNodeProperty(graph,nodeId,key){const next=completeGraphModel(graph),node=next.nodes.find(n=>n.id===nodeId);if(!node)throw Error('Knoten nicht gefunden.');if(graphPropertyDefinition(next,node,key))throw Error('Diese Eigenschaft wird am Knotentyp verwaltet.');node.properties??={};delete node.properties[key];return next;}
export function editGraphTypeField(graph,typeName,oldKey,value,override=null){
 const next=completeGraphModel(graph),type=next.types.find(t=>t.name===typeName),index=type?.fields.findIndex(f=>f.name===oldKey);if(index===undefined||index<0)throw Error('Modelleigenschaft nicht gefunden.');const key=validName(value.name);
 if(type.fields.some((f,i)=>i!==index&&f.name===key))throw Error('Dieser Eigenschaftsname ist im Knotentyp schon vergeben.');
 for(const node of next.nodes.filter(n=>n.type===typeName)){node.properties??={};if(key!==oldKey&&Object.hasOwn(node.properties,key))throw Error('„'+node.label+'“ besitzt bereits eine Eigenschaft „'+key+'“.');const input=override?.nodeId===node.id?override.value:node.properties[oldKey],parsed=graphPropertyValue(input,value.type);if(value.required&&(parsed===null||parsed===''))throw Error('„'+node.label+'“ benötigt einen Wert für das Pflichtfeld.');if(Object.hasOwn(node.properties,oldKey)||override?.nodeId===node.id){delete node.properties[oldKey];node.properties[key]=parsed;}}
 type.fields[index]={name:key,type:value.type,required:!!value.required};return next;
}
export function removeGraphTypeField(graph,typeName,key){
 const next=completeGraphModel(graph),type=next.types.find(t=>t.name===typeName);
 if(!type?.fields.some(f=>f.name===key))throw Error('Modelleigenschaft nicht gefunden.');
 type.fields=type.fields.filter(f=>f.name!==key);
 for(const node of next.nodes.filter(n=>n.type===typeName)){node.properties??={};delete node.properties[key];}
 return next;
}
