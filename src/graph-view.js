export const GRAPH_NODE_RADIUS=35;

// Imported nodes without coordinates must use the same position everywhere.
export function graphNodePosition(node,index){
  return {x:node.x??100+index*90,y:node.y??200};
}

export function graphEdgeOffsets(graph){
  const groups=new Map(),offsets=graph.edges.map(()=>0);
  graph.edges.forEach((edge,index)=>{const key=JSON.stringify([edge.from,edge.to].sort());if(!groups.has(key))groups.set(key,[]);groups.get(key).push(index);});
  for(const group of groups.values())group.forEach((index,i)=>{const edge=graph.edges[index];offsets[index]=(i-(group.length-1)/2)*60*(edge.from>edge.to?-1:1);});
  return offsets;
}

export function graphEdgeGeometry(a,b,offset=0){
  const r=GRAPH_NODE_RADIUS,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
  if(d===0){
    const side=a.y<110?1:-1,start={x:a.x-r*.6,y:a.y+side*r*.8},end={x:a.x+r*.6,y:a.y+side*r*.8};
    return {path:`M ${start.x} ${start.y} C ${a.x-r*2} ${a.y+side*r*3} ${a.x+r*2} ${a.y+side*r*3} ${end.x} ${end.y}`,label:{x:a.x,y:a.y+side*r*2.6}};
  }
  if(offset){
    const c={x:(a.x+b.x)/2-dy/d*offset*2,y:(a.y+b.y)/2+dx/d*offset*2};
    const da=Math.hypot(c.x-a.x,c.y-a.y),db=Math.hypot(c.x-b.x,c.y-b.y);
    const start={x:a.x+(c.x-a.x)/da*r,y:a.y+(c.y-a.y)/da*r},end={x:b.x+(c.x-b.x)/db*r,y:b.y+(c.y-b.y)/db*r};
    return {path:`M ${start.x} ${start.y} Q ${c.x} ${c.y} ${end.x} ${end.y}`,label:{x:(start.x+2*c.x+end.x)/4,y:(start.y+2*c.y+end.y)/4-8}};
  }
  return {path:`M ${a.x+dx/d*r} ${a.y+dy/d*r} L ${b.x-dx/d*r} ${b.y-dy/d*r}`,label:{x:(a.x+b.x)/2,y:(a.y+b.y)/2-8}};
}

export function bindGraphDrag(stage,graph,{changed,draw,chooseNode,fail}){
  const offsets=graphEdgeOffsets(graph);
  const nodes=new Map(graph.nodes.map((node,index)=>[node.id,{node,index}]));
  const incident=new Map(graph.nodes.map(n=>[n.id,[]]));
  for(const el of stage.querySelectorAll('[data-edge]')){
    const edge=graph.edges[Number(el.dataset.edge)];
    const entry={edge,offset:offsets[Number(el.dataset.edge)],path:el.querySelector('path'),label:el.querySelector('text')};
    incident.get(edge.from)?.push(entry);
    if(edge.to!==edge.from)incident.get(edge.to)?.push(entry);
  }
  const point=e=>{
    const p=stage.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
    return p.matrixTransform(stage.getScreenCTM().inverse());
  };
  function updateEdges(id){
    for(const {edge,offset,path,label} of incident.get(id)||[]){
      const a=nodes.get(edge.from),b=nodes.get(edge.to);
      if(!a||!b)continue;
      const geometry=graphEdgeGeometry(graphNodePosition(a.node,a.index),graphNodePosition(b.node,b.index),offset);
      path.setAttribute('d',geometry.path);
      label.setAttribute('x',geometry.label.x);label.setAttribute('y',geometry.label.y);
    }
  }
  let drag=null;
  for(const el of stage.querySelectorAll('[data-node]')){
    el.onpointerdown=e=>{
      if(e.button!==0||drag)return;
      const {node,index}=nodes.get(el.dataset.node);
      drag={node,el,id:e.pointerId,start:point(e),position:graphNodePosition(node,index),original:{x:node.x,y:node.y},moved:false};
      e.preventDefault();el.setPointerCapture(e.pointerId);
    };
    el.onpointermove=e=>{
      if(!drag||drag.el!==el||drag.id!==e.pointerId)return;
      const p=point(e);
      if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>3)drag.moved=true;
      if(!drag.moved)return;
      drag.node.x=Math.max(45,Math.min(855,drag.position.x+p.x-drag.start.x));
      drag.node.y=Math.max(45,Math.min(420,drag.position.y+p.y-drag.start.y));
      el.setAttribute('transform',`translate(${drag.node.x},${drag.node.y})`);
      updateEdges(drag.node.id);
    };
    el.onpointerup=e=>{
      if(!drag||drag.el!==el||drag.id!==e.pointerId)return;
      const {moved,node}=drag;drag=null;
      if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);
      if(moved){changed();draw();}else Promise.resolve(chooseNode(node.id)).catch(fail);
    };
    const cancel=e=>{
      if(!drag||drag.el!==el||drag.id!==e.pointerId)return;
      Object.assign(drag.node,drag.original);drag=null;
      if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);
      draw();
    };
    el.onpointercancel=cancel;el.onlostpointercapture=cancel;
    el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();Promise.resolve(chooseNode(el.dataset.node)).catch(fail);}};
  }
}
