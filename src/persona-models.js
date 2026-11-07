export const PERSONA_MODELS={
 simple:{label:'Kurzprofil',level:'Einfach',hint:'Ziel, Situation, Bedürfnisse und Hürden für einen schnellen Einstieg.',sections:[]},
 behavioral:{label:'Ziele & Verhalten',level:'Vertieft',hint:'Verstehen, wie die Person handelt und was sie dabei braucht.',sections:['behavior']},
 jobs:{label:'Jobs-to-be-done',level:'Fokussiert',hint:'Auslöser, Aufgabe und gewünschter Fortschritt statt einer Merkmalsliste.',sections:['jobs']},
 empathy:{label:'Empathieprofil',level:'Fokussiert',hint:'Aussagen, Handlungen, Gedanken und Gefühle nachvollziehbar trennen.',sections:['empathy']},
 complete:{label:'Umfassendes Profil',level:'Umfassend',hint:'Verhalten, Aufgaben und Empathie mit Rahmenbedingungen und Belegen verbinden.',sections:['behavior','jobs','empathy','context']},
};
export const PERSONA_BASIS={assumption:'Annahme',mixed:'Teilweise belegt',supported:'Mit Belegen'};
export const PERSONA_FIELDS={
 needs:['Bedürfnisse','Was braucht diese Person, um ihr Ziel zu erreichen?'],barriers:['Hürden','Was hält sie auf?'],
 motivation:['Motivation','Warum ist ihr das Ziel wichtig?'],behavior:['Typisches Verhalten','Was tut sie heute tatsächlich?'],channels:['Kanäle & Kontakt','Wo sucht sie Hilfe oder Informationen?'],skills:['Kenntnisse','Welche Erfahrung bringt sie mit?'],
 trigger:['Auslöser','In welcher Situation entsteht der Bedarf?'],job:['Aufgabe','Was möchte sie erledigen?'],success:['Erfolgskriterium','Woran erkennt sie einen gelungenen Fortschritt?'],alternatives:['Heutige Alternativen','Wie löst sie die Aufgabe bisher?'],
 says:['Sagt','Dokumentierte Aussagen; Zitate mit Quelle festhalten.'],does:['Tut','Beobachtbare Handlungen.'],thinks:['Denkt','Vermutete oder belegte Gedanken als solche kennzeichnen.'],feels:['Fühlt','Gefühle aus Beobachtungen ableiten; Unsicherheit festhalten.'],
 role:['Rolle & Entscheidungen','Welche Rolle spielt sie bei Auswahl und Nutzung?'],constraints:['Rahmenbedingungen','Zeit, Budget oder organisatorische Bedingungen.'],access:['Zugänglichkeit & Unterstützung','Welche Anforderungen an Bedienung und Unterstützung gibt es?'],questions:['Offene Fragen','Was müssen wir als Nächstes untersuchen?'],
};
export const PERSONA_SECTIONS={behavior:{label:'Ziele & Verhalten',fields:['motivation','behavior','channels','skills']},jobs:{label:'Aufgabe & Fortschritt',fields:['trigger','job','success','alternatives']},empathy:{label:'Empathie',fields:['says','does','thinks','feels']},context:{label:'Rahmen & offene Fragen',fields:['role','constraints','access','questions']}};
export function personaDraft(input={}){
 input=input&&typeof input==='object'?input:{};
 return {name:typeof input.name==='string'?input.name:'',tagline:typeof input.tagline==='string'?input.tagline:'',goal:typeof input.goal==='string'?input.goal:'',context:typeof input.context==='string'?input.context:'',model:Object.hasOwn(PERSONA_MODELS,input.model)?input.model:'simple',basis:Object.hasOwn(PERSONA_BASIS,input.basis)?input.basis:'assumption',fields:Object.fromEntries(Object.keys(PERSONA_FIELDS).map(key=>[key,typeof input.fields?.[key]==='string'?input.fields[key]:''])),evidence:Array.isArray(input.evidence)?input.evidence.filter(item=>item&&typeof item==='object').map(item=>({source:typeof item.source==='string'?item.source:'',note:typeof item.note==='string'?item.note:''})):[]};
}
export function personaInitials(name){return String(name||'').split(/[·|—]/)[0].trim().split(/\s+/).filter(word=>/[\p{L}\p{N}]/u.test(word)).slice(0,2).map(word=>[...word][0]||'').join('').toLocaleUpperCase('de')||'?';}
export function applyPersonaToJourney(journey,profile){
 const content=personaDraft(profile.content);return {...journey,persona:{name:content.name,goal:content.goal,context:content.context},personaRef:{id:profile.id,version:profile.version},personaSnapshot:structuredClone(content)};
}
export function personaComparison(profiles,onlyDifferences=false){
 const keys=['goal','context','needs','barriers',...new Set(profiles.flatMap(p=>PERSONA_MODELS[p.content.model]?.sections.flatMap(s=>PERSONA_SECTIONS[s].fields)||[])),...Object.keys(PERSONA_FIELDS).filter(key=>profiles.some(p=>p.content.fields?.[key]?.trim()))];
 return [...new Set(keys)].map(key=>({key,label:({goal:'Übergeordnetes Ziel',context:'Situation & Kontext'})[key]||PERSONA_FIELDS[key]?.[0]||key,values:profiles.map(p=>String(p.content[key]??p.content.fields?.[key]??'').trim())})).filter(row=>!onlyDifferences||new Set(row.values).size>1);
}
export function personaExample(alternate=false){return personaDraft(alternate?{name:'Sam · Weiterbildung im Team',tagline:'Organisiert den Transfer ins Team',goal:'Eine Weiterbildung auswählen, die dem Team im Alltag hilft.',context:'Vergleicht Angebote und stimmt Zeit und Budget mit anderen ab.',model:'behavioral',fields:{needs:'Klare Lernziele und ein planbarer Transfer.',barriers:'Abstimmung und unklarer Nutzen.',motivation:'Gemeinsam bessere Entscheidungen treffen.',behavior:'Vergleicht Inhalte, bespricht Beispiele im Team.',channels:'Kursseite, Beratung, Teamgespräch.',skills:'Kennt den Arbeitsalltag, wenig Zeit für Detailrecherche.'}}:{name:'Alex · berufliche Weiterbildung',tagline:'Will schnell ins Anwenden kommen',goal:'Eine passende Weiterbildung finden und das Gelernte im Alltag anwenden.',context:'Wenig Zeit, unterschiedliche Vorkenntnisse, möchte den Nutzen vorab verstehen.',fields:{needs:'Verständlicher Einstieg und konkrete Beispiele.',barriers:'Zu viele Möglichkeiten und unklare Voraussetzungen.'}});}
