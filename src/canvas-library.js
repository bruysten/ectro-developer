// A late catalog response must not undo a newer delete, restore or creation.
export function createCanvasLibrary(){
 let rows=[],revision=0,request=0;
 const sort=()=>rows.sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at))||a.id.localeCompare(b.id));
 return {get rows(){return rows;},invalidate(){revision++;},begin(){return {revision,request:++request};},accept(token,incoming){if(token.revision!==revision||token.request!==request)return false;const known=new Map(rows.map(c=>[c.id,c]));rows=incoming.map(c=>known.get(c.id)?.version>c.version?known.get(c.id):c);sort();return true;},observe(c){revision++;const i=rows.findIndex(r=>r.id===c.id);if(i<0)rows.push(c);else if(c.version>=rows[i].version)rows[i]=c;sort();},forget(id){revision++;rows=rows.filter(c=>c.id!==id);}};
}
export function canvasLibraryItems(rows,{filter='',query='',models={}}={}){
 const term=query.trim().toLocaleLowerCase('de');return rows.filter(c=>{
  if(filter==='trash'?!c.deleted_at:!!c.deleted_at)return false;
  if(filter!=='trash'&&(filter==='archived'?!c.archived:!!c.archived))return false;
  if(filter==='private'&&c.group_id||filter==='shared'&&!c.group_id)return false;
  return !term||(c.name+' '+(models[c.kind]?.title||c.kind)+' '+(c.group_name||'')).toLocaleLowerCase('de').includes(term);
 });
}
