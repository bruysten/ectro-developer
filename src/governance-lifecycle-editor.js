import {lifecycleFromStore} from './governance-models.js';
import {flowPath} from './landscape-models.js';
import {escapeHtml as e} from './studio-charts.js';
import {govField as field,govSelect as select} from './governance-ui.js';

export async function editLifecycleAsset({forms,landscape,existing:a,onSave,landscapeUrl=''}){
 const stores=landscape?.stores||[],flows=landscape?.flows||[],systemName=id=>landscape?.systems.find(s=>s.id===id)?.name||'System fehlt';
 const options={'':'Datenbestand wählen …',...Object.fromEntries(stores.map(s=>[s.id,s.name+' · '+systemName(s.system)]))};
 if(a?.sourceStore&&!stores.some(s=>s.id===a.sourceStore))options[a.sourceStore]='Bisheriger Datenbestand · nicht mehr verfügbar';
 const initialAuto=a?.nameFromSource??!a;let selected=new Set(a?.flows||[]),purposeEdited=false;
 await forms.open(a?'Datenweg bearbeiten':'Datenbestand verfolgen',`${select('Ausgangsbestand aus der Landscape','sourceStore',options,a?.sourceStore||'')}<div class="gov-asset-origin" data-asset-origin></div>${field('Verwendungszweck','purpose',a?.purpose||'',{area:true,max:2000})}<fieldset class="gov-check-list gov-asset-flows"><legend>Übergaben in der Landscape</legend><div data-asset-flows></div></fieldset><p class="studio-note" data-asset-guidance>Übernommen werden nur Datenflüsse, denen dieser Bestand bereits zugeordnet ist. Weitere Übergaben ausdrücklich auswählen.</p><details class="gov-asset-options" ${a&&!initialAuto?'open':''}><summary>Bezeichnung anpassen</summary><label class="lab-check"><input type="checkbox" name="nameFromSource" ${initialAuto?'checked':''}>Bezeichnung aus dem Datenbestand übernehmen</label>${field('Eigene Bezeichnung','name',a?.name||'')}</details>${a?.steps.length||a?.flows.length?'<p class="notice" data-asset-source-change hidden>Ausgangsbestand geändert: Vorhandene Schritte und Übergaben bleiben erhalten. Ihre Zuordnung bitte prüfen.</p>':''}${a?'<label class="lab-check"><input type="checkbox" name="remove">Datenweg mit seinen modellierten Schritten entfernen</label>':''}`,d=>{
  if(d.has('remove')){onSave(null);return;}
  const sourceStore=d.get('sourceStore'),store=stores.find(s=>s.id===sourceStore),nameFromSource=d.has('nameFromSource');
  if(!a&&!store||sourceStore&&!store&&sourceStore!==a?.sourceStore)throw Error('Einen vorhandenen Datenbestand wählen.');
  if(nameFromSource&&!sourceStore)throw Error('Zuerst den Ausgangsbestand wählen.');
  const name=nameFromSource?(store?.name||a?.name||''):d.get('name')?.trim();if(!name)throw Error('Eine Bezeichnung eingeben.');
  const next={...(a||lifecycleFromStore(landscape,sourceStore)),name,nameFromSource,purpose:d.get('purpose'),sourceStore,flows:d.getAll('flows'),steps:a?.steps||[]};onSave(next);
 },a?'Übernehmen':'Datenweg anlegen',{after:dialog=>{
  const source=dialog.querySelector('[name=sourceStore]'),auto=dialog.querySelector('[name=nameFromSource]'),name=dialog.querySelector('[name=name]'),purpose=dialog.querySelector('[name=purpose]'),list=dialog.querySelector('[data-asset-flows]');
  const row=(f,known=false)=>`<label><input type="checkbox" name="flows" value="${e(f.id)}" ${selected.has(f.id)?'checked':''}><span><strong>${e(f.name)}</strong><small>${e(flowPath(f,systemName))}${known?' · Bestand bereits zugeordnet':''}</small></span></label>`;
  const renderOrigin=()=>{const store=stores.find(s=>s.id===source.value);source.required=!a||auto.checked;name.disabled=auto.checked;name.required=!auto.checked;const waiting=!a&&!store;for(const el of [purpose.closest('.field'),list.closest('fieldset'),dialog.querySelector('[data-asset-guidance]'),dialog.querySelector('.gov-asset-options')])el.hidden=waiting;dialog.querySelector('[type=submit]').disabled=waiting;
   dialog.querySelector('[data-asset-origin]').innerHTML=store?`<strong>${e(auto.checked?store.name:name.value||store.name)}</strong><span>Start in ${e(systemName(store.system))}</span>${store.dataTypes?`<small>${e(store.dataTypes.slice(0,180))}${store.dataTypes.length>180?'…':''}</small>`:''}${landscapeUrl?`<a class="link" href="${e(landscapeUrl)}" target="_blank" rel="noopener noreferrer">Landscape öffnen ↗</a>`:''}`:a?.sourceStore?'<span>Der bisherige Ausgangsbestand ist nicht mehr verfügbar. Gespeicherte Angaben bleiben erhalten.</span>':'<span>Den vorhandenen Datenbestand wählen – Name und Ausgangssystem werden übernommen.</span>';
   const notice=dialog.querySelector('[data-asset-source-change]');if(notice)notice.hidden=source.value===a.sourceStore;
  };
  const renderFlows=()=>{const associated=flows.filter(f=>(f.stores||[]).includes(source.value)&&source.value),other=flows.filter(f=>!associated.includes(f)),missing=[...selected].filter(id=>!flows.some(f=>f.id===id));
   list.innerHTML=associated.map(f=>row(f,true)).join('')+(associated.length?'':'<p class="studio-note">Diesem Bestand sind noch keine Datenflüsse zugeordnet.</p>')+(other.length?`<details ${a&&other.some(f=>selected.has(f.id))?'open':''}><summary>Weitere Übergaben prüfen · ${other.length}</summary>${other.map(f=>row(f)).join('')}</details>`:'')+missing.map(id=>`<label><input type="checkbox" name="flows" value="${e(id)}" checked><span>Datenfluss nicht mehr verfügbar<small>${e(id)} · gespeicherter Verweis</small></span></label>`).join('');
  };
  source.onchange=()=>{const store=stores.find(s=>s.id===source.value),proposed=store?lifecycleFromStore(landscape,store.id):null;
   selected=a?new Set([...selected,...(proposed?.flows||[])]):new Set(proposed?.flows||[]);
   if(!a&&!purposeEdited)purpose.value=proposed?.purpose||'';
   renderOrigin();renderFlows();
  };
  purpose.oninput=()=>{purposeEdited=true;};auto.onchange=renderOrigin;name.oninput=renderOrigin;
  list.onchange=()=>{selected=new Set([...list.querySelectorAll('input:checked')].map(el=>el.value));};
  renderOrigin();renderFlows();
 }});
}
