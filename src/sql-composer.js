export const OPERATIONS={insert:['INSERT','Datensätze anlegen'],select:['SELECT','Daten auswählen'],update:['UPDATE','Werte ändern'],delete:['DELETE','Datensätze löschen']};
export const generated=c=>/(?:VIRTUAL|STORED) GENERATED|GENERATED ALWAYS/i.test(c.Extra||'');
export const auto=c=>/auto_increment/i.test(c.Extra||'');
export const numeric=c=>/INT|DECIMAL|NUMERIC|REAL|FLOAT|DOUBLE|BOOLEAN/i.test(c.Type);
export function previewQuery(model,columns,mode='practice'){
  const meta=new Map(columns.map(c=>[c.Field,c])),issues=[],id=name=>'`'+String(name).replaceAll('`','``')+'`';
  const literal=(value,column)=>{if(value===null)return 'NULL';if(numeric(meta.get(column)||{})&&/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(value)))return String(value);let text=String(value??'');if(mode==='mysql')text=text.replaceAll('\\','\\\\');return "'"+text.replaceAll("'","''")+"'";};
  const checkValue=(column,value)=>{const c=meta.get(column);if(!c){issues.push('Unbekannte Spalte.');return;}if(value===null){if(c.Null!=='YES')issues.push(`${column} darf nicht NULL sein.`);return;}if(String(value??'')==='')issues.push(`Bitte einen Wert für ${column} eingeben.`);else if(numeric(c)&&!new RegExp(/INT|BOOLEAN/i.test(c.Type)?'^-?\\d+$':'^-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)$').test(String(value)))issues.push(`${column} benötigt eine gültige Zahl.`);};
  if(!model.table)issues.push('Bitte eine Tabelle wählen.');
  if(!Number.isInteger(model.limit)||model.limit<1||model.limit>100)issues.push('Das Limit muss zwischen 1 und 100 liegen.');
  const clauses=(model.conditions||[]).map(c=>{if(!meta.has(c.column))issues.push('Bitte eine Filterspalte wählen.');if(!['IS NULL','IS NOT NULL'].includes(c.operator))checkValue(c.column,c.value);return id(c.column)+' '+c.operator+(['IS NULL','IS NOT NULL'].includes(c.operator)?'':' '+literal(c.value,c.column));});
  const where=clauses.length?'\nWHERE '+clauses.join('\n  '+(model.join==='or'?'OR':'AND')+' '):'';
  let sql='';
  if(model.action==='insert'){
    const names=Object.keys(model.values||{}),rows=model.rows||[model.values];if(!names.length)issues.push('Mindestens eine Spalte hinzufügen.');
    for(const c of columns)if(c.Null==='NO'&&c.Default===null&&!auto(c)&&!generated(c)&&!names.includes(c.Field))issues.push(`Pflichtspalte ${c.Field} hinzufügen.`);
    for(const row of rows)for(const name of names)checkValue(name,row[name]);
    sql='INSERT INTO '+id(model.table)+' ('+names.map(id).join(', ')+')\nVALUES\n  '+rows.map(row=>'('+names.map(name=>literal(row[name],name)).join(', ')+')').join(',\n  ')+';';
  }else if(model.action==='select'){
    sql='SELECT '+(model.distinct?'DISTINCT ':'')+(model.columns.length?model.columns.map(id).join(', '):'*')+'\nFROM '+id(model.table)+where;
    if(model.order.length)sql+='\nORDER BY '+model.order.map(o=>id(o.column)+' '+o.direction).join(', ');sql+='\nLIMIT '+model.limit+';';
  }else{
    if(!clauses.length)issues.push('Bitte eine Bedingung hinzufügen oder einen Datensatz unten auswählen.');
    if(model.action==='update'){
      const names=Object.keys(model.values);if(!names.length)issues.push('Mindestens eine Spalte zum Ändern hinzufügen.');for(const name of names)checkValue(name,model.values[name]);sql='UPDATE '+id(model.table)+'\nSET '+names.map(name=>id(name)+' = '+literal(model.values[name],name)).join(',\n    ');
    }else sql='DELETE FROM '+id(model.table);
    sql+=where+'\nLIMIT '+model.limit+';';
  }
  return {sql,ready:issues.length===0,issues:[...new Set(issues)]};
}
