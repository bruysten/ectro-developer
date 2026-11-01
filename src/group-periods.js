export const GROUP_PERIOD_FIELDS=['access_start','access_end','course_start','course_end'];
export const periodValues=periods=>Object.fromEntries(GROUP_PERIOD_FIELDS.map(k=>[k,periods?.[k]||'']));
export const readGroupPeriods=data=>Object.fromEntries(GROUP_PERIOD_FIELDS.map(k=>[k,data.get(k)||null]));
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number(value.slice(0,4))>0&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export function groupPeriodErrors(periods){
  const p=periodValues(periods),errors={};
  for(const k of GROUP_PERIOD_FIELDS)if(p[k]&&!validDate(p[k]))errors[k]='Bitte ein gültiges Kalenderdatum eingeben.';
  if(Object.keys(errors).length)return errors;
  if(p.access_start&&p.access_end&&p.access_start>p.access_end)errors.access_end='„Zugriff bis“ darf nicht vor „Zugriff ab“ liegen.';
  if(!!p.course_start!==!!p.course_end)errors[p.course_start?'course_end':'course_start']='Bitte Kursbeginn und Kursende angeben.';
  if(p.course_start&&p.course_end){
    if(p.course_start>p.course_end)errors.course_end='Das Kursende darf nicht vor dem Kursbeginn liegen.';
    if(p.access_start&&p.course_start<p.access_start)errors.course_start='Der Kursbeginn muss innerhalb des Zugriffszeitraums liegen.';
    if(p.access_end&&p.course_end>p.access_end)errors.course_end='Das Kursende muss innerhalb des Zugriffszeitraums liegen.';
  }
  return errors;
}
export function groupPeriodForm(periods,esc){
  const p=periodValues(periods),date=(label,key)=>`<label class="field"><span>${label}</span><input name="${key}" type="date" value="${esc(p[key])}" min="0001-01-01" max="9999-12-31"></label>`;
  return `<div class="group-period-form"><fieldset><legend>Zugriffszeitraum</legend><p class="lab-hint">Leer = keine zeitliche Grenze.</p><div class="form-grid">${date('Zugriff ab','access_start')}${date('Zugriff bis','access_end')}</div></fieldset><fieldset><legend>Kurszeitraum</legend><p class="lab-hint">Optional. Kursbeginn und Kursende müssen innerhalb des Zugriffszeitraums liegen.</p><div class="form-grid">${date('Kursbeginn','course_start')}${date('Kursende','course_end')}</div></fieldset><p class="group-period-hint">Alle Angaben gelten tageweise in Europe/Berlin. Der Endtag ist eingeschlossen.</p><p class="notice">Bei Gruppenzuordnung benötigt der gesamte Lernzugang mindestens einen offenen Zugriffszeitraum. Administratoren sind ausgenommen.</p></div>`;
}
export function bindGroupPeriods(root){
  const fields=Object.fromEntries(GROUP_PERIOD_FIELDS.map(k=>[k,root.querySelector(`[name="${k}"]`)]));
  const update=()=>{const p=Object.fromEntries(GROUP_PERIOD_FIELDS.map(k=>[k,fields[k].value])),errors=groupPeriodErrors(p);for(const k of GROUP_PERIOD_FIELDS)fields[k].setCustomValidity(errors[k]||'');fields.course_start.required=!!p.course_end;fields.course_end.required=!!p.course_start;};
  for(const field of Object.values(fields))field.addEventListener('input',update);update();
}
const dateLabel=date=>date?date.slice(8,10)+'.'+date.slice(5,7)+'.'+date.slice(0,4):'';
export function groupPeriodsSummary(periods,esc){
  const p=periods||{},range=(start,end)=>start&&end?dateLabel(start)+' – '+dateLabel(end):start?'ab '+dateLabel(start):end?'bis '+dateLabel(end):'Unbefristet';
  const state=['scheduled','expired','active','unlimited'].includes(p.state)?p.state:'unlimited';
  return `<div class="group-period-summary"><span class="tag group-period-state ${state}">${{scheduled:'Geplant',expired:'Beendet',active:'Aktiv',unlimited:'Unbefristet'}[state]}</span><dl><div><dt>Zugriff</dt><dd>${esc(range(p.access_start,p.access_end))}</dd></div>${p.course_start||p.course_end?'<div><dt>Kurs</dt><dd>'+esc(range(p.course_start,p.course_end))+'</dd></div>':''}</dl></div>`;
}
