const collator=new Intl.Collator('de',{sensitivity:'base',numeric:true});
const compare=(a,b)=>collator.compare(String(a??''),String(b??''));
export const USER_ROLES={user:'Lernender',teacher:'Lehrer',admin:'Admin'};
export const NO_GROUP='@none';
export const userDirectoryDefaults=()=>({search:'',group:'',role:'',status:'',view:'list',sort:'name',direction:'asc'});
export function normalizeUserDirectory(state={},groups=[]){
  const s={...userDirectoryDefaults(),...state};
  s.search=typeof s.search==='string'?s.search.slice(0,200):'';
  if(s.group!==NO_GROUP&&!groups.some(g=>g.id===s.group))s.group='';
  if(!Object.hasOwn(USER_ROLES,s.role))s.role='';
  if(!['active','blocked'].includes(s.status))s.status='';
  if(!['list','groups'].includes(s.view))s.view='list';
  if(!['name','email','group','role','status','login'].includes(s.sort))s.sort='name';
  if(!['asc','desc'].includes(s.direction))s.direction='asc';
  return Object.fromEntries(Object.keys(userDirectoryDefaults()).map(k=>[k,s[k]]));
}
const fold=value=>String(value).normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('de');
export function buildUserDirectory(users,state,groups=[]){
  const s=normalizeUserDirectory(state,groups),terms=fold(s.search).trim().split(/\s+/).filter(Boolean),direction=s.direction==='desc'?-1:1;
  const memberships=u=>[...(u.groups||[])].sort((a,b)=>compare(a.name,b.name)||compare(a.id,b.id));
  const selected=users.filter(u=>(!s.group||(s.group===NO_GROUP?!u.groups.length:u.groups.some(g=>g.id===s.group)))&&(!s.role||u.role===s.role)&&(!s.status||(s.status==='active'?u.active:!u.active))&&terms.every(term=>fold([u.name,u.email,USER_ROLES[u.role],...u.groups.map(g=>g.name)].join(' ')).includes(term)));
  const firstGroup=new Map(selected.map(u=>[u.id,memberships(u)[0]?.name||'']));
  selected.sort((a,b)=>{
    let result=0;
    if(s.sort==='login'){
      const x=Date.parse(a.last_login||''),y=Date.parse(b.last_login||'');
      if(Number.isFinite(x)!==Number.isFinite(y))return Number.isFinite(x)?-1:1;
      result=Number.isFinite(x)?x-y:0;
    }else if(s.sort==='group'){
      const x=firstGroup.get(a.id),y=firstGroup.get(b.id);if(!x!==!y)return x?-1:1;result=compare(x,y);
    }else if(s.sort==='role')result=({user:0,teacher:1,admin:2}[a.role]??3)-({user:0,teacher:1,admin:2}[b.role]??3);
    else if(s.sort==='status')result=Number(b.active)-Number(a.active);
    else result=compare(a[s.sort],b[s.sort]);
    return result*direction||compare(a.name,b.name)||compare(a.email,b.email)||compare(a.id,b.id);
  });
  const buckets=new Map();
  if(s.view==='groups')for(const u of selected){const assigned=memberships(u);const visible=s.group&&s.group!==NO_GROUP?assigned.filter(g=>g.id===s.group):assigned;
    for(const g of visible.length?visible:[{id:NO_GROUP,name:'Ohne Gruppe'}]){if(!buckets.has(g.id))buckets.set(g.id,{...g,users:[]});buckets.get(g.id).users.push(u);}
  }
  const sections=[...buckets.values()].sort((a,b)=>a.id===NO_GROUP?1:b.id===NO_GROUP?-1:compare(a.name,b.name)*(s.sort==='group'?direction:1));
  return {users:selected,sections,multiple:selected.some(u=>u.groups.length>1),state:s};
}

