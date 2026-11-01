import {OPERATIONS,generated,auto,numeric,previewQuery} from './sql-composer.js';
export async function mountSqlTraining(root,{api,get,esc,icon,toast,confirm,isCurrent}){
  const $=q=>root.querySelector(q),$$=q=>[...root.querySelectorAll(q)];
  const entryParams=new URLSearchParams(location.hash.split('?')[1]||'');
  let mode=entryParams.get('mode')==='mysql'?'mysql':'practice',tables=[],columns=[],tableRows=[],action='insert',fields=[],entries=[{}],selected=[],conditions=[],order=[],join='and',limit=20,distinct=false,previewTimer=null,previewSequence=0,loadSequence=0,disposed=false,running=false;
  const current=()=>!disposed&&isCurrent()&&root.isConnected;
  const note=$('#training-note'),status=$('#training-status');
  let drag=null,suppressClick=false;
  const endDrag=()=>{if(!drag)return;drag.button.classList.remove('dragging');if(drag.button.hasPointerCapture(drag.pointerId))drag.button.releasePointerCapture(drag.pointerId);$$('[data-drop-zone]').forEach(z=>z.classList.remove('drop-active'));drag=null;};
  const pointerDown=e=>{suppressClick=false;const button=e.target.closest('[data-add-column]');if(!button||button.disabled||running||e.button!==0||e.pointerType==='touch')return;drag={button,name:button.dataset.addColumn,x:e.clientX,y:e.clientY,pointerId:e.pointerId,active:false};button.setPointerCapture(e.pointerId);};
  const pointerMove=e=>{if(!drag||e.pointerId!==drag.pointerId)return;if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;drag.active=true;drag.button.classList.add('dragging');const zone=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop-zone]');$$('[data-drop-zone]').forEach(z=>z.classList.toggle('drop-active',z===zone));};
  const pointerUp=e=>{if(!drag||e.pointerId!==drag.pointerId)return;const {active,name}=drag;const zone=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop-zone]');endDrag();if(!active)return;suppressClick=true;e.preventDefault();if(zone&&root.contains(zone))zone.dataset.dropZone==='conditions'?addCondition(name):addField(name);};
  const cancelDrag=()=>endDrag();
  const suppressDragClick=e=>{if(!suppressClick)return;suppressClick=false;e.preventDefault();e.stopPropagation();};
  const escapeDrag=e=>{if(e.key==='Escape')endDrag();};
  root.addEventListener('pointerdown',pointerDown);root.addEventListener('pointermove',pointerMove);root.addEventListener('pointerup',pointerUp);root.addEventListener('pointercancel',cancelDrag);root.addEventListener('click',suppressDragClick,true);root.addEventListener('keydown',escapeDrag);

  const defaultValue=c=>c.Default!==null&&c.Default!==undefined&&!/CURRENT_|GENERATED/i.test(String(c.Default))?String(c.Default).replace(/^'(.*)'$/,'$1').replaceAll("''","'"):'';
  const valueOf=(entry,name)=>entry[name]?.null?null:entry[name]?.value??'';
  const model=()=>({action,table:$('#training-table').value,columns:selected,conditions:conditions.map(c=>({...c})),order:order.map(o=>({...o})),join,limit,distinct,values:Object.fromEntries(fields.map(name=>[name,valueOf(entries[0],name)])),...(action==='insert'?{rows:entries.map(e=>Object.fromEntries(fields.map(name=>[name,valueOf(e,name)])))}:{})});
  const typeInput=c=>numeric(c)?'number':/^date$/i.test(c.Type)?'date':/^datetime/i.test(c.Type)?'datetime-local':'text';
  const removeButton=(label,attrs)=>`<button type="button" class="icon-btn" aria-label="${esc(label)}" ${attrs}>${icon('close')}</button>`;
  const tableHTML=(rows,pick=false,names=columns.map(c=>c.Field))=>`<div class="table-wrap"><table><thead><tr>${names.map(n=>`<th>${esc(n)}</th>`).join('')}${pick?'<th>Auswahl</th>':''}</tr></thead><tbody>${rows.map((row,i)=>`<tr>${names.map(n=>`<td>${row[n]===null?'<span class="muted">NULL</span>':esc(row[n])}</td>`).join('')}${pick?`<td><button type="button" class="link" data-pick-row="${i}">Als Filter ${icon('arrow_upward')}</button></td>`:''}</tr>`).join('')||`<tr><td colspan="${Math.max(1,names.length+(pick?1:0))}" class="muted">Keine Datensätze.</td></tr>`}</tbody></table></div>`;
  const renderData=()=>{
    $('#training-data').innerHTML=tableHTML(tableRows,action!=='insert');
    $$('[data-pick-row]').forEach(button=>button.onclick=()=>{const row=tableRows[Number(button.dataset.pickRow)],keys=columns.filter(c=>c.Key==='PRI');const matching=keys.length?keys:columns.slice(0,10);conditions=matching.map(c=>({column:c.Field,operator:row[c.Field]===null?'IS NULL':'=',value:String(row[c.Field]??'')}));if(action==='update')for(const name of fields)entries[0][name]={value:String(row[name]??''),null:row[name]===null};renderBuilder();});
  };
  const addField=name=>{
    const c=columns.find(c=>c.Field===name);if(!c||running)return;
    if(action==='delete'){addCondition(name);return;}
    if(action==='select'){if(!selected.includes(name))selected.push(name);}else{if(generated(c)||fields.includes(name))return;fields.push(name);for(const entry of entries)entry[name]={value:defaultValue(c),null:false};}
    renderBuilder();
  };
  const addCondition=name=>{if(conditions.length>=10||running)return;conditions.push({column:name||columns.find(c=>c.Key==='PRI')?.Field||columns[0].Field,operator:'=',value:''});renderBuilder();};
  const wireDrop=()=>$$('[data-drop-zone]').forEach(zone=>{
    zone.ondragover=e=>{if(running)return;e.preventDefault();zone.classList.add('drop-active');};zone.ondragleave=()=>zone.classList.remove('drop-active');
    zone.ondrop=e=>{e.preventDefault();zone.classList.remove('drop-active');const name=e.dataTransfer.getData('text/x-ectro-column');if(!columns.some(c=>c.Field===name)||running)return;zone.dataset.dropZone==='conditions'?addCondition(name):addField(name);};
  });
  const renderPalette=()=>{
    $('#training-columns').innerHTML=columns.map(c=>`<button type="button" class="training-column ${fields.includes(c.Field)||selected.includes(c.Field)?'selected':''}" draggable="false" data-add-column="${esc(c.Field)}" aria-label="${esc(c.Field)} hinzufügen" ${running||(['insert','update'].includes(action)&&generated(c))?'disabled':''}><span>${icon(c.Key==='PRI'?'key':'drag_indicator')}<strong>${esc(c.Field)}</strong></span><small>${esc(c.Type)}${auto(c)?' · automatisch':''}</small></button>`).join('');
    $$('[data-add-column]').forEach(button=>{button.onclick=()=>addField(button.dataset.addColumn);});
    $('#training-column-search').oninput=e=>$$('[data-add-column]').forEach(button=>button.hidden=!button.textContent.toLowerCase().includes(e.target.value.toLowerCase()));
  };
  const updatePreview=()=>{
    if(!current()||!columns.length)return;
    const m=model(),view=previewQuery(m,columns,mode);$('#training-sql').textContent=view.sql;$('#training-run').disabled=!view.ready||running;$('#training-guidance').textContent=view.ready?'Abfrage bereit. Ausführen oder weiter verfeinern.':view.issues[0];$('#training-guidance').classList.toggle('ready',view.ready);
    clearTimeout(previewTimer);const sequence=++previewSequence;
    $('#training-preview').setAttribute('aria-busy','false');
    if(action==='insert'){ $('#training-preview').innerHTML='<p class="muted">Die neuen Datensätze erscheinen nach „Ausführen“ in der Tabelle.</p>';return;}
    if(!view.ready){$('#training-preview').innerHTML='<p class="muted">Sobald die Abfrage vollständig ist, sehen Sie hier ihre Auswahl.</p>';return;}
    $('#training-preview').setAttribute('aria-busy','true');
    previewTimer=setTimeout(async()=>{
      try{const previewModel=['update','delete'].includes(action)?{...m,columns:[],distinct:false,order:[]}:m;const data=await api('training.preview',{mode,model:previewModel});if(!current()||sequence!==previewSequence)return;$('#training-preview').innerHTML=`<div class="training-match-count">${data.rows.length} passende Datensätze · maximal ${m.limit}</div>`+tableHTML(data.rows,false,data.rows.length?Object.keys(data.rows[0]):m.action==='select'&&m.columns.length?m.columns:columns.map(c=>c.Field));}
      catch(e){if(current()&&sequence===previewSequence)$('#training-preview').textContent=e.message;}
      finally{if(current()&&sequence===previewSequence)$('#training-preview').setAttribute('aria-busy','false');}
    },400);
  };
  const renderValues=()=>{
    if(action==='select')return `<div class="training-drop" data-drop-zone="fields"><div class="training-section-title"><strong>Spalten auswählen</strong><button type="button" class="link" id="training-all">Alle Spalten</button></div>${selected.length?`<div class="training-selected">${selected.map((name,i)=>`<span>${esc(name)}<button type="button" class="icon-btn" data-move-column="${i}" aria-label="${esc(name)} nach links" ${i===0?'disabled':''}>${icon('chevron_left')}</button>${removeButton(name+' entfernen',`data-remove-selected="${i}"`)}</span>`).join('')}</div>`:'<p class="muted">Alle Spalten (*) · Ziehe eine Spalte hierher, um gezielt auszuwählen.</p>'}<label class="training-check"><input id="training-distinct" type="checkbox" ${distinct?'checked':''}> Doppelte Ergebnisse ausblenden (DISTINCT)</label></div>`;
    if(action==='delete')return '';
    return `<div class="training-drop" data-drop-zone="fields"><div class="training-section-title"><strong>${action==='insert'?'Spalten & Werte':'Welche Werte ändern?'}</strong><small>Spalten hierher ziehen oder links anklicken</small></div>${entries.map((entry,row)=>`<section class="training-entry">${action==='insert'?`<div class="training-section-title"><span class="meta">DATENSATZ ${row+1}</span>${entries.length>1?removeButton('Datensatz '+(row+1)+' entfernen',`data-remove-entry="${row}"`):''}</div>`:''}<div class="training-values">${fields.map(name=>{const c=columns.find(c=>c.Field===name),item=entry[name]||{value:'',null:false};return `<div class="training-value"><div class="training-section-title"><label for="training-value-${row}-${fields.indexOf(name)}">${esc(name)}</label>${row===0?removeButton(name+' entfernen',`data-remove-field="${esc(name)}"`):''}</div><input id="training-value-${row}-${fields.indexOf(name)}" type="${typeInput(c)}" step="any" value="${esc(item.value)}" maxlength="10000" data-value-row="${row}" data-value-column="${esc(name)}" aria-label="${esc(name)} · Datensatz ${row+1}" ${item.null?'disabled':''}>${c.Null==='YES'?`<label class="training-null"><input type="checkbox" data-null-row="${row}" data-null-column="${esc(name)}" ${item.null?'checked':''}> NULL · kein Wert</label>`:''}</div>`;}).join('')||'<p class="muted">Ziehe eine Spalte hierher, um einen Wert einzugeben.</p>'}</div></section>`).join('')}${action==='insert'?`<button type="button" class="es-btn es-btn--sm es-btn--secondary" id="training-add-entry" ${entries.length>=10?'disabled':''}>${icon('add')}Weiterer Datensatz</button>`:''}</div>`;
  };
  const renderConditions=()=>action==='insert'?'':`<div class="training-drop" data-drop-zone="conditions"><div class="training-section-title"><strong>${action==='select'?'Welche Daten?':'Welche Datensätze?'} <span class="meta">WHERE</span></strong><button type="button" class="link" id="training-add-condition" ${conditions.length>=10?'disabled':''}>${icon('add')}Bedingung</button></div>${conditions.map((c,i)=>`<div class="training-condition"><select data-condition-column="${i}" aria-label="Filterspalte ${i+1}">${columns.map(col=>`<option ${col.Field===c.column?'selected':''}>${esc(col.Field)}</option>`).join('')}</select><select data-condition-operator="${i}" aria-label="Vergleich ${i+1}">${[['=','ist gleich'],['!=','ist nicht gleich'],['>','größer als'],['>=','größer oder gleich'],['<','kleiner als'],['<=','kleiner oder gleich'],...(/CHAR|TEXT/i.test(columns.find(col=>col.Field===c.column)?.Type||'')?[['LIKE','Textmuster (LIKE)']]:[]),['IS NULL','ist NULL'],['IS NOT NULL','ist nicht NULL']].map(([value,label])=>`<option value="${value}" ${c.operator===value?'selected':''}>${label}</option>`).join('')}</select>${['IS NULL','IS NOT NULL'].includes(c.operator)?'<span class="muted">Kein Wert nötig</span>':`<input data-condition-value="${i}" value="${esc(c.value)}" aria-label="Filterwert ${i+1}" placeholder="${c.operator==='LIKE'?'z. B. Ber%':'Wert'}" maxlength="10000">`}${removeButton('Bedingung '+(i+1)+' entfernen',`data-remove-condition="${i}"`)}</div>`).join('')||`<p class="muted">${action==='select'?'Ohne Bedingung werden alle Datensätze ausgewählt.':'Wähle unten einen Datensatz als Filter oder ziehe eine Spalte hierher.'}</p>`}${conditions.length>1?`<label class="field training-join"><span>Bedingungen verbinden</span><select id="training-join"><option value="and" ${join==='and'?'selected':''}>Alle müssen stimmen (AND)</option><option value="or" ${join==='or'?'selected':''}>Mindestens eine muss stimmen (OR)</option></select></label>`:''}</div>`;
  const renderOrder=()=>action!=='select'?'':`<div class="training-drop"><div class="training-section-title"><strong>Reihenfolge <span class="meta">ORDER BY</span></strong><button type="button" class="link" id="training-add-order" ${order.length>=5?'disabled':''}>${icon('add')}Sortierung</button></div>${order.map((o,i)=>`<div class="training-order"><select data-order-column="${i}" aria-label="Sortierspalte ${i+1}">${columns.map(c=>`<option ${c.Field===o.column?'selected':''}>${esc(c.Field)}</option>`).join('')}</select><select data-order-direction="${i}" aria-label="Sortierrichtung ${i+1}"><option value="ASC" ${o.direction==='ASC'?'selected':''}>Aufsteigend (ASC)</option><option value="DESC" ${o.direction==='DESC'?'selected':''}>Absteigend (DESC)</option></select>${removeButton('Sortierung entfernen',`data-remove-order="${i}"`)}</div>`).join('')||'<p class="muted">Optional · z. B. Preise aufsteigend sortieren.</p>'}</div>`;
  function renderBuilder(){
    if(!current())return;
    $('#training-builder').innerHTML=renderValues()+renderConditions()+renderOrder()+(action!=='insert'?`<label class="field training-limit"><span>Maximal ${action==='select'?'anzeigen':action==='delete'?'löschen':'ändern'} <span class="meta">LIMIT</span></span><input id="training-limit" type="number" value="${limit}" min="1" max="100" step="1"></label>`:'');
    renderPalette();wireDrop();renderData();
    $$('[data-value-column]').forEach(input=>input.oninput=()=>{entries[Number(input.dataset.valueRow)][input.dataset.valueColumn].value=input.value;updatePreview();});
    $$('[data-null-column]').forEach(input=>input.onchange=()=>{const row=Number(input.dataset.nullRow),name=input.dataset.nullColumn;entries[row][name].null=input.checked;const valueInput=$$('[data-value-column]').find(el=>Number(el.dataset.valueRow)===row&&el.dataset.valueColumn===name);valueInput.disabled=input.checked;updatePreview();});
    $$('[data-remove-field]').forEach(button=>button.onclick=()=>{fields=fields.filter(n=>n!==button.dataset.removeField);for(const entry of entries)delete entry[button.dataset.removeField];renderBuilder();});
    $$('[data-remove-entry]').forEach(button=>button.onclick=()=>{entries.splice(Number(button.dataset.removeEntry),1);renderBuilder();});
    $('#training-add-entry')?.addEventListener('click',()=>{if(entries.length<10)entries.push(Object.fromEntries(fields.map(name=>[name,{value:defaultValue(columns.find(c=>c.Field===name)),null:false}])));renderBuilder();});
    $('#training-all')?.addEventListener('click',()=>{selected=[];renderBuilder();});$('#training-distinct')?.addEventListener('change',e=>{distinct=e.target.checked;updatePreview();});
    $$('[data-remove-selected]').forEach(button=>button.onclick=()=>{selected.splice(Number(button.dataset.removeSelected),1);renderBuilder();});$$('[data-move-column]').forEach(button=>button.onclick=()=>{const i=Number(button.dataset.moveColumn);[selected[i-1],selected[i]]=[selected[i],selected[i-1]];renderBuilder();});
    $('#training-add-condition')?.addEventListener('click',()=>addCondition());
    $$('[data-condition-column]').forEach(input=>input.onchange=()=>{const c=conditions[Number(input.dataset.conditionColumn)];c.column=input.value;c.operator='=';c.value='';renderBuilder();});
    $$('[data-condition-operator]').forEach(input=>input.onchange=()=>{conditions[Number(input.dataset.conditionOperator)].operator=input.value;renderBuilder();});
    $$('[data-condition-value]').forEach(input=>input.oninput=()=>{conditions[Number(input.dataset.conditionValue)].value=input.value;updatePreview();});
    $$('[data-remove-condition]').forEach(button=>button.onclick=()=>{conditions.splice(Number(button.dataset.removeCondition),1);renderBuilder();});$('#training-join')?.addEventListener('change',e=>{join=e.target.value;updatePreview();});
    $('#training-add-order')?.addEventListener('click',()=>{if(order.length<5)order.push({column:columns[0].Field,direction:'ASC'});renderBuilder();});
    $$('[data-order-column]').forEach(input=>input.onchange=()=>{order[Number(input.dataset.orderColumn)].column=input.value;updatePreview();});$$('[data-order-direction]').forEach(input=>input.onchange=()=>{order[Number(input.dataset.orderDirection)].direction=input.value;updatePreview();});$$('[data-remove-order]').forEach(button=>button.onclick=()=>{order.splice(Number(button.dataset.removeOrder),1);renderBuilder();});
    $('#training-limit')?.addEventListener('input',e=>{limit=Number(e.target.value);updatePreview();});
    $('#training-result').innerHTML='';status.textContent='';updatePreview();
  }
  const resetDraft=()=>{
    fields=[];entries=[{}];selected=[];conditions=[];order=[];join='and';limit=20;distinct=false;
    if(['insert','update'].includes(action)){
      const writable=columns.filter(c=>!generated(c)&&!auto(c));const initial=action==='insert'?writable.filter(c=>c.Null==='NO'&&c.Default===null):[];fields=(initial.length?initial:writable.slice(0,1)).map(c=>c.Field);for(const name of fields)entries[0][name]={value:defaultValue(columns.find(c=>c.Field===name)),null:false};
    }

    renderBuilder();
  };
  const loadTable=async()=>{
    const sequence=++loadSequence;clearTimeout(previewTimer);++previewSequence;columns=[];$('#training-run').disabled=true;status.textContent='Tabelle wird geladen …';
    try{const data=await get('training.table',{mode,table:$('#training-table').value});if(!current()||sequence!==loadSequence)return;columns=data.columns;tableRows=data.rows;status.textContent='';resetDraft();}catch(e){if(current()&&sequence===loadSequence)status.textContent=e.message;}
  };
  const loadMode=async()=>{
    const sequence=++loadSequence;clearTimeout(previewTimer);++previewSequence;columns=[];$('#training-run').disabled=true;status.textContent='Arbeitsbereich wird geladen …';
    try{const info=await get('training.info',{mode});if(!current()||sequence!==loadSequence)return;tables=info.tables;$('#training-mode').innerHTML='<option value="practice" '+(mode==='practice'?'selected':'')+'>Übungsdaten · nur für mich</option>'+(info.has_connection?'<option value="mysql" '+(mode==='mysql'?'selected':'')+'>Eigene Datenbank</option>':'');$('#training-table').innerHTML=tables.map(t=>`<option>${esc(t)}</option>`).join('');if(tables.includes(entryParams.get('table'))){$('#training-table').value=entryParams.get('table');entryParams.delete('table');}$('#training-reset').hidden=mode!=='practice';note.textContent=mode==='practice'?'Persönliche Übungsdaten. Ausführen verändert nur diesen Übungsbereich.':'Eigene Datenbank. Ausführen speichert Änderungen in deiner verbundenen Datenbank.';if(!tables.length){status.textContent='Keine Tabellen vorhanden. Lege zuerst unter Datenbanken eine Tabelle an.';$('#training-builder').innerHTML='';$('#training-columns').innerHTML='';return;}await loadTable();}catch(e){if(current())status.textContent=e.message;}
  };
  $$('[data-training-action]').forEach(button=>button.onclick=()=>{if(running||!columns.length)return;action=button.dataset.trainingAction;$$('[data-training-action]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));resetDraft();});
  $('#training-mode').onchange=e=>{if(running)return;mode=e.target.value;loadMode();};$('#training-table').onchange=loadTable;
  $('#training-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#training-sql').textContent);toast('SQL kopiert.');}catch{toast('Bitte den SQL-Text markieren und kopieren.',true);}};
  $('#training-reset').onclick=async()=>{if(running)return;try{if(await confirm('Übungsdaten zurücksetzen?','Deine Änderungen im persönlichen Übungsbereich werden durch die Startdaten ersetzt.','Startdaten wiederherstellen')){if(!current())return;await api('training.reset',{});if(current())await loadTable();}}catch(e){if(current())status.textContent=e.message;}};
  $('#training-run').onclick=async()=>{
    if(running||!columns.length)return;const m=model(),view=previewQuery(m,columns,mode);if(!view.ready)return;
    if(['update','delete'].includes(action)&&!await confirm(action==='delete'?'Datensätze löschen?':'Werte ändern?',`${mode==='practice'?'Im persönlichen Übungsbereich':'In deiner eigenen Datenbank'} werden bis zu ${m.limit} passende Datensätze ${action==='delete'?'dauerhaft gelöscht':'geändert'}.`,action==='delete'?'Löschen':'Änderungen ausführen'))return;
    if(!current())return;running=true;clearTimeout(previewTimer);++previewSequence;const controls=$$('button,input,select');const disabled=controls.map(c=>c.disabled);controls.forEach(c=>c.disabled=true);status.textContent='Abfrage wird ausgeführt …';
    try{const result=await api('training.execute',{mode,model:m});if(!current())return;const fresh=await get('training.table',{mode,table:m.table});if(!current())return;columns=fresh.columns;tableRows=fresh.rows;renderData();$('#training-result').innerHTML=`<div class="training-result-head">${result.action==='select'?result.rows.length+' Datensätze gelesen':result.affected+' Datensätze '+(result.action==='insert'?'angelegt':result.action==='delete'?'gelöscht':'geändert')}</div>`+(result.action==='select'?tableHTML(result.rows,false,result.rows.length?Object.keys(result.rows[0]):m.columns.length?m.columns:columns.map(c=>c.Field)):'');status.textContent='Ausgeführt · Tabellenansicht aktualisiert.';}
    catch(e){if(current())status.textContent=e.message;}
    finally{running=false;controls.forEach((c,i)=>c.disabled=disabled[i]);if(current())updatePreview();}
  };
  await loadMode();return ()=>{disposed=true;endDrag();clearTimeout(previewTimer);++previewSequence;++loadSequence;root.removeEventListener('pointerdown',pointerDown);root.removeEventListener('pointermove',pointerMove);root.removeEventListener('pointerup',pointerUp);root.removeEventListener('pointercancel',cancelDrag);root.removeEventListener('click',suppressDragClick,true);root.removeEventListener('keydown',escapeDrag);};
}
export {OPERATIONS};
