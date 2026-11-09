export const REGRESSION_LIMITS={points:1000,value:1e8,coefficient:1e12};
// Constructed teaching data: plausible operating scenarios, never company observations or benchmarks.
export const REGRESSION_PRACTICE={
 publishing:{title:'Verlag & Medien · Newsletter und Probeabos',question:'Wie viele neue Probeabos sind bei 4.500 Newsletter-Klicks zu erwarten?',unit:'Ein Punkt = eine Newsletter-Kampagne. X zählt eindeutige Klicks in Tausend, Y die dieser Kampagne zugeordneten neuen Probeabos innerhalb von sieben Tagen.',scope:'Fiktiver deutscher Fachmedienverlag: gleiches Digitalabo-Angebot, gleicher Probezeitraum und einheitliche Zuordnungsregel. Keine echten Kampagnen- oder Kundendaten.',experiment:'Beste Gerade finden und bei X = 4,5 schätzen. Danach eine schwache Kampagne auswählen: Wie stark weicht sie ab? Zielgruppe, Inhalt und Saison können den Zusammenhang verändern; Klicks allein belegen keine Abo-Wirkung.',xLabel:'Newsletter-Klicks (Tsd.)',yLabel:'Neue Probeabos (7 Tage)',pointLabel:'Kampagne',predictionX:4.5,data:[[.8,13],[1.2,24],[1.7,22],[2.1,37],[2.6,48],[3.0,39],[3.6,67],[4.0,54],[4.7,82],[5.2,72],[5.8,102],[6.4,91],[7.1,123],[8.0,117]]},
 industry:{title:'Deutsche Industrie · Losgröße und Maschinenzeit',question:'Wie lange belegt ein Los mit 450 Teilen die Maschine?',unit:'Ein Punkt = ein abgeschlossenes Fertigungslos. X ist die Stückzahl, Y die protokollierte Maschinenbelegungszeit in Stunden einschließlich Rüsten.',scope:'Fiktiver deutscher Maschinenbau-Zulieferer: dieselbe Teilefamilie, Maschine und Bearbeitungsfolge; vergleichbare Material- und Qualitätsanforderungen. Keine realen Betriebsdaten.',experiment:'Beste Gerade finden und bei X = 450 schätzen. Die Steigung zeigt zusätzliche Stunden je Teil; der Achsenabschnitt kann einen festen Zeitanteil andeuten, ist aber keine gemessene Rüstzeit. Störungen, Materialwechsel oder Kapazitätsgrenzen begrenzen die Übertragbarkeit.',xLabel:'Losgröße (Stück)',yLabel:'Maschinenzeit (Std.)',pointLabel:'Fertigungslos',predictionX:450,data:[[80,6.4],[120,8.7],[160,8.9],[210,12.4],[260,12.7],[320,16.3],[380,16.6],[440,20.9],[510,21.0],[590,26.3],[680,27.1],[780,33.8]]},
 insurance:{title:'Versicherung · Schadenfälle und Bearbeitungsaufwand',question:'Wie viele Bearbeitungsstunden sind für 450 vergleichbare Glasschäden einzuplanen?',unit:'Ein Punkt = eine abgeschlossene Teamwoche. X zählt bearbeitete Kfz-Glasschäden, Y die dafür erfassten Netto-Bearbeitungsstunden des Teams.',scope:'Fiktiver deutscher Kompositversicherer: gleiches Standardverfahren und vergleichbarer Fallmix. Erfasst sind Prüfung, Rückfragen und Abschluss; Kalenderwartezeiten, Urlaub und andere Aufgaben gehören nicht zu Y.',experiment:'Beste Gerade finden und bei X = 450 schätzen. Stunden sind noch keine Personalstellen: Arbeitszeit und weitere Aufgaben fehlen. Komplexere Fälle oder Prozesswechsel können den Aufwand ändern. Das Beispiel dient der Ablaufplanung, nicht der Bewertung einzelner Versicherter.',xLabel:'Kfz-Glasschäden (Fälle)',yLabel:'Bearbeitungszeit (Std.)',pointLabel:'Teamwoche',predictionX:450,data:[[110,84],[150,119],[190,123],[230,162],[280,170],[320,220],[370,227],[410,270],[460,278],[500,328],[550,332],[610,391],[660,405],[720,454]]},
};
export const REGRESSION_EXAMPLES={books:'Alter & Bücherbudget · 5 Punkte',negative:'Liefermenge & Stückkosten · fallender Verlauf',curve:'Kurve statt Gerade · Modellgrenze',empty:'Leer beginnen',...Object.fromEntries(Object.entries(REGRESSION_PRACTICE).map(([key,s])=>[key,s.title+' · '+s.data.length+' Punkte']))};
const sum=values=>{let s=0,c=0;for(const x of values){const y=x-c,t=s+y;c=(t-s)-y;s=t;}return s;};
export function regressionExample(key='books'){
 if(Object.hasOwn(REGRESSION_PRACTICE,key)){const s=REGRESSION_PRACTICE[key],points=s.data.map(([x,y],i)=>({id:String(i+1),label:s.pointLabel+' '+String(i+1).padStart(2,'0'),x,y,included:true}));return {example:key,points,xLabel:s.xLabel,yLabel:s.yLabel,sourceLabel:s.title+' · synthetische Übungsdaten',line:{slope:0,intercept:sum(points.map(p=>p.y))/points.length},mode:'manual',predictionX:s.predictionX,showResiduals:true,showSquares:false};}
 const data=key==='empty'?[]:key==='negative'?[[1,90],[2,70],[3,66],[4,55],[5,40],[6,38]]:key==='curve'?[-3,-2,-1,0,1,2,3].map(x=>[x,x*x]):[[16,20],[23,25],[37,50],[52,55],[80,80]];
 const points=data.map(([x,y],i)=>({id:String(i+1),label:'Beobachtung '+(i+1),x,y,included:true}));
 return {points,xLabel:key==='negative'?'Liefermenge':['curve','empty'].includes(key)?'X':'Alter (Jahre)',yLabel:key==='negative'?'Stückkosten (€)':['curve','empty'].includes(key)?'Y':'Bücherbudget (€ / Monat)',sourceLabel:key==='empty'?'Eigene Daten':'Synthetisches Lernbeispiel',line:{slope:0,intercept:points.length?sum(points.map(p=>p.y))/points.length:0},mode:'manual',predictionX:key==='books'?44:0,showResiduals:true,showSquares:false};
}
export function regressionFit(points){
 const active=points.filter(p=>p.included),n=active.length;
 if(!n)return {n,valid:false,reason:'Mindestens zwei eingeschlossene Punkte werden benötigt.'};
 // Shift before averaging; centered sums avoid cancellation for large offsets.
 const ox=active[0].x,oy=active[0].y,meanX=ox+sum(active.map(p=>p.x-ox))/n,meanY=oy+sum(active.map(p=>p.y-oy))/n;
 const rows=active.map(p=>({point:p,dx:p.x-meanX,dy:p.y-meanY}));
 for(const r of rows){r.xx=r.dx*r.dx;r.xy=r.dx*r.dy;}
 const sxx=sum(rows.map(r=>r.xx)),sxy=sum(rows.map(r=>r.xy)),syy=sum(rows.map(r=>r.dy*r.dy));
 const base={n,meanX,meanY,rows,sxx,sxy,syy,minX:Math.min(...active.map(p=>p.x)),maxX:Math.max(...active.map(p=>p.x))};
 if(n<2||sxx===0)return {...base,valid:false,reason:n<2?'Mindestens zwei eingeschlossene Punkte werden benötigt.':active.every(p=>p.x===active[0].x)?'Alle X-Werte sind gleich. Eine eindeutige Steigung lässt sich daraus nicht bestimmen.':'Die X-Unterschiede sind numerisch zu klein. Bitte passendere Einheiten verwenden.'};
 if(syy===0&&active.some(p=>p.y!==active[0].y))return {...base,valid:false,reason:'Die Y-Unterschiede sind numerisch zu klein. Bitte passendere Einheiten verwenden.'};
 const slope=sxy/sxx,intercept=meanY-slope*meanX;
 if(!Number.isFinite(slope)||!Number.isFinite(intercept)||Math.abs(slope)>REGRESSION_LIMITS.coefficient||Math.abs(intercept)>REGRESSION_LIMITS.coefficient)return {...base,valid:false,reason:'Die Größenordnungen liegen zu weit auseinander. Bitte die X- und Y-Werte in passendere Einheiten umrechnen.'};
 const residuals=active.map(p=>({point:p,predicted:meanY+slope*(p.x-meanX),residual:p.y-(meanY+slope*(p.x-meanX))}));
 const sse=sum(residuals.map(r=>r.residual**2)),r2=syy===0?null:Math.max(0,Math.min(1,1-sse/syy));
 return {...base,valid:true,slope,intercept,sse,r2,rmse:Math.sqrt(sse/n),residuals};
}
export function regressionLine(content,fit=regressionFit(content.points)){return content.mode==='fit'?(fit.valid?{slope:fit.slope,intercept:fit.intercept}:null):content.line;}
export function regressionPredict(content,x,fit=regressionFit(content.points)){
 const line=regressionLine(content,fit);if(!line)return null;return content.mode==='fit'&&fit.valid?fit.meanY+fit.slope*(x-fit.meanX):line.intercept+line.slope*x;
}
export function regressionErrors(content,fit=regressionFit(content.points)){
 if(!regressionLine(content,fit))return {rows:[],sse:null,rmse:null};
 const rows=content.points.filter(p=>p.included).map(point=>{const predicted=regressionPredict(content,point.x,fit),residual=point.y-predicted;return {point,predicted,residual,square:residual*residual};});
 const sse=sum(rows.map(r=>r.square));return {rows,sse,rmse:rows.length?Math.sqrt(sse/rows.length):null};
}
export function regressionBounds(points){
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y);let xmin=xs.length?Math.min(...xs):0,xmax=xs.length?Math.max(...xs):10,ymin=ys.length?Math.min(...ys):0,ymax=ys.length?Math.max(...ys):10;
 const dx=xmax-xmin||Math.max(1,Math.abs(xmin)*.1),dy=ymax-ymin||Math.max(1,Math.abs(ymin)*.1);
 return {xmin:xmin-dx*.18,xmax:xmax+dx*.18,ymin:ymin-dy*.18,ymax:ymax+dy*.18};
}
export function regressionFromTable(data,{xColumn,yColumn,labelColumn=''}){
 const columns=data.columns.map(c=>c.name);
 if(!columns.includes(xColumn)||!columns.includes(yColumn)||xColumn===yColumn||labelColumn&&!columns.includes(labelColumn))throw Error('Bitte unterschiedliche X- und Y-Spalten auswählen.');
 if(data.truncated)throw Error('Die Quelle ist nur ein Ausschnitt. Bitte eine vollständige Tabelle bis 1.000 Zeilen verwenden.');
 if(!data.rows.length||data.rows.length>REGRESSION_LIMITS.points)throw Error('Bitte 1–1.000 vollständige Datenzeilen verwenden.');
 const numeric=(v,column,i)=>{if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>REGRESSION_LIMITS.value)throw Error('„'+column+'“, Zeile '+(i+1)+': eine Zahl zwischen −100.000.000 und +100.000.000 wird benötigt. Fehlende Werte werden nicht als 0 behandelt.');return v;};
 const points=data.rows.map((r,i)=>({id:String(i+1),label:labelColumn?[...String(r[labelColumn]??'Beobachtung '+(i+1))].slice(0,80).join(''):'Beobachtung '+(i+1),x:numeric(r[xColumn],xColumn,i),y:numeric(r[yColumn],yColumn,i),included:true}));
 const next={...regressionExample('empty'),points,xLabel:[...xColumn].slice(0,80).join(''),yLabel:[...yColumn].slice(0,80).join(''),sourceLabel:[...(data.name||'Übernommene Daten')].slice(0,180).join('')};const fit=regressionFit(points);next.line.intercept=fit.meanY||0;next.predictionX=points[0].x;return next;
}
