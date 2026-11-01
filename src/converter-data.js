export function datasetRows(dataset){
  return dataset.rows.map(row=>Object.fromEntries(dataset.columns.map(column=>[column.name,row[column.name]??null])));
}
export function datasetFromRows(rows,maxRows=1000){
  if(!rows.length)throw Error('Die Umwandlung enthält keine Datensätze.');
  if(rows.length>maxRows)throw Error(`Ein Datensatz im Daten-Labor darf höchstens ${maxRows.toLocaleString('de-DE')} Zeilen enthalten.`);
  const names=[...new Set(rows.flatMap(row=>Object.keys(row)))];
  if(!names.length||names.length>50)throw Error('Bitte Daten mit 1 bis 50 Spalten verwenden.');
  if(new Set(names.map(n=>n.trim())).size!==names.length||names.some(name=>!name.trim()||[...name].length>80||/[\x00-\x1f\x7f]/.test(name)||['__proto__','constructor','prototype'].includes(name.trim())))throw Error('Die Spalten benötigen gültige, eindeutige Namen mit höchstens 80 Zeichen.');
  const columns=names.map(name=>{const values=rows.map(row=>row[name]).filter(v=>v!==null&&v!==undefined&&v!=='');return {name,type:values.length&&values.every(v=>typeof v==='number'&&Number.isFinite(v))?'number':values.length&&values.every(v=>typeof v==='boolean')?'boolean':'text'};});
  return {columns,rows:rows.map(row=>Object.fromEntries(columns.map(c=>{
    const v=row[c.name];return [c.name,v===null||v===undefined?null:c.type==='text'&&typeof v!=='string'?(typeof v==='object'?JSON.stringify(v):String(v)):v];
  })))};
}
