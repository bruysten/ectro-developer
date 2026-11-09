export const ARCHIVE_STATUS={current:'Aktuell',draft:'Ungeprüft',superseded:'Überholt'};
export const ARCHIVE_CLASSES={unknown:'Noch offen',public:'Öffentlich',internal:'Intern',confidential:'Vertraulich'};
export const archiveNormalize=text=>String(text).normalize('NFKC').toLocaleLowerCase('de').replace(/\s+/gu,' ').trim();
export function archiveDocument(values={}){return {id:crypto.randomUUID(),title:'',filename:'',text:'',owner:'',source:'',date:'',tags:[],status:'draft',classification:'unknown',note:'',...values};}
export function archiveExample(){return {documents:[
 archiveDocument({id:'handbuch',filename:'scan_017.txt',title:'Rücksendungen · gültiger Ablauf',text:'Rücksendungen werden im Kundenportal angemeldet. Nach Prüfung erhalten Kunden ein Versandetikett. Die Bearbeitung dauert fünf Werktage.',tags:['Retoure','Reklamation','Kundenservice'],owner:'Service-Team',source:'Synthetisches Prozesshandbuch, Abschnitt 4',date:'2026-10-01',status:'current',classification:'internal'}),
 archiveDocument({id:'alt',filename:'ablauf_final_alt.txt',title:'Rücksendungen · alter Ablauf',text:'Rücksendungen werden per E-Mail angemeldet. Die Bearbeitung dauert zehn Werktage.',owner:'Service-Team',source:'Synthetisches Prozesshandbuch, alte Ausgabe',date:'2024-01-01',status:'superseded',classification:'internal'}),
 archiveDocument({id:'kopie',filename:'kopie_017.txt',text:'Rücksendungen werden im Kundenportal angemeldet. Nach Prüfung erhalten Kunden ein Versandetikett. Die Bearbeitung dauert fünf Werktage.'}),
 archiveDocument({id:'protokoll',filename:'notizen_03.txt',title:'Kundenportal · Verbesserungsideen',text:'Im Workshop wurde ein einfacherer Einstieg für Reklamationen vorgeschlagen. Die Idee ist noch nicht beschlossen.',tags:['Portal','Ideen'],status:'draft'}),
 archiveDocument({id:'scan',filename:'rechnung_scan.pdf',title:'Rechnung · Scan ohne Textebene',source:'Synthetisches Beispiel: nur ein Bild vorhanden',classification:'confidential',note:'Texterschließung steht noch aus. Dieses Beispiel enthält absichtlich keinen Text.'}),
 ]};}
export function archiveIssues(doc){return [!doc.title.trim()&&'Titel fehlt',!doc.text.trim()&&'Text fehlt',!doc.tags.length&&'Schlagwörter fehlen',!doc.owner.trim()&&'Zuständigkeit fehlt',!doc.source.trim()&&'Herkunft fehlt',!doc.date&&'Stand fehlt',doc.classification==='unknown'&&'Vertraulichkeit offen'].filter(Boolean);}
export function archiveSourceText(doc){return `# ${doc.title||doc.filename||'Ohne Titel'}\n\nHerkunft: ${doc.source||'offen'}\nStand: ${doc.date||'offen'}\nStatus: ${ARCHIVE_STATUS[doc.status]}\nSchlagwörter: ${doc.tags.join(', ')}\n\n${doc.text}`;}
export function archiveRagContent(doc){return {text:archiveSourceText(doc),source:(doc.title||doc.filename||'Archivdokument').slice(0,180),size:600,overlap:80,chunks:[],question:'',hits:[],selected:[],answer:''};}
export function archiveDuplicates(documents){const groups=new Map();for(const d of documents){const key=archiveNormalize(d.text);if(!key)continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(d.id);}return [...groups.values()].filter(g=>g.length>1);}
export function archiveSearch(documents,query,{mode='enriched',currentOnly=false,classification=''}={}){
 const terms=[...new Set(archiveNormalize(query).split(/[^\p{L}\p{N}]+/u).filter(Boolean))];
 if(!terms.length)return [];
 const fields=mode==='filename'?[['filename','Dateiname',1]]:[['title','Titel',4],['tags','Schlagwörter',3],['text','Inhalt',1],['filename','Dateiname',1]];
 return documents.filter(d=>(!currentOnly||d.status==='current')&&(!classification||d.classification===classification)).flatMap(doc=>{
  const matched=new Set(),reasons=[];let score=0;
  for(const [key,label,weight] of fields){const value=archiveNormalize(Array.isArray(doc[key])?doc[key].join(' '):doc[key]);const hits=terms.filter(t=>value.includes(t));if(hits.length){hits.forEach(t=>matched.add(t));score+=hits.length*weight;reasons.push({field:key,label,terms:hits});}}
  if(matched.size!==terms.length)return [];
  const text=doc.text,position=Math.max(0,...terms.map(t=>archiveNormalize(text).indexOf(t)).filter(p=>p>=0).slice(0,1)),start=Math.max(0,position-55);
  return [{doc,score,reasons,snippet:(start?'… ':'')+text.slice(start,start+240)+(text.length>start+240?' …':'')}];
 }).sort((a,b)=>b.score-a.score||a.doc.id.localeCompare(b.doc.id));
}
