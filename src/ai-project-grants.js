export async function mountProjectGrants(root,{get,api,esc,modal,confirm,toast}){
 let alive=true,sequence=0;
 const workspace=p=>p?.group_name||p?.owner||'Persönlich';
 async function refresh(){
  const request=++sequence,data=await get('admin.labs');if(!alive||request!==sequence)return;
  const available=data.connections.filter(c=>c.active),canAdd=data.projects.length&&available.length;
  const empty=!data.projects.length?'Zuerst ein Projekt anlegen.':!available.length?'Zuerst einen aktiven KI-Zugang bereitstellen.':'Noch keine Projektfreigaben. Mit „Projekt freigeben“ eine Verbindung zuordnen.';
  root.innerHTML=`<div class="section-head"><div><h2>KI-Projektfreigaben</h2><p class="lab-hint">KI-Verbindungen gezielt für einzelne Projekte freigeben. Gruppenfreigaben gelten zusätzlich.</p></div><button type="button" class="es-btn es-btn--sm es-btn--secondary" data-project-grant-add ${canAdd?'':`disabled title="${esc(!data.projects.length?'Zuerst ein Projekt anlegen.':'Zuerst einen aktiven KI-Zugang bereitstellen.')}"`}>Projekt freigeben</button></div>${!canAdd&&data.grants.length?`<p class="notice">${empty}</p>`:''}${data.grants.map((g,i)=>{
   const project=data.projects.find(p=>p.id===g.project_id),connection=data.connections.find(c=>c.id===g.connection_id);
   return `<div class="lab-list-row ai-project-grant"><span><strong>${esc(g.project_name)}</strong><small>${esc(workspace(project))}</small></span><span><strong>${esc(g.connection_name)}</strong><small>${g.calls} / ${g.max_calls} Aufrufe insgesamt${connection&&!connection.active?' · Verbindung inaktiv':''}</small></span><div class="toolbar"><button type="button" class="link" data-project-grant-edit="${i}">Bearbeiten</button><button type="button" class="link danger" data-project-grant-remove="${i}">Entziehen</button></div></div>`;
  }).join('')||`<p class="muted">${empty}</p>`}<p class="lab-hint">Bisherige Aufrufe zählen bei Budgetänderungen und erneuter Freigabe weiter. Bestehende Gruppen- und Tokenbudgets bleiben wirksam.</p>`;
  async function edit(g=null){
   const choices=data.connections.filter(c=>c.active||c.id===g?.connection_id),project=data.projects.find(p=>p.id===g?.project_id);
   const projectField=g?`<div class="field ai-grant-summary"><span>Projekt · Workspace</span><strong>${esc(g.project_name)}</strong><small>${esc(workspace(project))}</small></div>`:`<label class="field"><span>Projekt · Workspace</span><select name="project" required>${data.projects.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${esc(workspace(p))}</option>`).join('')}</select></label>`;
   const connectionField=g?`<div class="field ai-grant-summary"><span>KI-Verbindung</span><strong>${esc(g.connection_name)}</strong></div>`:`<label class="field"><span>KI-Verbindung</span><select name="connection" required>${choices.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc({openai:'OpenAI',anthropic:'Anthropic',daimon:'Daimon'}[c.provider]||c.provider)} · ${esc({chat:'Textgenerierung',embedding:'Embeddings',rerank:'Reranking'}[c.capability]||c.capability)}</option>`).join('')}</select></label>`;
   await modal(g?'Projektbudget bearbeiten':'KI für Projekt freigeben',`<div class="form">${projectField}${connectionField}<label class="field"><span>Aufrufe insgesamt</span><input name="max_calls" type="number" min="1" max="10000" step="1" required value="${g?.max_calls??100}"></label><p class="lab-hint" data-project-grant-note role="status"></p></div>`,async form=>{
    await api('ai.grant',{project:g?.project_id||form.get('project'),connection:g?.connection_id||form.get('connection'),max_calls:Number(form.get('max_calls'))});
    toast('Projektfreigabe gespeichert.');await refresh();
   },'Speichern',{after:dialog=>{
    const project=dialog.querySelector('[name="project"]'),connection=dialog.querySelector('[name="connection"]'),limit=dialog.querySelector('[name="max_calls"]'),note=dialog.querySelector('[data-project-grant-note]');
    const update=()=>{const existing=data.grants.find(v=>v.project_id===(g?.project_id||project.value)&&v.connection_id===(g?.connection_id||connection.value));limit.value=existing?.max_calls??100;note.textContent=existing?`Bereits freigegeben · ${existing.calls} Aufrufe verbraucht. Speichern passt das bestehende Gesamtbudget an.`:'Das Budget gilt gemeinsam für alle Nutzer dieses Projekts und dieser Verbindung.';};
    project?.addEventListener('change',update);connection?.addEventListener('change',update);update();
   }});
  }
  root.querySelector('[data-project-grant-add]').onclick=()=>edit().catch(e=>toast(e.message,true));
  root.querySelectorAll('[data-project-grant-edit]').forEach(b=>b.onclick=()=>edit(data.grants[Number(b.dataset.projectGrantEdit)]).catch(e=>toast(e.message,true)));
  root.querySelectorAll('[data-project-grant-remove]').forEach(b=>b.onclick=async()=>{
   const g=data.grants[Number(b.dataset.projectGrantRemove)];
   if(!await confirm('Projektfreigabe entziehen','Nur diese Projektfreigabe entziehen? Ein Zugang über Gruppenfreigaben bleibt bestehen.','Entziehen'))return;
   b.disabled=true;try{await api('ai.grant',{project:g.project_id,connection:g.connection_id,max_calls:0});toast('Projektfreigabe entzogen.');await refresh();}catch(e){toast(e.message,true);}finally{b.disabled=false;}
  });
 }
 await refresh();return {refresh,dispose(){alive=false;++sequence;}};
}
