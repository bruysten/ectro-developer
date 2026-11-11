import {govId} from './governance-models.js';
import {escapeHtml as e} from './studio-charts.js';
import {govField as field,govSelect as select} from './governance-ui.js';
// IDs remain stable when a visible code changes. Removal always relocates cards.
export async function editGovernanceContributions(ctx,forms){
 const {contributions:config}=await ctx.get('lab.governance.context',{project:ctx.project});
 const original=structuredClone(config.items),items=structuredClone(original),moves={},counts={...config.counts};
 for(const item of original)counts[item.id]=Math.max(counts[item.id]||0,ctx.content.assignments.filter(a=>a.raci===item.id).length);
 let saved=false;
 await forms.open('Beiträge im Projekt',`<p class="studio-note">Gilt für alle Governance-Arbeiten dieses Projekts. Personen und fachliche Rollen bleiben erhalten.</p><div data-contribution-editor></div>`,async()=>{
  if(!items.length)throw Error('Mindestens einen Bereich behalten.');
  // Save the open draft before migrating every work. Server versions prevent
  // concurrent drafts from silently restoring removed categories.
  await ctx.save();await ctx.api('lab.governance.contributions.save',{project:ctx.project,version:config.version,items,moves});saved=true;
 },'Projektweit speichern',{className:'gov-contributions-dialog',after:dialog=>{
  const host=dialog.querySelector('[data-contribution-editor]');
  const changed=()=>host.dispatchEvent(new Event('input',{bubbles:true}));
  const draw=(focus='')=>{
   const removed=original.filter(x=>!items.some(i=>i.id===x.id));
   host.innerHTML=`<div class="gov-contribution-rows">${items.map((x,index)=>`<section data-contribution-row="${x.id}" aria-label="Beitragsbereich ${index+1}"><div class="gov-contribution-line">${field('Kürzel','code-'+x.id,x.code,{required:true,max:8})}${field('Bezeichnung','label-'+x.id,x.label,{required:true,max:80})}<div class="gov-contribution-actions">${[['up','arrow_upward','Nach oben',index===0],['down','arrow_downward','Nach unten',index===items.length-1],['remove','delete','Bereich entfernen',items.length===1]].map(([key,icon,label,disabled])=>`<button type="button" data-contribution-action="${key}" aria-label="${label}" title="${label}" ${disabled?'disabled':''}>${ctx.icon(icon)}</button>`).join('')}</div></div><details><summary>Erklärung & Bedeutung${x.accountable?' · Gesamtverantwortung':''}</summary>${field('Kurze Erklärung','description-'+x.id,x.description,{max:240})}<label class="lab-check"><input type="checkbox" name="accountable-${x.id}" ${x.accountable?'checked':''}>Zählt als Gesamtverantwortung</label></details></section>`).join('')}</div><button type="button" class="es-btn es-btn--sm es-btn--secondary" data-contribution-add ${items.length>=12?'disabled':''}>${ctx.icon('add')}Bereich ergänzen</button>${removed.length?`<div class="gov-contribution-moves"><h3>Entfernte Bereiche</h3>${removed.map(x=>select(x.code+' · '+x.label+' · '+(counts[x.id]||0)+' '+(counts[x.id]===1?'Zuordnung':'Zuordnungen'),'move-'+x.id,{'':'Neues Ziel wählen …',...Object.fromEntries(items.map(i=>[i.id,i.code+' · '+(i.label||'Neuer Bereich')]))},moves[x.id]||'',counts[x.id]?'required':'')).join('')}<p class="studio-note">Bestehende Karten werden in den gewählten Bereich verschoben. Gleichartige doppelte Zuordnungen bitte zuvor im Board klären.</p></div>`:''}`;
   for(const x of items){const row=host.querySelector(`[data-contribution-row="${x.id}"]`);for(const key of ['code','label','description','accountable'])row.querySelector(`[name="${key}-${x.id}"]`).oninput=ev=>{x[key]=key==='accountable'?ev.target.checked:ev.target.value;if(key==='accountable')row.querySelector('summary').textContent='Erklärung & Bedeutung'+(x.accountable?' · Gesamtverantwortung':'');};row.querySelectorAll('[data-contribution-action]').forEach(b=>b.onclick=()=>{const index=items.indexOf(x),action=b.dataset.contributionAction;if(action==='remove'){items.splice(index,1);delete moves[x.id];for(const id of Object.keys(moves))if(moves[id]===x.id)delete moves[id];}else{const to=index+(action==='up'?-1:1);[items[index],items[to]]=[items[to],items[index]];}draw(action==='remove'?'add':x.id);changed();});}
   for(const x of removed)host.querySelector(`[name="move-${x.id}"]`).onchange=ev=>{if(ev.target.value)moves[x.id]=ev.target.value;else delete moves[x.id];};
   host.querySelector('[data-contribution-add]').onclick=()=>{const x={id:govId(),code:'',label:'',description:'',accountable:false};items.push(x);draw(x.id);changed();};
   if(focus==='add')host.querySelector('[data-contribution-add]').focus();else if(focus)host.querySelector(`[name="code-${focus}"]`)?.focus();
  };draw();
 }});
 if(saved&&ctx.alive()){ctx.toast('Beitragsbereiche für das Projekt gespeichert.');await ctx.reload();}
}
