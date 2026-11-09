export const BASKET_LIMITS={products:50,baskets:1000,rule:5};
export function basketExample(kind='clothing'){
 if(kind==='empty')return {products:[],baskets:[],rule:{antecedent:[],consequent:[]},minSupport:0,minConfidence:0,sourceLabel:'Eigene Warenkörbe'};
 const media=kind==='media',products=media?['News','Lifestyle','Tech','Display-Banner','Native Ads','Video-Ads','Affiliate Links']:['Hemd','Schuhe','Jeans','T-Shirt'];
 const values=media?[[0,3,4],[1,3,5],[0,4,6],[2,3,4],[1,5,6],[0,3,6],[2,4,5]]:Array.from({length:19},(_,i)=>[...(i<10?[0]:[]),...(i<8||i>=10&&i<14?[1]:[]),...(i%2===0||i>=14?[2]:[]),...(i%3===0?[3]:[])]);
 return {products,baskets:values.map((items,i)=>({id:String(i+1),items:items.map(i=>products[i])})),rule:{antecedent:[products[0]],consequent:[products[media?3:1]]},minSupport:0,minConfidence:0,sourceLabel:media?'Beispiel · Artikel & Werbung (synthetisch)':'Beispiel · Modekäufe (synthetisch)'};
}
export function basketMetrics(content,limit=content.baskets.length){
 const {antecedent:a,consequent:b}=content.rule,valid=a.length>0&&b.length>0&&!a.some(x=>b.includes(x));
 const rows=content.baskets.slice(0,limit).map(row=>({row,a:valid&&a.every(x=>row.items.includes(x)),b:valid&&b.every(x=>row.items.includes(x))}));
 const n=rows.length,na=rows.filter(r=>r.a).length,nb=rows.filter(r=>r.b).length,both=rows.filter(r=>r.a&&r.b).length;
 return {valid,rows,n,na,nb,both,support:valid&&n?both/n:null,confidence:valid&&na?both/na:null,baseline:valid&&n?nb/n:null,lift:valid&&na&&nb?both*n/(na*nb):null};
}
export function basketPairRules(content){
 const counts=new Map(content.products.map(p=>[p,0])),pairs=new Map();
 for(const row of content.baskets){const items=[...new Set(row.items)];for(const a of items){counts.set(a,(counts.get(a)||0)+1);for(const b of items)if(a!==b){const key=JSON.stringify([a,b]);pairs.set(key,(pairs.get(key)||0)+1);}}}
 const n=content.baskets.length,out=[];
 for(const a of content.products)for(const b of content.products){if(a===b)continue;const both=pairs.get(JSON.stringify([a,b]))||0,na=counts.get(a),nb=counts.get(b);if(!both||!n||!na||!nb)continue;const support=both/n,confidence=both/na;if(support+1e-12<content.minSupport/100||confidence+1e-12<content.minConfidence/100)continue;out.push({a,b,both,support,confidence,lift:both*n/(na*nb)});}
 return out.sort((a,b)=>b.lift-a.lift||b.both-a.both||a.a.localeCompare(b.a,'de')||a.b.localeCompare(b.b,'de'));
}
// Import a complete snapshot; never infer false from an unknown matrix value or count line quantities as baskets.
export function basketsFromTable(data,{format='lines',basketColumn='',productColumn='',productColumns=[]}={}){
 if(data.truncated)throw Error('Die Quelle ist nur ein Ausschnitt. Bitte einen vollständigen Datensatz bis 1.000 Zeilen verwenden, damit Warenkörbe nicht unbemerkt geteilt werden.');
 if(!Array.isArray(data.rows)||!data.rows.length||data.rows.length>BASKET_LIMITS.baskets)throw Error('Bitte 1–1.000 vollständige Quellzeilen verwenden.');
 const columns=new Set(data.columns.map(c=>c.name)),groups=new Map(),products=[];
 const scalar=v=>{if(!['string','number'].includes(typeof v)||!String(v).trim()||[...String(v).trim()].length>80||/[\x00-\x1f\x7f]/.test(String(v))||['__proto__','constructor','prototype'].includes(String(v).trim())||typeof v==='number'&&!Number.isFinite(v))throw Error('Warenkorb-IDs und Artikelnamen benötigen Text oder Zahlen mit 1–80 Zeichen.');return String(v).trim();};
 const product=v=>{v=scalar(v);if(!products.includes(v))products.push(v);return v;};
 if(format==='lines'){
  if(!columns.has(basketColumn)||!columns.has(productColumn)||basketColumn===productColumn)throw Error('Bitte unterschiedliche Spalten für Warenkorb-ID und Artikel auswählen.');
  for(const row of data.rows){const id=scalar(row[basketColumn]),p=product(row[productColumn]);if(!groups.has(id))groups.set(id,new Set());groups.get(id).add(p);}
 }else if(format==='matrix'){
  if(!productColumns.length||new Set(productColumns).size!==productColumns.length||productColumns.some(p=>!columns.has(p))||basketColumn&&(!columns.has(basketColumn)||productColumns.includes(basketColumn)))throw Error('Artikelspalten und optional eine getrennte ID-Spalte auswählen.');
  for(const p of productColumns)product(p);
  for(const [i,row] of data.rows.entries()){const id=basketColumn?scalar(row[basketColumn]):String(i+1);if(groups.has(id))throw Error('In einer Artikelmatrix muss jede Warenkorb-ID eindeutig sein.');const items=new Set();for(const [j,p] of productColumns.entries()){const v=row[p];if(![0,1,true,false,'0','1','true','false'].includes(v))throw Error('Artikelmatrix: „'+p+'“, Zeile '+(i+1)+' benötigt 0/1 oder true/false.');if([1,true,'1','true'].includes(v))items.add(products[j]);}groups.set(id,items);}
 }else throw Error('Unbekanntes Tabellenformat.');
 if(products.length>BASKET_LIMITS.products||new Set(products).size!==products.length)throw Error('Bitte höchstens 50 unterschiedliche, eindeutig benannte Artikel verwenden.');
 return {products,baskets:[...groups].map(([id,items])=>({id,items:[...items]})),rule:{antecedent:products.slice(0,1),consequent:products.slice(1,2)},minSupport:0,minConfidence:0,sourceLabel:[...(data.name||'Übernommene Daten')].slice(0,180).join('')};
}
