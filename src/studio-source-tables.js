import {inferColumns} from './studio-models.js';

const forbidden=['__proto__','constructor','prototype'];
export function checkColumnNames(names){
 if(!names.length||names.length>50||names.some(k=>!k.trim()||[...k].length>80||/[\x00-\x1f\x7f]/.test(k)||forbidden.includes(k)))throw Error('Die Daten benötigen 1–50 gültige Spalten mit höchstens 80 Zeichen.');
}
export function normalizeTable(rows,limit=1000,columns=null){
 if(!Array.isArray(rows)||rows.length>limit||rows.some(r=>!r||Array.isArray(r)||typeof r!=='object'))throw Error(`Bitte eine Objektliste mit höchstens ${limit} Zeilen verwenden.`);
 const names=columns?.map(c=>c.name)||[...new Set(rows.flatMap(r=>Object.keys(r)))];checkColumnNames(names);
 rows=rows.map(r=>Object.fromEntries(names.map(k=>[k,typeof r[k]==='object'&&r[k]!==null?JSON.stringify(r[k]):r[k]??null])));
 return {rows,columns:columns||inferColumns(rows)};
}
export function discoverJsonTables(value){
 const tables=[];let visited=0;
 function visit(node,path,label,depth,columns=null){
  if(++visited>20000||depth>32)throw Error('Die JSON-Struktur ist zu tief oder zu umfangreich. Bitte einen kleineren Ausschnitt verwenden.');
  if(!node||typeof node!=='object')return;
  if(Array.isArray(node)){
   if(node.every(r=>r&&typeof r==='object'&&!Array.isArray(r))){tables.push({id:path,name:path,label,rows:node,...(columns?{columns}:{})});if(tables.length>100)throw Error('Mehr als 100 Listen gefunden. Bitte die Datei aufteilen.');}
   node.forEach((r,i)=>{if(r&&typeof r==='object')visit(r,`${path}[${i}]`,label,depth+1);});
  }else{
   const schema=Array.isArray(node.rows)&&Array.isArray(node.columns)&&node.columns.every(c=>c&&typeof c.name==='string'&&['text','number','boolean'].includes(c.type))?node.columns:null;
   for(const [key,child] of Object.entries(node))if(child&&typeof child==='object'&&!(key==='columns'&&schema))visit(child,`${path}[${JSON.stringify(key)}]`,key,depth+1,key==='rows'?schema:null);
  }
 }
 visit(value,'$','daten',0);
 if(!tables.length&&value&&typeof value==='object'&&!Array.isArray(value))tables.push({id:'$',name:'$ · Einzelobjekt',label:'daten',rows:[value]});
 if(!tables.length)throw Error('Keine Listen aus JSON-Objekten gefunden.');
 return tables;
}
export function tableAliases(tables){
 const used=new Set();return tables.map((t,i)=>{const stem=(t.label||t.name||`t${i+1}`).replace(/[^a-zA-Z0-9_]/g,'_').slice(0,24)||`t${i+1}`;let alias=stem,n=1;while(used.has(alias))alias=`${stem}_${++n}`;used.add(alias);return alias;});
}
const joinKey=value=>value===null||value===undefined||value===''?null:typeof value==='number'?`n:${value}`:typeof value==='boolean'?`b:${value}`:`s:${value}`;
export function combineTables(tables,{mode='join',joins=[]}={},limit=1000){
 if(!tables.length||tables.length>6)throw Error('Bitte eine bis sechs Listen oder Tabellen auswählen.');
 const aliases=tables.map(t=>t.alias);if(new Set(aliases).size!==aliases.length)throw Error('Tabellen benötigen unterschiedliche Namen.');
 const inputs=tables.map(t=>({...t,...normalizeTable(t.rows,limit,t.columns)}));
 if(inputs.length===1)return {...inputs[0],unmatched:[],expanded:0};
 let columns=[],rows=[],unmatched=[],expanded=0;
 const push=row=>{if(rows.length>=limit)throw Error(`Das Ergebnis überschreitet ${limit} Zeilen. Bitte weniger Daten oder eindeutigere Schlüssel wählen.`);rows.push(row);};
 if(mode==='append'){
  const names=[...new Set(inputs.flatMap(t=>t.columns.map(c=>c.name)))];let sourceColumn='quelle';while(names.includes(sourceColumn))sourceColumn='_'+sourceColumn;checkColumnNames([...names,sourceColumn]);
  for(const table of inputs)for(const row of table.rows)push(Object.fromEntries([...names.map(k=>[k,row[k]??null]),[sourceColumn,table.alias]]));
  columns=names.map(name=>{const types=inputs.flatMap(t=>t.columns.filter(x=>x.name===name).map(x=>x.type));return {name,type:new Set(types).size===1?types[0]:'text'};});columns.push({name:sourceColumn,type:'text'});
  return {columns,rows,sourceColumn,unmatched,expanded};
 }
 if(mode!=='join'||joins.length!==inputs.length-1)throw Error('Bitte für jede weitere Tabelle eine Beziehung festlegen.');
 const qualify=t=>t.columns.map(c=>({...c,name:t.alias+'.'+c.name}));
 columns=qualify(inputs[0]);checkColumnNames(columns.map(c=>c.name));
 rows=inputs[0].rows.map(r=>Object.fromEntries(inputs[0].columns.map(c=>[inputs[0].alias+'.'+c.name,r[c.name]??null])));
 for(let i=1;i<inputs.length;i++){
  const table=inputs[i],rule=joins[i-1];
  if(!columns.some(c=>c.name===rule.left)||!table.columns.some(c=>c.name===rule.right)||!['left','inner'].includes(rule.how))throw Error('Bitte gültige Schlüsselspalten und eine Verknüpfungsart wählen.');
  const added=qualify(table);columns=[...columns,...added];checkColumnNames(columns.map(c=>c.name));
  const index=new Map();for(const r of table.rows){const key=joinKey(r[rule.right]);if(key!==null){if(!index.has(key))index.set(key,[]);index.get(key).push(r);}}
  const previous=rows;rows=[];let missing=0;
  for(const row of previous){const matches=index.get(joinKey(row[rule.left]))||[];if(!matches.length){missing++;if(rule.how==='left')push({...row,...Object.fromEntries(added.map(c=>[c.name,null]))});}
   else{expanded+=Math.max(0,matches.length-1);for(const match of matches)push({...row,...Object.fromEntries(table.columns.map(c=>[table.alias+'.'+c.name,match[c.name]??null]))});}
  }
  unmatched.push({table:table.alias,count:missing});
 }
 return {columns,rows,unmatched,expanded};
}
