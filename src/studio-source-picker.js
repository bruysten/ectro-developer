import {discoverJsonTables} from './studio-source-tables.js';
import {selectSourceTables,selectDatabaseSource} from './studio-source-dialog.js';
import {escapeHtml as e} from './studio-charts.js';
export const sourceKey=s=>s?JSON.stringify([s.type,s.id||'',s.path||'',s.table||'',s.scope||'project',s.type==='inline'?s.name:'',s.type==='combined'?s:null]):'';
export async function mountSourcePicker(root,ctx,{source=null,onSelect=()=>{},onData=()=>{},text=false,inline=true,autoLoad=true}={}){
 let alive=true,sequence=0,current=source,sources=[],databases=[],database=false,inlineSource=source?.type==='inline'?structuredClone(source):null;
 const live=()=>alive&&ctx.alive();
 root.innerHTML='<p class="studio-note" role="status">Projektquellen werden geladen …</p>';
 const {api,project,kind,fail}=ctx;
 function draw(){if(!live())return;const selected=sourceKey(current),available=sources.filter(s=>text||s.source.type!=='text');
  root.innerHTML=`<div class="studio-source-controls"><label class="field"><span>Datenquelle</span><select data-source-select><option value="" disabled ${!current?'selected':''}>Quelle auswählen …</option>${inlineSource?`<option value="inline" ${current?.type==='inline'?'selected':''}>${e(inlineSource.name)} · eigene Daten</option>`:''}${available.map((s,i)=>`<option value="${i}" ${sourceKey(s.source)===selected?'selected':''}>${e(s.name)}</option>`).join('')}${current&&current.type!=='inline'&&!available.some(s=>sourceKey(s.source)===selected)?`<option value="unavailable" selected>${e(current.type==='mysql'?current.table+' · '+(current.scope==='personal'?'Persönliche Datenbank':'Projekt-Datenbank'):current.type==='combined'?current.tables.map(t=>t.alias).join(' + '):'Gespeicherte Quelle · erneut prüfen')}</option>`:''}</select></label><div class="toolbar">${databases.length?'<button type="button" class="es-btn es-btn--sm es-btn--secondary" data-source-mysql>Datenbanktabellen auswählen</button>':''}${database&&!databases.length?`<a class="link" href="#database?project=${e(project)}">Projektdatenbank verbinden</a>`:''}${inline?'<button type="button" class="es-btn es-btn--sm es-btn--secondary" data-source-import>JSON importieren</button>':''}<button type="button" class="es-btn es-btn--sm es-btn--secondary" data-source-refresh ${current?'':'disabled'}>Quelle neu lesen</button></div></div><p class="studio-note" data-source-status role="status"></p>`;
  root.querySelector('[data-source-select]').onchange=async ev=>{const index=ev.target.value;if(index===''||index==='unavailable')return;current=index==='inline'?structuredClone(inlineSource):structuredClone(available[Number(index)].source);onSelect(current);draw();if(autoLoad)await load();};
  root.querySelector('[data-source-refresh]').onclick=()=>load();
  root.querySelector('[data-source-mysql]')?.addEventListener('click',async ev=>{const button=ev.currentTarget;button.disabled=true;
   try{
    const initial=current?.type==='combined'?current:current?.type==='mysql'?{tables:[{...current,scope:current.scope||'project'}]}:null;
    await selectDatabaseSource({...ctx,alive:live},{databases,initial,onApply:async(next,data)=>{
     if(!live())return;++sequence;current=next;onSelect(current);draw();showData(data);
    }});
   }catch(error){if(live())fail(error);}finally{if(live())button.disabled=false;}
  });
  root.querySelector('[data-source-import]')?.addEventListener('click',()=>{const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{
   const file=input.files[0];if(!file)return;if(file.size>900000)throw Error('Bitte eine JSON-Datei bis 900 KB verwenden.');const tables=discoverJsonTables(JSON.parse(await file.text()));if(!live())return;
   await selectSourceTables(ctx,{title:'JSON-Listen auswählen',tables,read:async table=>({rows:table.rows,columns:table.columns}),onApply:async({data,selected})=>{
    if(!live())return;current={type:'inline',name:(file.name+' · '+selected.map(t=>t.alias).join(' + ')).slice(0,180),columns:data.columns,rows:data.rows,...(data.sourceColumn?{sourceColumn:data.sourceColumn}:{})};inlineSource=structuredClone(current);onSelect(current);draw();await load();
   }});
  }catch(error){if(live())fail(error);}};input.click();});
 }
 function showData(data){
  onData(data);const status=root.querySelector('[data-source-status]'),missing=data.unmatched?.filter(v=>v.count).map(v=>`${v.table}: ${v.count} Zeilen ohne Treffer`).join(' · ');
  status.textContent=data.text!==undefined?data.name+' · '+data.text.length.toLocaleString('de-DE')+' Zeichen':`${data.name} · ${data.rows.length.toLocaleString('de-DE')} gelesene Zeilen${data.truncated?' · begrenzter Ausschnitt, Vergleiche und Beziehungen können unvollständig sein':''}${missing?' · '+missing:''}${data.expanded?' · '+data.expanded+' zusätzliche Zeilen durch Mehrfachtreffer; Summen können sich vervielfachen.':''}`;
  status.classList.toggle('is-warning',!!data.truncated||!!data.expanded||!!missing);
 }
 async function load(){if(!current||!live())return;const seq=++sequence,selected=structuredClone(current),status=root.querySelector('[data-source-status]');status.textContent='Quelle wird geprüft und gelesen …';onData(null);
  try{const data=await api('studio.source',{project,kind,source:selected});if(!live()||seq!==sequence)return;showData(data);}
  catch(error){if(live()&&seq===sequence){status.textContent=error.message;status.classList.add('is-warning');onData(null,error);}}
 }
 try{const result=await api('studio.sources',{project,kind});if(!live())return()=>{};sources=result.sources;databases=result.databases||(result.mysql?[{scope:'project',name:'Projekt-Datenbank'}]:[]);database=result.database;draw();if(current&&autoLoad)await load();}catch(error){if(live()){root.innerHTML='<p class="error">Projektquellen konnten nicht geladen werden.</p>';fail(error);}}
 return ()=>{alive=false;sequence++;};
}
