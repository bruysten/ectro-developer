// An access snapshot concerns visibility, independently of the current voice.
export function workspaceAccessKey(groups=[],flags={}){return JSON.stringify({groups:(groups||[]).map(g=>[g.id,g.name]).sort((a,b)=>a[0].localeCompare(b[0])),flags:Object.entries(flags||{}).sort(([a],[b])=>a.localeCompare(b))});}
export function pruneWorkspaceSelect(select,allowed){
 const previous=select.value,label=[...select.options].find(o=>o.value===previous)?.textContent||previous;
 for(const option of [...select.options])if(option.value&&option.value!=='access-revoked'&&!allowed.has(option.value))option.remove();
 if(previous==='access-revoked'){
  if(allowed.has(select.dataset.accessPrevious)){const restored=select.ownerDocument.createElement('option');restored.value=select.dataset.accessPrevious;restored.textContent=select.dataset.accessLabel;restored.selected=true;select.prepend(restored);[...select.options].find(o=>o.value==='access-revoked')?.remove();select.setCustomValidity('');delete select.dataset.accessPrevious;delete select.dataset.accessLabel;return false;}return true;
 }
 const lost=!!previous&&!allowed.has(previous);if(lost){select.dataset.accessPrevious=previous;select.dataset.accessLabel=label;const placeholder=select.ownerDocument.createElement('option');placeholder.value='access-revoked';placeholder.textContent='Bitte neu auswählen · Zugriff geändert';placeholder.disabled=true;placeholder.selected=true;select.prepend(placeholder);select.setCustomValidity('Bitte einen aktuell freigegebenen Bereich auswählen.');select.addEventListener('change',()=>{select.setCustomValidity('');placeholder.remove();delete select.dataset.accessPrevious;delete select.dataset.accessLabel;},{once:true});}return lost;
}
export function workspaceRouteAllowed(route,flags,studios={}){
 const studio=Object.values(studios).find(s=>s.route===route);if(studio)return !!flags.files&&!!flags[studio.feature];
 if(['projects','files','editor'].includes(route))return !!flags.files&&(route!=='editor'||!!flags.editor);
 if(['database','sql-training'].includes(route))return !!flags.database;
 if(route==='graph')return !!flags.files&&!!flags.graph;
 if(route==='data-lab')return !!flags.converter||!!flags.files&&!!flags.data_lab;
 if(route==='ai-lab')return !!flags.files&&!!(flags.ai||flags.rag||flags.neural);
 if(['chat','team'].includes(route))return !!flags[route];return true;
}

// Keep references held by open labs alive, rather than replacing their flags object.
export function replaceWorkspaceFlags(current,next={}){
 for(const key of Object.keys(current))if(!Object.hasOwn(next,key))delete current[key];
 Object.assign(current,next);return current;
}
export function refreshWorkspaceNavigation(nav,html,route){
 if(!nav)return;
 const previous=nav.querySelector('.nav-lab-group'),opened=previous?.open,top=nav.scrollTop,active=nav.ownerDocument.activeElement;
 const focused=nav.contains(active)?active.closest('[data-route]')?.dataset.route:null,summaryFocused=active===previous?.querySelector('summary');
 nav.innerHTML=html;
 for(const link of nav.querySelectorAll('[data-route]'))link.setAttribute('aria-current',link.dataset.route===route?'page':'false');
 const group=nav.querySelector('.nav-lab-group'),selected=!!group?.querySelector('[aria-current="page"]');
 if(group){group.open=!!opened||selected;group.classList.toggle('has-active',selected);}
 if(focused){const target=[...nav.querySelectorAll('[data-route]')].find(link=>link.dataset.route===focused);(target||group?.querySelector('summary'))?.focus({preventScroll:true});}
 else if(summaryFocused)group?.querySelector('summary')?.focus({preventScroll:true});
 nav.scrollTop=top;
}
