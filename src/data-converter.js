const labels={csv:'CSV',tsv:'TSV',json:'JSON',xml:'XML'};
const csvRows=(text,delimiter)=>{
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(quoted){if(char==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(char==='"')quoted=false;else cell+=char;}
    else if(char==='"'&&cell==='')quoted=true;
    else if(char===delimiter){row.push(cell);cell='';}
    else if(char==='\n'||char==='\r'){if(char==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(value=>value!==''))rows.push(row);row=[];cell='';}
    else cell+=char;
  }
  if(cell!==''||row.length){row.push(cell);if(row.some(value=>value!==''))rows.push(row);}
  if(quoted)throw Error('Eine CSV-Zelle ist nicht korrekt abgeschlossen.');
  if(!rows.length)return [];
  const headers=rows.shift().map((value,index)=>value.trim()||`Spalte ${index+1}`);
  if(new Set(headers).size!==headers.length)throw Error('Die Spaltennamen müssen eindeutig sein.');
  return rows.map(values=>Object.fromEntries(headers.map((header,index)=>[header,values[index]??''])));
};
function detectCsvDelimiter(text){
  let commas=0,semicolons=0,quoted=false;
  for(let i=0;i<text.length&&text[i]!=='\n'&&text[i]!=='\r';i++){
    if(text[i]==='"'&&text[i+1]==='"'&&quoted){i++;continue;}
    if(text[i]==='"'){quoted=!quoted;continue;}
    if(!quoted&&text[i]===',')commas++;
    if(!quoted&&text[i]===';')semicolons++;
  }
  return semicolons>commas?';':',';
}
const xmlName=name=>{const clean=String(name).replace(/[^\p{L}\p{N}_.-]/gu,'_');return /^[\p{L}_]/u.test(clean)?clean:`_${clean}`;};
const xmlEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
function xmlValue(node){
  const children=[...node.children];
  if(!children.length&&!node.attributes.length)return node.textContent??'';
  const value={};for(const attribute of node.attributes)value[`@${attribute.name}`]=attribute.value;for(const child of children){const parsed=xmlValue(child);if(Object.hasOwn(value,child.tagName))value[child.tagName]=Array.isArray(value[child.tagName])?[...value[child.tagName],parsed]:[value[child.tagName],parsed];else value[child.tagName]=parsed;}
  return value;
}
function parseXml(text){
  const document=new DOMParser().parseFromString(text,'application/xml');
  if(document.querySelector('parsererror'))throw Error('Die XML-Datei ist nicht gültig.');
  const root=document.documentElement;if(!root)throw Error('Das XML-Dokument ist leer.');
  const children=[...root.children];if(!children.length)return [{[root.tagName]:xmlValue(root)}];
  const asRow=node=>{const value=xmlValue(node);return value&&typeof value==='object'&&!Array.isArray(value)?value:{Wert:value};};
  if(children.every(node=>['row','item','record'].includes(node.tagName.toLowerCase())))return children.map(asRow);
  if(children.every(node=>node.children.length||node.attributes.length))return children.map(asRow);
  return [xmlValue(root)];
}
function parseJson(text){
  let value;try{value=JSON.parse(text);}catch{throw Error('Das JSON ist nicht gültig. Bitte Syntax und Anführungszeichen prüfen.');}
  if(Array.isArray(value))return value.map(item=>item&&typeof item==='object'&&!Array.isArray(item)?item:{Wert:item??''});
  if(value&&typeof value==='object'){
    const collection=Object.values(value).find(item=>Array.isArray(item)&&item.every(entry=>entry&&typeof entry==='object'&&!Array.isArray(entry)));
    return collection||[value];
  }
  return [{Wert:value??''}];
}
export function parseData(text,format){
  if(!text.trim())throw Error('Fügen Sie zuerst Daten ein oder wählen Sie eine Datei aus.');
  if(format==='csv'||format==='tsv')return csvRows(text.replace(/^\uFEFF/,''),format==='tsv'?'\t':detectCsvDelimiter(text));
  if(format==='json')return parseJson(text);
  if(format==='xml')return parseXml(text);
  throw Error('Dieses Eingabeformat ist nicht freigegeben.');
}
function toCsv(rows,delimiter){
  if(!rows.length)return '';
  const headers=[...new Set(rows.flatMap(row=>Object.keys(row)))];
  const cell=value=>{if(value&&typeof value==='object')value=JSON.stringify(value);const text=String(value??'');return /["\r\n]/.test(text)||text.includes(delimiter)?`"${text.replaceAll('"','""')}"`:text;};
  return [headers,...rows.map(row=>headers.map(header=>row[header]??''))].map(values=>values.map(cell).join(delimiter)).join('\n');
}
function toXml(rows){
  const value=(name,content)=>{
    const tag=xmlName(name);
    if(content&&typeof content==='object'){
      if(Array.isArray(content))return content.map(item=>value(name,item)).join('');
      return `<${tag}>${Object.entries(content).map(([key,item])=>value(key,item)).join('')}</${tag}>`;
    }
    return `<${tag}>${xmlEscape(content)}</${tag}>`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rows>${rows.map(row=>`<row>${Object.entries(row).map(([key,item])=>value(key,item)).join('')}</row>`).join('')}</rows>`;
}
export function convertData(text,from,to){
  const rows=parseData(text,from);
  if(!rows.length)throw Error('Die Datei enthält keine Datensätze.');
  if(to==='json')return JSON.stringify(rows,null,2);
  if(to==='csv'||to==='tsv')return toCsv(rows,to==='tsv'?'\t':',');
  if(to==='xml')return toXml(rows);
  throw Error('Dieses Zielformat ist nicht freigegeben.');
}
export function formatLabel(format){return labels[format]||format.toUpperCase();}
