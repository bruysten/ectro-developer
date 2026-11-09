import {LANDSCAPE_EXAMPLES,landscapeExampleSummary,industryLandscape} from './landscape-examples.js';
import {INDUSTRY_KEYS,industryPair} from './journey-industry-examples.js';
import {escapeHtml as e} from './studio-charts.js';
export async function openIndustryExamples(ctx,forms,{basic}={}){
 const paired=!!ctx.flags.landscape_lab&&!!ctx.flags.journey_lab&&(!ctx.info.config.tools||ctx.info.config.tools.includes('landscape')&&ctx.info.config.tools.includes('journey'));
 const keys=ctx.flags.landscape_lab&&(!ctx.info.config.tools||ctx.info.config.tools.includes('landscape'))?INDUSTRY_KEYS:[];
 await forms.open('Lernbeispiel wählen',`<p class="studio-note">Synthetische, bearbeitbare Beispiele. Branchenbeispiele werden als neue Arbeiten in diesem Projekt angelegt.</p><fieldset class="industry-examples"><legend class="sr-only">Branche</legend>${basic?'<label><input type="radio" name="industry" value="basic" checked><span><strong>Kompakter Einstieg</strong><small>Das kurze Beispiel in der aktuellen Arbeit laden.</small></span></label>':''}${keys.map((key,i)=>{const meta=LANDSCAPE_EXAMPLES[key],n=landscapeExampleSummary(key);return `<label><input type="radio" name="industry" value="${key}" ${!basic&&i===0?'checked':''}><span><strong>${e(meta.title)}</strong><small>${e(meta.scope)}</small><span>${e(meta.description)}</span><small>${n.systems} Systeme · ${n.stores} Datenbestände · ${n.flows} Datenflüsse${paired?' · verknüpfte Journey mit 7 Phasen':''}</small></span></label>`;}).join('')}</fieldset>${paired?'<p class="studio-note">Journey und Landscape werden zusammen angelegt und sind sofort miteinander verknüpft.</p>':''}`,async data=>{
  const key=data.get('industry');if(key==='basic'){await basic();return;}if(!keys.includes(key))throw Error('Bitte ein Beispiel auswählen.');
  await ctx.save();if(!ctx.alive())return;
  if(paired){const result=await ctx.api('lab.industry.create',{project:ctx.project,...industryPair(key,{blueprint:!!ctx.flags.blueprint_lab})});location.hash=(ctx.kind==='journey'?'journey-lab':'landscape-lab')+'?'+new URLSearchParams({project:ctx.project,object:result[ctx.kind==='journey'?'journey':'landscape'].id});}
  else {const result=await ctx.api('lab.save',{project:ctx.project,kind:'landscape',name:LANDSCAPE_EXAMPLES[key].title+' · Landscape',content:industryLandscape(key)});location.hash='landscape-lab?'+new URLSearchParams({project:ctx.project,object:result.object.id});}
 },'Beispiel anlegen',{freezeOnSubmit:true});
}
