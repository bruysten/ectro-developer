import {GRAPH_TYPE_ICONS,GRAPH_TYPE_COLORS,graphTypeAppearance} from './graph-model.js';

export function graphTypeFields({esc,icon},type={}){
  const style=graphTypeAppearance(type);
  return `<section data-type-editor class="graph-type-editor"><label class="field"><span>Name des Knotentyps</span><input name="type-name" required maxlength="80" value="${esc(type.name||'')}" placeholder="z. B. Person"></label><div class="graph-type-preview" data-type-preview style="--graph-type-color:${style.color};--graph-type-ink:${style.ink}"><span class="graph-type-symbol" data-type-preview-icon>${icon(style.icon)}</span><div><strong data-type-preview-name>${esc(type.name||'Knotentyp')}</strong><code data-type-preview-code>${style.color.toUpperCase()}</code></div></div><fieldset class="graph-icon-picker"><legend>Icon</legend><div>${GRAPH_TYPE_ICONS.map(([id,label])=>`<label title="${label}"><input type="radio" name="type-icon" value="${id}" ${id===style.icon?'checked':''} required><span>${icon(id)}<span>${label}</span></span></label>`).join('')}</div></fieldset><label class="field graph-color-field"><span>Farbe</span><input name="type-color" type="color" value="${style.color}"></label><div class="graph-color-swatches" role="group" aria-label="Farbpalette">${GRAPH_TYPE_COLORS.map(([color,label])=>`<button type="button" data-type-color="${color}" style="--swatch-color:${color}" aria-label="${label}" aria-pressed="${color===style.color}"></button>`).join('')}</div></section>`;
}
export function bindGraphTypeFields(dialog){
  const section=dialog.querySelector('[data-type-editor]');if(!section)return;
  const name=section.querySelector('[name="type-name"]'),color=section.querySelector('[name="type-color"]'),preview=section.querySelector('[data-type-preview]');
  function render(){
    const style=graphTypeAppearance({name:name.value,color:color.value,icon:section.querySelector('[name="type-icon"]:checked')?.value});
    preview.style.setProperty('--graph-type-color',style.color);preview.style.setProperty('--graph-type-ink',style.ink);
    section.querySelector('[data-type-preview-icon] .icon').textContent=style.icon;
    section.querySelector('[data-type-preview-name]').textContent=name.value.trim()||'Knotentyp';
    section.querySelector('[data-type-preview-code]').textContent=style.color.toUpperCase();
    section.querySelectorAll('[data-type-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.typeColor===style.color)));
  }
  section.addEventListener('input',render);section.addEventListener('change',render);
  section.querySelectorAll('[data-type-color]').forEach(b=>b.onclick=()=>{color.value=b.dataset.typeColor;render();});
  render();
}
export function graphTypeFormValue(data){return {name:data.get('type-name'),icon:data.get('type-icon'),color:data.get('type-color')};}
