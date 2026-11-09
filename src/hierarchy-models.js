// Shared hierarchy semantics for every tree view. No source records are mutated.
export const HIERARCHY_KINDS=['hyperbolic','star','columns','sunburst','icicle'];
export const isHierarchy=kind=>HIERARCHY_KINDS.includes(kind);
export function hierarchyLevels(view){return Array.isArray(view.levels)&&view.levels.length?view.levels:[...new Set([view.x,view.series].filter(Boolean))];}
const label=v=>v===null||v===undefined||v===''?'(Ohne Angabe)':String(v);
export function buildHierarchy(data,view){
 const names=data.columns?.length?data.columns.map(c=>typeof c==='string'?c:c.name):[...new Set(data.rows.flatMap(r=>Object.keys(r)))];
 const mode=view.hierarchyMode||'levels',levels=hierarchyLevels(view),nodes=[],byId=new Map();
 const make=(id,name,parent=null)=>{if(nodes.length>=500)throw Error('Die Hierarchie enthält mehr als 500 Knoten. Bitte die Quelle filtern oder weniger Ebenen wählen.');const node={id,name,parent,children:[],value:0,records:0,depth:parent?parent.depth+1:0,branch:0};nodes.push(node);byId.set(id,node);if(parent)parent.children.push(node);return node;};
 const root=make('root','Gesamt');let missing=0;
 if(mode==='edges'){
  if(!view.x||!view.target||view.x===view.target||![view.x,view.target].every(k=>names.includes(k)))throw Error('Zwei unterschiedliche Spalten für übergeordnete und untergeordnete Knoten wählen.');
  const items=new Map(),parents=new Map(),edges=new Set(),roots=new Set();
  const item=v=>{const id=String(v);if(!items.has(id))items.set(id,make('edge:'+JSON.stringify(id),id));return items.get(id);};
  for(const row of data.rows){const a=row[view.x],b=row[view.target];if(b==null||b===''){missing++;continue;}if(a==null||a===''){const child=item(b);if(parents.has(child))throw Error('Ein Knoten ist zugleich Wurzel und Kind. Bitte die Elternzuordnung korrigieren.');roots.add(child);continue;}const parent=item(a),child=item(b);if(roots.has(child))throw Error('Ein Knoten ist zugleich Wurzel und Kind. Bitte die Elternzuordnung korrigieren.');const key=JSON.stringify([parent.id,child.id]);if(edges.has(key))continue;edges.add(key);if(parents.has(child)&&parents.get(child)!==parent)throw Error('Ein Knoten hat mehrere übergeordnete Knoten. Für solche Beziehungen das Beziehungsnetz verwenden.');parents.set(child,parent);if(view.x==='source'&&row.source_label)parent.name=String(row.source_label);if(view.target==='target'&&row.target_label)child.name=String(row.target_label);}
  if(!items.size)throw Error('Keine vollständigen Eltern-Kind-Beziehungen gefunden. Bitte Zuordnung oder Quelle prüfen.');
  // Check every component, including cycles disconnected from the roots.
  for(const node of items.values()){let p=node;const seen=new Set();while(p){if(seen.has(p))throw Error('Die Beziehungen enthalten einen Kreis. Eine Hierarchie braucht kreisfreie Eltern-Kind-Beziehungen.');seen.add(p);p=parents.get(p);}}
  for(const node of items.values()){const parent=parents.get(node)||root;node.parent=parent;parent.children.push(node);}
  function depth(node,d){if(d>12)throw Error('Die Hierarchie hat mehr als 12 Ebenen. Bitte einen kleineren Ausschnitt verwenden.');node.depth=d;for(const child of node.children)depth(child,d+1);}depth(root,0);
  for(const node of items.values())if(!node.children.length){node.value=1;node.records=1;}
 }else{
  if(!levels.length||levels.length>6||new Set(levels).size!==levels.length||!levels.every(k=>names.includes(k)))throw Error('Eine bis sechs unterschiedliche Hierarchiespalten wählen – von allgemein nach detailliert.');
  if(!['count','sum'].includes(view.aggregate))throw Error('Hierarchische Anteile brauchen eine Anzahl oder Summe. Mittelwerte lassen sich nicht zu einem Ganzen addieren.');
  if(view.aggregate==='sum'&&(!view.y||!names.includes(view.y)||levels.includes(view.y)))throw Error('Für die Gewichtung eine numerische Spalte außerhalb der Hierarchie wählen.');
  for(const row of data.rows){let node=root;const path=[];for(const level of levels){const value=label(row[level]);path.push([level,row[level]===undefined||row[level]===''?null:row[level]]);const id='path:'+JSON.stringify(path);node=byId.get(id)||make(id,value,node);}
   const value=view.aggregate==='count'?1:row[view.y];node.records++;if(value==null||value===''){missing++;continue;}if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw Error('Hierarchische Gewichte müssen endliche, nichtnegative Zahlen sein. Für negative Werte Balken verwenden.');node.value+=value;if(!Number.isFinite(node.value))throw Error('Die Gesamtsumme ist zu groß. Bitte die Einheit ändern.');
  }
 }
 function total(node){for(const child of node.children){total(child);node.value+=child.value;node.records+=child.records;}if(!Number.isFinite(node.value))throw Error('Die Gesamtsumme ist zu groß. Bitte die Einheit ändern.');}total(root);
 root.children.forEach((node,i)=>{const color=n=>{n.branch=i;for(const child of n.children)color(child);};color(node);});
 const path=node=>{const out=[];while(node){out.unshift(node);node=node.parent;}return out;};
 return {root,nodes,byId,path,mode,levels,missing,measure:mode==='edges'?'Blattknoten':view.aggregate==='count'?'Quellzeilen':view.y,depth:Math.max(...nodes.map(n=>n.depth))};
}
// A Poincaré disk isometry. The selected point maps to the center, preserving context.
export function hyperbolicFocus(z,a={x:0,y:0}){const nx=z.x-a.x,ny=z.y-a.y,dx=1-a.x*z.x-a.y*z.y,dy=a.y*z.x-a.x*z.y,d=dx*dx+dy*dy;const q={x:(nx*dx+ny*dy)/d,y:(ny*dx-nx*dy)/d},r=Math.hypot(q.x,q.y);if(r>=1){q.x*=.9999999999/r;q.y*=.9999999999/r;}return q;}
export function partitionHierarchy(root,structural=false){const positions=new Map(),weights=new Map();function weight(n){const value=n.children.length?n.children.reduce((s,c)=>s+weight(c),0):1;weights.set(n.id,value);return value;}if(structural)weight(root);function visit(n,start,end){positions.set(n.id,{start,end});let at=start;const total=n.children.reduce((sum,c)=>sum+(structural?weights.get(c.id):c.value),0);for(const child of n.children){const next=at+(total?(structural?weights.get(child.id):child.value)/total:1/n.children.length)*(end-start);visit(child,at,next);at=next;}}visit(root,0,1);return positions;}
export function hierarchyExample(){const rows=[['Medien','Redaktion','Artikel',32],['Medien','Redaktion','Podcasts',18],['Medien','Produktion','Video',24],['Medien','Produktion','Grafik',12],['Markt','Vertrieb','Direkt',28],['Markt','Vertrieb','Partner',16],['Markt','Marketing','Kampagnen',20],['Markt','Marketing','Website',14],['Betrieb','Technik','Plattform',22],['Betrieb','Technik','Support',10],['Betrieb','Personal','Entwicklung',8]].map(([bereich,team,thema,stunden])=>({bereich,team,thema,stunden}));return {source:{type:'inline',name:'Beispiel · Organisation',columns:['bereich','team','thema'].map(name=>({name,type:'text'})).concat({name:'stunden',type:'number'}),rows},view:{kind:'sunburst',purpose:'hierarchy',hierarchyMode:'levels',levels:['bereich','team','thema'],x:'bereich',series:'',target:'',y:'stunden',aggregate:'sum',title:'Organisation · Aufwand nach Bereichen',filterColumn:'',filter:''},actions:{eliminate:'',reduce:'',raise:'',create:''}};}
