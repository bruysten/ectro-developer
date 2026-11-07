import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {parser} from '@lezer/javascript';
import copy from '../app/address-copy.json' with {type:'json'};
import {ui,uiError,setAddressMode,getAddressMode,addressPreview,hasAddressCopy} from '../src/address.js';
import {studioExample} from '../src/studio-models.js';

assert.equal(getAddressMode(),'formal');assert.equal(ui('Deine Labore'),'Ihre Labore');
assert.equal(ui('Du'),'Sie');assert.equal(ui('Du-Vorlage'),'Du-Vorlage');
const userText='Ihr Profil / Deine Labore / <script>du</script>',example=studioExample('assistant'),before=JSON.stringify(example);
assert.equal(ui`<h2>Deine Labore</h2><p>${userText}</p>`,'<h2>Ihre Labore</h2><p>'+userText+'</p>');
assert.equal(ui('<p>Sie führen vorbereitete Auswertungen aus.</p>'),'<p>Sie führen vorbereitete Auswertungen aus.</p>','Third-person descriptions are not rewritten');
setAddressMode('informal');assert.equal(ui('Ihr Profil'),'Dein Profil');assert.equal(ui('Wählen Sie zuerst eine Tabelle.'),'Wähle zuerst eine Tabelle.');assert.equal(ui('Woran würdet ihr eine Verbesserung erkennen?'),'Woran würdest du eine Verbesserung erkennen?');
assert.equal(ui`<h2>Ihr Profil</h2><p>${userText}</p>`,'<h2>Dein Profil</h2><p>'+userText+'</p>');
assert.equal(uiError('Die Sicherheitsprüfung ist fehlgeschlagen. Bitte laden Sie die Seite neu.'),'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte lade die Seite neu.');
assert.equal(uiError('Provider says: Ihr Profil'),'Provider says: Ihr Profil');assert.equal(uiError('Bitte prüfen Sie das Feld „Ihr Profil“.'),'Bitte prüfe das Feld „Ihr Profil“.');
assert.equal(JSON.stringify(example),before,'Stored assistant instructions and starter data remain unchanged');
assert.equal(addressPreview('formal'),'Sie können hier lernen und ausprobieren.');assert.equal(addressPreview('informal'),'Du kannst hier lernen und ausprobieren.');
for(const mode of ['formal','informal']){setAddressMode(mode);for(const entry of copy)for(const source of [entry.formal,entry.informal,...(entry.legacy||[])])assert.equal(ui(source),entry[mode],source);}
setAddressMode('invalid');assert.equal(getAddressMode(),'formal');
// Audit owned source literals as well as the catalog. Interpolations are never
// scanned: they may contain project data, quotes or user-authored messages.
const dataModules=new Set(['address.js','studio-models.js','persona-models.js','mail-templates.js']);
let owned=0;
for(const file of readdirSync(new URL('../src/',import.meta.url)).filter(f=>f.endsWith('.js')&&!dataModules.has(f))){
  const source=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
  parser.parse(source).iterate({enter(node){
    const parent=node.node.parent;
    if(['CallExpression','TaggedTemplateExpression'].includes(node.name)&&source.slice(node.node.firstChild?.from,node.node.firstChild?.to)==='ui'){
      let scope=parent;while(scope&&scope.name!=='Script'&&!['FunctionDeclaration','FunctionExpression','ArrowFunction','MethodDeclaration'].includes(scope.name))scope=scope.parent;
      assert.notEqual(scope?.name,'Script',file+': copy must be resolved after the group mode is known, not at module import');
    }
    if(node.name==='String'){
      let value;try{value=Function('return '+source.slice(node.from,node.to))();}catch{return;}
      if(typeof value!=='string'||!hasAddressCopy(value))return;
      assert(parent?.name==='ArgList'&&source.slice(parent.parent?.firstChild?.from,parent.parent?.firstChild?.to)==='ui',file+': unmarked authored copy '+value.slice(0,100));owned++;
    }
    if(node.name==='TemplateString'){
      let start=node.from+1,parts=[];for(let n=node.node.firstChild;n;n=n.nextSibling)if(n.name==='Interpolation'){parts.push(source.slice(start,n.from));start=n.to;}parts.push(source.slice(start,node.to-1));
      if(!parts.some(hasAddressCopy))return;
      assert(parent?.name==='TaggedTemplateExpression'&&source.slice(parent.firstChild.from,parent.firstChild.to)==='ui',file+': unmarked template');owned++;
    }
  }});
}
const result=spawnSync('php',['tests/group-address.php'],{encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);process.stdout.write(result.stdout);
console.log(`${copy.length} copy pairs and ${owned} owned source literals verified; dynamic text, quoted content and third-person references preserved.`);
