export function dataLabAccess(flags){return {datasets:!!(flags.files&&flags.data_lab),convert:!!flags.converter};}
export function dataLabView(flags,params){
  const access=dataLabAccess(flags),requested=params.get('view')==='convert'||(!params.has('view')&&params.get('tab')==='convert')?'convert':'datasets';
  return access[requested]?requested:access.datasets?'datasets':access.convert?'convert':null;
}
export function dataLabHref(view,{project='',object=''}={}){
  const params=new URLSearchParams({view});if(project)params.set('project',project);if(object)params.set('object',object);
  return '#data-lab?'+params;
}
export function legacyConverterHash(hash){
  if(hash.slice(1).split('?')[0]!=='converter')return hash;
  const params=new URLSearchParams(hash.split('?')[1]||'');params.set('view','convert');return '#data-lab?'+params;
}
export function dataLabNavigation(flags,view,context,esc){
  const access=dataLabAccess(flags);
  return `<nav class="lab-section-nav" aria-label="Daten-Labor Bereiche">${[['datasets','Datensätze','table_chart'],['convert','Umwandeln','swap_horiz']].filter(([key])=>access[key]).map(([key,label,icon])=>`<a href="${esc(dataLabHref(key,context))}" ${view===key?'aria-current="page"':''}><span class="icon" aria-hidden="true">${icon}</span><span>${label}</span></a>`).join('')}</nav>`;
}
