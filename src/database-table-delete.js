// Capture the exact destination before opening the destructive action dialog.
export async function removeDatabaseTable({table,connection,workspace,isCurrent,modal,api,onDeleted,esc,ui=s=>s}){
 const target={host:connection.host,db_name:connection.db_name,username:connection.username};
 return modal('Tabelle entfernen',ui(`<div class="notice">Die Tabelle <strong>${esc(table)}</strong> und alle ihre Datensätze werden dauerhaft gelöscht. Das lässt sich hier nicht rückgängig machen.</div><dl class="database-delete-target"><div><dt>Datenbank</dt><dd>${esc(target.db_name)} · ${esc(target.host)}</dd></div><div><dt>Arbeitsbereich</dt><dd>${esc(workspace)}</dd></div></dl><label class="field"><span>Zur Bestätigung den Tabellennamen eingeben</span><code>${esc(table)}</code><input name="confirmation" autocomplete="off" spellcheck="false" required maxlength="64" aria-label="Tabellenname bestätigen"></label>`),async data=>{
  if(!isCurrent())throw Error('Die Auswahl oder Verbindung wurde geändert. Bitte den Löschdialog erneut öffnen.');
  if(data.get('confirmation')!==table)throw Error('Der Tabellenname stimmt nicht überein.');
  await api('db.table.delete',{table,confirmation:table,connection:target});
  if(isCurrent())await onDeleted();
 },'Tabelle endgültig löschen',{className:'database-table-delete-dialog',freezeOnSubmit:true,after:dialog=>{
  const input=dialog.querySelector('[name="confirmation"]'),submit=dialog.querySelector('[data-action="submit-modal"]');
  submit.disabled=true;input.oninput=()=>{submit.disabled=input.value!==table;};input.focus();
 }});
}
