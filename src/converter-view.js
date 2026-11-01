import {convertData,parseData,serializeData,formatLabel} from './data-converter.js';
import {datasetRows,datasetFromRows} from './converter-data.js';

export async function mountDataConverter(root,ctx){
  const {esc,icon,button,formats,projects=[],project=null,datasets=[],canStore=false}=ctx;
  const allowed=formats.filter(f=>['csv','tsv','json','xml'].includes(f));
  if(allowed.length<2)throw Error('Mindestens zwei Umwandlungsformate müssen freigegeben sein.');
  let disposed=false,sequence=0,sourceName='',sourceId='',lastView='';
  const options=allowed.map(f=>`<option value="${f}">${formatLabel(f)}</option>`).join('');
  root.innerHTML=`${projects.length?`<section class="lab-project-bar converter-project-bar"><label class="field"><span>Projekt</span><select data-converter-project>${projects.map(p=>`<option value="${esc(p.id)}" ${p.id===project?.id?'selected':''}>${esc(p.name)}${p.group_name?' · '+esc(p.group_name):''}</option>`).join('')}</select></label><label class="field"><span>Datensatz im Projekt</span><select data-converter-source><option value="">Datensatz auswählen …</option>${datasets.map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</select></label>${button('Datensatz laden','converter-source','secondary','table_chart')}${!canStore?'<small>Datensätze sind für dieses Projekt nicht freigegeben. Einfügen und Umwandeln bleiben verfügbar.</small>':''}</section>`:''}<div class="converter-flow"><section class="panel converter-panel"><div class="converter-panel-head"><label class="field"><span>Ausgangsformat</span><select data-converter-from>${options}</select></label><button type="button" class="icon-btn converter-swap" data-action="converter-swap" aria-label="Formate tauschen" title="Formate tauschen">${icon('swap_horiz')}</button><label class="field"><span>Zielformat</span><select data-converter-to>${options}</select></label></div><div class="converter-workspace"><section class="converter-side"><div class="converter-label"><div><strong>Ausgangsdaten</strong><small data-source-name>Einfügen oder Datei laden</small></div><label class="es-btn es-btn--sm es-btn--secondary converter-upload">${icon('upload')}Datei auswählen<input data-converter-file type="file" accept="${allowed.map(f=>'.'+f).join(',')}" hidden></label></div><textarea data-converter-input spellcheck="false" placeholder="Daten hier einfügen …" aria-label="Daten zum Umwandeln" maxlength="2097152"></textarea><div class="converter-meta"><span>${allowed.map(formatLabel).join(' · ')}</span><span data-input-count>0 Zeichen</span></div></section><section class="converter-side converter-result"><div class="converter-label"><div><strong>Ergebnis</strong><small data-converter-status role="status">Bereit für Ihre Daten</small></div><div class="converter-actions"><button type="button" class="icon-btn" data-action="converter-copy" aria-label="Ergebnis kopieren" title="Ergebnis kopieren">${icon('content_copy')}</button><button type="button" class="icon-btn" data-action="converter-download" aria-label="Ergebnis herunterladen" title="Ergebnis herunterladen">${icon('download')}</button></div></div><textarea data-converter-output spellcheck="false" readonly placeholder="Das Ergebnis erscheint hier …" aria-label="Umgewandelte Daten"></textarea><div class="converter-meta"><span data-output-format></span><span data-output-count>—</span></div></section></div><div class="converter-footer"><p class="muted">Die Umwandlung erfolgt lokal im Browser.${canStore?' Erst „Als Datensatz speichern“ legt das Ergebnis im Projekt ab.':' Ihre Eingaben werden nicht hochgeladen.'}</p><div class="converter-actions">${button('Beispiel laden','converter-example','secondary','auto_awesome')}${button('Leeren','converter-clear')}${button('Umwandeln','converter-run','primary','transform')}</div></div>${canStore?`<div class="converter-save-bar"><span>Ergebnis im Daten-Labor weiter untersuchen.</span>${button('Als Datensatz speichern','converter-save','secondary','add')}</div>`:''}<div data-converter-error class="error" role="alert"></div></section><aside class="converter-tip"><span class="meta">KURZ ERKLÄRT</span><p>CSV und TSV für Tabellen, JSON und XML für strukturierte Daten. Verschachtelte Werte werden beim Übernehmen als Datensatz als JSON-Text gespeichert.</p></aside></div>`;
  const $=q=>root.querySelector(q),input=$('[data-converter-input]'),output=$('[data-converter-output]'),from=$('[data-converter-from]'),to=$('[data-converter-to]'),error=$('[data-converter-error]'),status=$('[data-converter-status]');
  const publish=()=>{const view={object:sourceId,from:from.value,to:to.value},signature=JSON.stringify(view);if(signature!==lastView){lastView=signature;ctx.onView?.(view);}};
  from.value=allowed.includes(ctx.initialFrom)?ctx.initialFrom:allowed[0];to.value=allowed.includes(ctx.initialTo)?ctx.initialTo:allowed.includes('json')&&from.value!=='json'?'json':allowed.find(f=>f!==from.value);
  function counts(){
    $('[data-input-count]').textContent=input.value.length.toLocaleString('de-DE')+' Zeichen';
    $('[data-output-count]').textContent=output.value?output.value.length.toLocaleString('de-DE')+' Zeichen':'—';$('[data-output-format]').textContent=formatLabel(to.value);
    for(const action of ['copy','download','save']){const b=$(`[data-action="converter-${action}"]`);if(b)b.disabled=!output.value;}
  }
  function invalidate(message='Bereit zum Umwandeln'){output.value='';error.textContent='';status.textContent=message;counts();}
  function report(e){if(!disposed){error.textContent=e.message;status.textContent='Bitte Eingabe prüfen';}}
  function action(name,fn){const el=$(`[data-action="converter-${name}"]`);if(el)el.onclick=async()=>{if(el.disabled)return;try{await fn(el);}catch(e){report(e);}};}
  function setInput(text,format,name='',id='',dirty=true,keepTarget=false){
    ++sequence;input.value=text;from.value=format;sourceName=name;sourceId=id;$('[data-source-name]').textContent=name||'Einfügen oder Datei laden';
    if(!keepTarget&&from.value===to.value)to.value=allowed.find(f=>f!==from.value);invalidate();ctx.setDirty(dirty);publish();
  }
  input.oninput=()=>{++sequence;sourceId='';invalidate();ctx.setDirty(!!input.value);publish();};
  from.onchange=to.onchange=()=>{invalidate();publish();};
  action('run',()=>{if(input.value.length>2097152)throw Error('Bitte Daten mit höchstens 2 MB umwandeln.');invalidate();output.value=convertData(input.value,from.value,to.value);status.textContent='Umgewandelt in '+formatLabel(to.value);counts();});
  action('example',()=>setInput(serializeData([{Name:'Ada Lovelace',Stadt:'London'},{Name:'Grace Hopper',Stadt:'New York'}],from.value),from.value,'Beispieldaten'));
  action('clear',()=>setInput('',from.value,'','',false));
  action('swap',()=>{const a=from.value;from.value=to.value;to.value=a;if(output.value){input.value=output.value;ctx.setDirty(true);}invalidate('Formate getauscht');publish();});
  action('copy',async()=>{await navigator.clipboard.writeText(output.value);ctx.toast('Ergebnis kopiert.');});
  action('download',()=>ctx.download(new Blob([output.value],{type:to.value==='json'?'application/json':to.value==='xml'?'application/xml':'text/plain;charset=utf-8'}),'daten.'+to.value));
  action('save',async()=>{const content=datasetFromRows(parseData(output.value,to.value),ctx.maxRows);await ctx.saveDataset(content,sourceName?sourceName+' · Umgewandelt':'Umgewandelte Daten');});
  async function loadSource(id,initial=false){
    if(!datasets.some(d=>d.id===id))throw Error('Bitte einen Datensatz dieses Projekts auswählen.');
    const stamp=++sequence,o=await ctx.loadDataset(id);if(disposed||stamp!==sequence)return;
    const format=initial&&allowed.includes(ctx.initialFrom)?ctx.initialFrom:allowed.includes('json')?'json':allowed[0];setInput(serializeData(datasetRows(o.content),format),format,o.name,o.id,false,initial&&allowed.includes(ctx.initialTo));
    $('[data-converter-source]').value=o.id;
  }
  action('source',()=>loadSource($('[data-converter-source]').value));
  const source=$('[data-converter-source]');if(source){const b=$('[data-action="converter-source"]');b.disabled=true;source.onchange=()=>b.disabled=!source.value;}
  const projectSelect=$('[data-converter-project]');if(projectSelect)projectSelect.onchange=()=>{const id=projectSelect.value;projectSelect.value=project.id;ctx.changeProject(id);};
  $('[data-converter-file]').onchange=async e=>{
    const file=e.target.files?.[0];if(!file)return;const stamp=++sequence;
    try{if(file.size>2097152)throw Error('Die Datei darf höchstens 2 MB groß sein.');const format=file.name.split('.').pop().toLowerCase();if(!allowed.includes(format))throw Error('Dieses Dateiformat ist nicht freigegeben.');const text=await file.text();if(!disposed&&stamp===sequence)setInput(text,format,file.name);}
    catch(e){report(e);}finally{e.target.value='';}
  };
  counts();publish();
  if(ctx.initialObject)try{await loadSource(ctx.initialObject,true);if(!disposed)$('[data-action="converter-source"]').disabled=false;}catch(e){report(e);}
  return ()=>{disposed=true;++sequence;};
}
