import {escapeHtml as e} from './studio-charts.js';
import {combineTables,normalizeTable,tableAliases} from './studio-source-tables.js';

export async function selectDatabaseSource(ctx,{databases,initial=null,onApply}){
 const tables=[],errors=[];
 for(const db of databases){try{const result=await ctx.api('studio.tables',{project:ctx.project,kind:ctx.kind,scope:db.scope});if(!ctx.alive())return;tables.push(...result.tables.map(table=>({id:db.scope+':'+table,table,scope:db.scope,label:table,name:table+' · '+db.name})));}catch(error){errors.push(db.name+': '+error.message);}}
 if(!ctx.alive())return;if(!tables.length&&errors.length)throw Error(errors.join(' · '));
 await selectSourceTables(ctx,{title:'Datenbanktabellen auswählen',tables,initial,notice:errors.join(' · '),
  read:table=>ctx.api('studio.source',{project:ctx.project,kind:ctx.kind,source:{type:'mysql',table:table.table,scope:table.scope}}),
  onApply:async({spec,selected})=>{
   const refs=selected.map(({table,scope,alias})=>({table,scope,alias}));
   const source=refs.length===1?{type:'mysql',table:refs[0].table,scope:refs[0].scope}:{type:'combined',...spec,tables:refs};
   const data=await ctx.api('studio.source',{project:ctx.project,kind:ctx.kind,source});if(ctx.alive())await onApply(source,data);
  }});
}
// JSON lists and database tables share the same selection, relationship and preview UI.
export async function selectSourceTables(ctx,{title,tables,read,onApply,initial=null,notice=''}){
 if(!tables.length)throw Error('Diese Datenbank enthält keine auswählbaren Tabellen.');
 const limit=Math.min(1000,ctx.limits?.rows||1000),cache=new Map();
 let node,alive=true,sequence=0,candidate=null,selected=[],rules=new Map();
 const live=()=>alive&&ctx.alive(),$=q=>node.querySelector(q);
 const initialTables=initial?.tables||[],findInitial=t=>initialTables.find(x=>x.table===t.table&&x.scope===t.scope);
 const occupied=new Set(initialTables.map(t=>t.alias).filter(Boolean));
 const aliases=tableAliases(tables).map((alias,i)=>{const old=findInitial(tables[i])?.alias;if(old)return old;const stem=alias;let n=1;while(occupied.has(alias))alias=stem+'_'+ ++n;occupied.add(alias);return alias;});
 const baseIndex=Math.max(0,tables.findIndex(t=>findInitial(t)===initialTables[0]&&initialTables.length));
 const options=(columns,value)=>'<option value="">Bitte wählen …</option>'+columns.map(c=>`<option value="${e(c.name)}" ${c.name===value?'selected':''}>${e(c.name)}</option>`).join('');
 function sourceSelection(){const base=Number($('[name="base"]').value),checked=Array.from(node.querySelectorAll('[data-table-select]:checked')).map(el=>Number(el.value));return [base,...selected.filter(i=>i!==base&&checked.includes(i)),...checked.filter(i=>i!==base&&!selected.includes(i))];}
 function related(){const base=Number($('[name="base"]').value);$('[data-related]').innerHTML=tables.map((t,i)=>i===base?'':`<label class="lab-check"><input type="checkbox" data-table-select value="${i}" ${selected.includes(i)?'checked':''}>${e(t.name)}</label>`).join('');node.querySelectorAll('[data-table-select]').forEach(el=>el.onchange=()=>refresh());}
 function captureRules(){node.querySelectorAll('[data-join-index]').forEach(el=>{const id=Number(el.dataset.joinIndex);rules.set(id,{left:el.querySelector('[data-key="left"]').value,right:el.querySelector('[data-key="right"]').value,how:el.querySelector('[data-key="how"]').value});});}
 function recipe(){const mode=$('[name="mode"]').value;return {mode,joins:mode==='join'?selected.slice(1).map(i=>rules.get(i)||{left:'',right:'',how:'left'}):[]};}
 function preview(){
  captureRules();candidate=null;$('[data-action="submit-modal"]').disabled=true;$('[data-preview]').innerHTML='';
  try{
   const spec=recipe(),data=combineTables(selected.map(i=>({...cache.get(i),alias:aliases[i]})),spec,limit);
   const missing=data.unmatched.map(v=>`${v.table}: ${v.count} Zeilen ohne Treffer`).join(' · ');
   $('[data-status]').textContent=`${data.rows.length} Ergebniszeilen · ${data.columns.length} Spalten${missing?' · '+missing:''}${data.expanded?' · '+data.expanded+' zusätzliche Zeilen durch Mehrfachtreffer. Summen können sich vervielfachen.':''}`;
   $('[data-status]').classList.toggle('is-warning',!!data.expanded||data.unmatched.some(v=>v.count));
   const truncated=selected.some(i=>cache.get(i).truncated);
   $('[data-truncated]').hidden=!truncated;
   $('[data-preview]').innerHTML=`<div class="table-wrap"><table><caption>Vorschau · erste 5 Zeilen</caption><thead><tr>${data.columns.map(c=>`<th>${e(c.name)}</th>`).join('')}</tr></thead><tbody>${data.rows.slice(0,5).map(r=>`<tr>${data.columns.map(c=>`<td>${r[c.name]===null?'∅':e(String(r[c.name]).slice(0,120))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${data.sourceColumn?`<p class="lab-hint">Gleichnamige Spalten werden zusammengeführt. „${e(data.sourceColumn)}“ kennzeichnet die Herkunft für Kategorien oder Datenreihen.</p>`:''}`;
   candidate={data,spec,selected:selected.map(i=>({...tables[i],alias:aliases[i]}))};$('[data-action="submit-modal"]').disabled=false;
  }catch(error){$('[data-status]').textContent=error.message;$('[data-status]').classList.add('is-warning');}
 }
 async function refresh(){
  const seq=++sequence;captureRules();candidate=null;selected=sourceSelection();$('[data-action="submit-modal"]').disabled=true;$('[data-joins]').innerHTML='';$('[data-preview]').innerHTML='';$('[data-truncated]').hidden=true;
  if(selected.length>6){$('[data-status]').textContent='Bitte höchstens sechs Listen oder Tabellen auswählen.';return;}
  $('[data-status]').textContent='Auswahl wird gelesen …';
  try{
   for(const i of selected)if(!cache.has(i)){const data=await read(tables[i]);if(!live()||seq!==sequence)return;cache.set(i,{...data,...normalizeTable(data.rows,limit,data.columns)});}
   if(!live()||seq!==sequence)return;
   const mode=$('[name="mode"]').value;let previous=cache.get(selected[0]).columns.map(c=>({name:aliases[selected[0]]+'.'+c.name}));
   if(mode==='join')$('[data-joins]').innerHTML=selected.slice(1).map((id,j)=>{
    const right=cache.get(id).columns,old=rules.get(id)||initial?.joins?.[j];
    const match=right.find(c=>/_id$/i.test(c.name)&&previous.some(p=>p.name.endsWith('.'+c.name)));
    const rule={left:old?.left||previous.find(p=>match&&p.name.endsWith('.'+match.name))?.name||'',right:old?.right||match?.name||'',how:old?.how||'left'};rules.set(id,rule);
    const html=`<fieldset data-join-index="${id}"><legend>Beziehung zu ${e(tables[id].name)}</legend><div class="form-grid"><label class="field"><span>Schlüssel in bisherigen Daten</span><select data-key="left">${options(previous,rule.left)}</select></label><label class="field"><span>Schlüssel in ${e(aliases[id])}</span><select data-key="right">${options(right,rule.right)}</select></label><label class="field"><span>Verknüpfungsart</span><select data-key="how"><option value="left" ${rule.how==='left'?'selected':''}>Alle bisherigen Zeilen behalten</option><option value="inner" ${rule.how==='inner'?'selected':''}>Nur passende Zeilen behalten</option></select></label></div></fieldset>`;
    previous=[...previous,...right.map(c=>({name:aliases[id]+'.'+c.name}))];return html;
   }).join('');
   node.querySelectorAll('[data-join-index] select').forEach(el=>el.onchange=preview);preview();
  }catch(error){if(live()&&seq===sequence){$('[data-status]').textContent=error.message;$('[data-status]').classList.add('is-warning');}}
 }
 try{await ctx.modal(title,`${notice?`<p class="notice">${e(notice)}</p>`:''}<p class="lab-hint">Eine Liste oder Tabelle als Ausgangspunkt wählen. Weitere können über Schlüsselspalten verknüpft oder zum Vergleich untereinander angeordnet werden. Bis zu ${limit} Ergebniszeilen und 50 Spalten.</p><label class="field"><span>Ausgangsliste / Tabelle</span><select name="base">${tables.map((t,i)=>`<option value="${i}" ${i===baseIndex?'selected':''}>${e(t.name)}${t.rows?' · '+t.rows.length+' Zeilen':''}</option>`).join('')}</select></label><details ${initialTables.length>1?'open':''}><summary>Weitere Listen / Tabellen einbeziehen</summary><div data-related class="source-table-list"></div></details><label class="field"><span>Mehrere Listen / Tabellen verwenden</span><select name="mode"><option value="join">Über Schlüsselspalten verknüpfen</option><option value="append" ${initial?.mode==='append'?'selected':''}>Zum Vergleich untereinanderstellen</option></select></label><p class="lab-hint">Die Reihenfolge der weiteren Tabellen folgt ihrer Auswahl. Schlüssel müssen denselben Datentyp haben. Leere Schlüssel werden nicht verknüpft. Mehrfachtreffer erzeugen mehrere Ergebniszeilen.</p><div data-joins></div><p data-status role="status" class="lab-hint"></p><p data-truncated hidden class="notice">Mindestens eine Tabelle ist ein begrenzter Ausschnitt. Vergleiche und Beziehungen können dadurch unvollständig sein; fehlende Treffer sind nicht abschließend.</p><div data-preview></div>`,async()=>{
  if(!live()||!candidate)throw Error('Zuerst eine gültige Auswahl laden.');await onApply(candidate);
 },'Auswahl übernehmen',{className:'studio-form-dialog source-tables-dialog',freezeOnSubmit:true,after:dialog=>{
  node=dialog;selected=initialTables.map(t=>tables.findIndex(x=>findInitial(x)===t)).filter(i=>i>=0);related();$('[name="base"]').onchange=()=>{captureRules();selected=sourceSelection();rules.clear();related();refresh();};$('[name="mode"]').onchange=()=>refresh();refresh();
 }});}finally{alive=false;++sequence;}
}