export function mountUserDirectory(root,{users,groups,userId,esc,datetime,iconButton,onEdit,onDelete,onError=()=>{},onLocation=()=>{}}){
  const storageKey='academy:admin-users:'+userId;let saved;try{saved=JSON.parse(sessionStorage.getItem(storageKey)||'{}');}catch{}
  const params=new URLSearchParams(location.hash.split('?')[1]||'');
  let state=normalizeUserDirectory({...saved,...(params.has('group')?{group:params.get('group')}:{})},groups);const collapsed=new Set();
  const option=(v,label,current)=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(label)}</option>`;
  root.innerHTML=`<section class="users-controls panel" aria-label="Benutzer filtern und ordnen"><div class="users-filter-grid"><label class="field users-search"><span>Benutzer suchen</span><input id="user-search" data-users-field="search" type="search" maxlength="200" placeholder="Name, E-Mail oder Gruppe" value="${esc(state.search)}" autocomplete="off"></label><label class="field"><span>Gruppenzugehörigkeit</span><select data-users-field="group">${[['','Alle Gruppen'],[NO_GROUP,'Ohne Gruppe'],...groups.map(g=>[g.id,g.name])].map(([v,n])=>option(v,n,state.group)).join('')}</select></label><label class="field"><span>Rolle</span><select data-users-field="role">${[['','Alle Rollen'],...Object.entries(USER_ROLES)].map(([v,n])=>option(v,n,state.role)).join('')}</select></label><label class="field"><span>Status</span><select data-users-field="status">${[['','Alle Zustände'],['active','Aktiv'],['blocked','Gesperrt']].map(([v,n])=>option(v,n,state.status)).join('')}</select></label></div><div class="users-view-toolbar"><label class="field"><span>Darstellung</span><select data-users-field="view">${[['list','Gemeinsame Liste'],['groups','Nach Gruppen gruppieren']].map(([v,n])=>option(v,n,state.view)).join('')}</select></label><label class="field"><span>Sortieren nach</span><select data-users-field="sort">${[['name','Name'],['email','E-Mail'],['group','Gruppe'],['role','Rolle'],['status','Status'],['login','Letzter Login']].map(([v,n])=>option(v,n,state.sort)).join('')}</select></label><button type="button" class="es-btn es-btn--sm es-btn--secondary users-direction" data-users-direction></button><button type="button" class="link" data-users-reset>Ansicht zurücksetzen</button></div></section><div class="users-results-head"><span data-users-count role="status" aria-live="polite"></span><span data-users-hint></span></div><div data-users-results></div>`;
  const $=s=>root.querySelector(s);
  function remember(){try{sessionStorage.setItem(storageKey,JSON.stringify(state));}catch{}const hash='#users'+(state.group?'?'+new URLSearchParams({group:state.group}):'');if(location.hash!==hash)history.replaceState(null,'',hash);onLocation();}
  function row(u){return `<tr data-user="${esc(u.id)}"><td data-label="Name / E-Mail" class="users-identity"><strong>${esc(u.name)}</strong><div class="muted">${esc(u.email)}</div></td><td data-label="Rolle">${USER_ROLES[u.role]||esc(u.role)}</td><td data-label="Gruppen" class="users-memberships">${u.groups.length?[...u.groups].sort((a,b)=>compare(a.name,b.name)).map(g=>`<button type="button" class="tag users-group-chip ${state.group===g.id?'is-selected':''}" data-users-group="${esc(g.id)}" aria-label="Benutzer der Gruppe ${esc(g.name)} anzeigen">${esc(g.name)}</button>`).join(''):'<span class="muted">Keine Gruppe</span>'}</td><td data-label="Status"><span class="tag ${u.active?'accent':''}">${u.active?'Aktiv':'Gesperrt'}</span></td><td data-label="Letzter Login" class="muted">${datetime(u.last_login)}</td><td data-label="Aktionen"><div class="actions">${iconButton('edit','edit-user','Benutzer bearbeiten')}${u.id!==userId?iconButton('delete','delete-user','Benutzer löschen'):''}</div></td></tr>`;}
  const table=rows=>`<div class="table-wrap users-table-wrap"><table class="users-table"><thead><tr><th scope="col">Name / E-Mail</th><th scope="col">Rolle</th><th scope="col">Gruppen</th><th scope="col">Status</th><th scope="col">Letzter Login</th><th scope="col">Aktionen</th></tr></thead><tbody>${rows.map(row).join('')}</tbody></table></div>`;
  function draw(){
    const model=buildUserDirectory(users,state,groups);state=model.state;
    $('[data-users-count]').textContent=`${model.users.length} von ${users.length} Zugängen${state.view==='groups'?' · '+model.sections.length+' '+(model.sections.length===1?'Gruppenbereich':'Gruppenbereiche'):''}`;
    $('[data-users-hint]').textContent=state.view==='groups'&&model.multiple?'Mehrfachmitglieder erscheinen in jeder zugehörigen Gruppe.':state.sort==='group'&&state.view==='list'?'Bei mehreren Gruppen zählt der erste Gruppenname (A–Z).':'';
    $('[data-users-direction]').textContent=state.direction==='asc'?'↑ Aufsteigend':'↓ Absteigend';$('[data-users-direction]').setAttribute('aria-label','Sortierrichtung: '+(state.direction==='asc'?'aufsteigend. Absteigend sortieren':'absteigend. Aufsteigend sortieren'));
    $('[data-users-reset]').disabled=JSON.stringify(state)===JSON.stringify(userDirectoryDefaults());
    $('[data-users-results]').innerHTML=!model.users.length?'<div class="empty users-empty"><h3>Keine passenden Benutzer</h3><p>Suche oder Filter anpassen, um weitere Zugänge anzuzeigen.</p><button type="button" class="es-btn es-btn--sm es-btn--secondary" data-users-clear>Alle Benutzer anzeigen</button></div>':state.view==='list'?table(model.users):model.sections.map(section=>`<details class="users-group-section" data-users-section="${esc(section.id)}" ${collapsed.has(section.id)?'':'open'}><summary><span>${esc(section.name)}</span><span class="users-group-count">${section.users.length} ${section.users.length===1?'Zugang':'Zugänge'}</span></summary>${table(section.users)}</details>`).join('');
    remember();
  }
  function reset(){state=userDirectoryDefaults();collapsed.clear();for(const el of root.querySelectorAll('[data-users-field]'))el.value=state[el.dataset.usersField];draw();}
  root.querySelectorAll('[data-users-field]').forEach(el=>el.addEventListener(el.type==='search'?'input':'change',()=>{state[el.dataset.usersField]=el.value;if(el.dataset.usersField==='sort')state.direction=el.value==='login'?'desc':'asc';draw();}));
  $('[data-users-direction]').onclick=()=>{state.direction=state.direction==='asc'?'desc':'asc';draw();};$('[data-users-reset]').onclick=reset;
  root.addEventListener('toggle',e=>{if(e.target.matches('[data-users-section]')){const id=e.target.dataset.usersSection;e.target.open?collapsed.delete(id):collapsed.add(id);}},true);
  root.addEventListener('click',e=>{const group=e.target.closest('[data-users-group]'),clear=e.target.closest('[data-users-clear]'),action=e.target.closest('[data-action]');if(group){state.group=group.dataset.usersGroup;$('[data-users-field="group"]').value=state.group;draw();}else if(clear)reset();else if(action){const id=action.closest('[data-user]')?.dataset.user;if(!id)return;if(action.dataset.action==='edit-user')Promise.resolve().then(()=>onEdit(id)).catch(onError);else if(action.dataset.action==='delete-user'&&id!==userId)Promise.resolve().then(()=>onDelete(id)).catch(onError);}});
  draw();
}
