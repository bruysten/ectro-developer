export const GRAPH_NODE_RADIUS=35;

// Imported nodes without coordinates must use the same position everywhere.
export function graphNodePosition(node,index){
  return {x:node.x??100+index*90,y:node.y??200};
}

export function graphEdgeGeometry(a,b){
  const r=GRAPH_NODE_RADIUS,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
  if(d===0){
    const side=a.y<110?1:-1,start={x:a.x-r*.6,y:a.y+side*r*.8},end={x:a.x+r*.6,y:a.y+side*r*.8};
    return {path:`M ${start.x} ${start.y} C ${a.x-r*2} ${a.y+side*r*3} ${a.x+r*2} ${a.y+side*r*3} ${end.x} ${end.y}`,label:{x:a.x,y:a.y+side*r*2.6}};
  }
  return {path:`M ${a.x+dx/d*r} ${a.y+dy/d*r} L ${b.x-dx/d*r} ${b.y-dy/d*r}`,label:{x:(a.x+b.x)/2,y:(a.y+b.y)/2-8}};
}

export function bindGraphDrag(stage,graph,{changed,draw,chooseNode,fail}){
  const nodes=new Map(graph.nodes.map((node,index)=>[node.id,{node,index}]));
  const incident=new Map(graph.nodes.map(n=>[n.id,[]]));
  for(const el of stage.querySelectorAll('[data-edge]')){
    const edge=graph.edges[Number(el.dataset.edge)];
    const entry={edge,path:el.querySelector('path'),label:el.querySelector('text')};
    incident.get(edge.from)?.push(entry);
    if(edge.to!==edge.from)incident.get(edge.to)?.push(entry);
  }
  const point=e=>{
    const p=stage.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
    return p.matrixTransform(stage.getScreenCTM().inverse());
  };
  function updateEdges(id){
    for(const {edge,path,label} of incident.get(id)||[]){
      const a=nodes.get(edge.from),b=nodes.get(edge.to);
      if(!a||!b)continue;
      const geometry=graphEdgeGeometry(graphNodePosition(a.node,a.index),graphNodePosition(b.node,b.index));
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
