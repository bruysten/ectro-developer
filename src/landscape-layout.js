import {arrangeGraph} from './graph-view.js';

export const validMapPosition=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=100000&&Math.abs(p.y)<=100000;
export const mapPosition=p=>({x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100});
const cellKey=(x,y)=>`${x}:${y}`;
function freeCell(x,y,occupied){
 for(let radius=0;;radius++)for(let dx=-radius;dx<=radius;dx++){
  const dy=radius-Math.abs(dx);
  for(const offset of dy?[dy,-dy]:[0])if(!occupied.has(cellKey(x+dx,y+offset)))return {x:x+dx,y:y+offset};
 }
}
// Topology proposes proximity; discrete slots keep circles AND their labels apart.
// This bounded heuristic is deterministic, not a claim of a global mathematical optimum.
export function arrangeLandscape(systems,flows){
 const points=arrangeGraph({nodes:systems,edges:flows}),occupied=new Set();
 const placed=points.map(p=>{const cell=freeCell(Math.round(p.x/260),Math.round(p.y/170),occupied);occupied.add(cellKey(cell.x,cell.y));return {id:p.id,x:cell.x*260,y:cell.y*170};});
 const minX=Math.min(0,...placed.map(p=>p.x)),minY=Math.min(0,...placed.map(p=>p.y));
 return placed.map(p=>({...p,x:p.x-minX+140,y:p.y-minY+100}));
}
export function landscapePositions(systems,flows,state){
 const previous=state.positions||{},positions=Object.assign(Object.create(null),Object.fromEntries(systems.filter(s=>validMapPosition(s.mapPosition)||Object.hasOwn(previous,s.id)&&validMapPosition(previous[s.id])).map(s=>[s.id,mapPosition(validMapPosition(s.mapPosition)?s.mapPosition:previous[s.id])])));
 const missing=systems.filter(s=>!Object.hasOwn(positions,s.id));
 if(missing.length){
  const proposal=arrangeLandscape(systems,flows),byId=new Map(proposal.map(p=>[p.id,p]));
  const placed=Object.values(positions);
  for(const s of missing){const p=byId.get(s.id);let candidate=p;
   // New systems must never push existing manual placements out of the way.
   for(let n=0;placed.some(q=>Math.abs(q.x-candidate.x)<250&&Math.abs(q.y-candidate.y)<150);n++)candidate={x:p.x+(n%12)*260,y:p.y+(1+Math.floor(n/12))*170};
   positions[s.id]=mapPosition(candidate);placed.push(positions[s.id]);
  }
 }
 state.positions=positions;return positions;
}
