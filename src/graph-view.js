export const GRAPH_NODE_RADIUS=35;

// Imported nodes without coordinates must use the same position everywhere.
export function graphNodePosition(node,index){
  return {x:node.x??120+(index%5)*170,y:node.y??110+Math.floor(index/5)*150};
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
    const entry={edge,offset:offsets[Number(el.dataset.edge)],path:el.querySelector('path'),hit:el.querySelector('.graph-edge-hit'),label:el.querySelector('text')};
    incident.get(edge.from)?.push(entry);
    if(edge.to!==edge.from)incident.get(edge.to)?.push(entry);
  }
  const point=e=>{
    const p=stage.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
    return p.matrixTransform(stage.getScreenCTM().inverse());
  };
  function updateEdges(id){
    for(const {edge,offset,path,hit,label} of incident.get(id)||[]){
      const a=nodes.get(edge.from),b=nodes.get(edge.to);
      if(!a||!b)continue;
      const geometry=graphEdgeGeometry(graphNodePosition(a.node,a.index),graphNodePosition(b.node,b.index),offset);
      path.setAttribute('d',geometry.path);hit?.setAttribute('d',geometry.path);
      label.setAttribute('x',geometry.label.x);label.setAttribute('y',geometry.label.y);
    }
  }
  let drag=null;
  for(const el of stage.querySelectorAll('[data-node]')){
    el.onpointerdown=e=>{
      if(e.button!==0||drag)return;
      const {node,index}=nodes.get(el.dataset.node);
      drag={node,el,id:e.pointerId,start:point(e),position:graphNodePosition(node,index),original:{x:node.x,y:node.y},moved:false};
      e.preventDefault();e.stopPropagation?.();el.setPointerCapture(e.pointerId);
    };
    el.onpointermove=e=>{
      if(!drag||drag.el!==el||drag.id!==e.pointerId)return;
      const p=point(e);
      if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>3)drag.moved=true;
      if(!drag.moved)return;
      drag.node.x=Math.max(45,Math.min(10000,drag.position.x+p.x-drag.start.x));
      drag.node.y=Math.max(45,Math.min(10000,drag.position.y+p.y-drag.start.y));
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

// A deterministic force layout; existing coordinates are only
// replaced when the user explicitly requests a new arrangement.
export function arrangeGraph(graph){
  const count=graph.nodes.length;if(!count)return [];
  const columns=Math.ceil(Math.sqrt(count));
  const points=graph.nodes.map((n,i)=>({id:n.id,x:120+(i%columns)*170,y:110+Math.floor(i/columns)*150}));
  const byId=new Map(points.map((n,i)=>[n.id,i]));
  const links=graph.edges.map(e=>[byId.get(e.from),byId.get(e.to)]).filter(([a,b])=>a!==undefined&&b!==undefined&&a!==b);
  // Bound quadratic work for larger imports while retaining evenly spaced rows.
  if(count<=160)for(let step=0;step<180;step++){
    const forces=points.map(()=>({x:0,y:0}));
    for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){
      const dx=points[i].x-points[j].x,dy=points[i].y-points[j].y,d=Math.max(1,Math.hypot(dx,dy)),force=22000/(d*d);
      forces[i].x+=dx/d*force;forces[i].y+=dy/d*force;forces[j].x-=dx/d*force;forces[j].y-=dy/d*force;
    }
    for(const [a,b] of links){const dx=points[b].x-points[a].x,dy=points[b].y-points[a].y,d=Math.max(1,Math.hypot(dx,dy)),force=(d-220)*.018;forces[a].x+=dx/d*force;forces[a].y+=dy/d*force;forces[b].x-=dx/d*force;forces[b].y-=dy/d*force;}
    const cooling=1-step/200;
    points.forEach((p,i)=>{p.x+=Math.max(-10,Math.min(10,forces[i].x))*cooling;p.y+=Math.max(-10,Math.min(10,forces[i].y))*cooling;});
  }
  const minX=Math.min(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y));
  return points.map(p=>({...p,x:Math.round(p.x-minX+120),y:Math.round(p.y-minY+110)}));
}

export function graphFitView(graph,width,height){
  const points=graph.nodes.map(graphNodePosition),ratio=width/height;
  const xs=points.flatMap(p=>[p.x-115,p.x+115]),ys=points.flatMap(p=>[p.y-65,p.y+105]);
  const positions=new Map(graph.nodes.map((n,i)=>[n.id,points[i]])),offsets=graphEdgeOffsets(graph);
  graph.edges.forEach((e,i)=>{const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)return;const geometry=graphEdgeGeometry(a,b,offsets[i]),values=geometry.path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);for(let j=0;j<values.length;j+=2){xs.push(values[j]-20,values[j]+20);ys.push(values[j+1]-20,values[j+1]+20);}const half=[...(e.label||'')].length*3.5+12;xs.push(geometry.label.x-half,geometry.label.x+half);ys.push(geometry.label.y-20,geometry.label.y+20);});
  const minX=xs.length?Math.min(...xs):0,maxX=xs.length?Math.max(...xs):900;
  const minY=ys.length?Math.min(...ys):0,maxY=ys.length?Math.max(...ys):480;
  const w=Math.max(maxX-minX,(maxY-minY)*ratio,width);
  return {x:(minX+maxX-w)/2,y:(minY+maxY-w/ratio)/2,width:w,height:w/ratio};
}

export function bindGraphViewport(stage,graph,state,{clear,escape,chooseNode,fail}){
  let size=stage.getBoundingClientRect(),pan=null;
  const apply=()=>{
    if(!state.view)return;
    const v=state.view;stage.setAttribute('viewBox',`${v.x} ${v.y} ${v.width} ${v.height}`);
    const output=stage.parentElement.querySelector('[data-graph-zoom]');if(output)output.textContent=Math.round(size.width/v.width*100)+' %';
  };
  const fit=()=>{state.autoFit=true;state.view=graphFitView(graph,size.width||900,size.height||480);apply();};
  if(!state.view||state.autoFit)fit();else{state.view.height=state.view.width/(size.width/size.height);apply();}
  const zoom=(factor,clientX=size.left+size.width/2,clientY=size.top+size.height/2)=>{
    size=stage.getBoundingClientRect();const v=state.view,scale=size.width/v.width,next=Math.max(.2,Math.min(2.5,scale*factor)),width=size.width/next,height=width/(size.width/size.height);
    const rx=(clientX-size.left)/size.width,ry=(clientY-size.top)/size.height;
    state.autoFit=false;state.view={x:v.x+rx*(v.width-width),y:v.y+ry*(v.height-height),width,height};apply();
  };
  const focus=id=>{const index=graph.nodes.findIndex(n=>n.id===id);if(index<0)return;state.autoFit=false;const p=graphNodePosition(graph.nodes[index],index);if(size.width/state.view.width<1){state.view.width=size.width;state.view.height=size.height;}state.view.x=p.x-state.view.width/2;state.view.y=p.y-state.view.height/2;apply();};
  const down=e=>{
    if(e.target.closest('[data-node],[data-edge]')||![0,1].includes(e.button))return;
    stage.focus({preventScroll:true});pan={id:e.pointerId,startX:e.clientX,startY:e.clientY,view:{...state.view},moved:false};stage.setPointerCapture(e.pointerId);e.preventDefault();
  };
  const move=e=>{if(!pan||e.pointerId!==pan.id)return;const dx=e.clientX-pan.startX,dy=e.clientY-pan.startY;if(Math.hypot(dx,dy)>3)pan.moved=true;if(!pan.moved)return;state.autoFit=false;stage.classList.add('is-panning');state.view.x=pan.view.x-dx*pan.view.width/size.width;state.view.y=pan.view.y-dy*pan.view.height/size.height;apply();};
  const up=e=>{if(!pan||e.pointerId!==pan.id)return;const moved=pan.moved;pan=null;stage.classList.remove('is-panning');if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);if(!moved)clear();};
  const cancel=()=>{if(pan)state.view={...pan.view};pan=null;stage.classList.remove('is-panning');apply();};
  const wheel=e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoom(Math.exp(-e.deltaY*.008),e.clientX,e.clientY);};
  const key=e=>{
    if(e.target.closest('[data-node],[data-edge]'))return;
    if(['+','=','-','0','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();
    if(e.key==='+'||e.key==='=')zoom(1.2);if(e.key==='-')zoom(1/1.2);if(e.key==='0')fit();if(e.key==='Escape'){e.stopPropagation();escape();}
    if(e.key.startsWith('Arrow')){state.autoFit=false;const v=state.view,step=v.width*.06;v.x+=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0;v.y+=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;apply();}
  };
  stage.addEventListener('pointerdown',down);stage.addEventListener('pointermove',move);stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',cancel);stage.addEventListener('lostpointercapture',cancel);stage.addEventListener('wheel',wheel,{passive:false});stage.addEventListener('keydown',key);
  const observer=new ResizeObserver(()=>{const next=stage.getBoundingClientRect();if(next.width>0&&next.height>0){if(state.autoFit){size=next;fit();return;}const cx=state.view.x+state.view.width/2,cy=state.view.y+state.view.height/2,scale=size.width/state.view.width;state.view.width=next.width/scale;state.view.height=next.height/scale;state.view.x=cx-state.view.width/2;state.view.y=cy-state.view.height/2;size=next;apply();}});observer.observe(stage);
  const search=stage.closest('.lab-body').querySelector('[data-graph-search]'),results=stage.closest('.lab-body').querySelector('#graph-search-results');
  const hide=()=>{results.hidden=true;};
  search.oninput=()=>{
    const q=search.value.trim().toLocaleLowerCase('de');results.replaceChildren();if(!q){hide();return;}
    const matches=graph.nodes.filter(n=>(n.label+' '+n.type).toLocaleLowerCase('de').includes(q));
    results.hidden=false;
    if(!matches.length){const text=document.createElement('p');text.textContent='Keine passenden Knoten.';results.append(text);}
    for(const n of matches.slice(0,20)){const button=document.createElement('button');button.type='button';const label=document.createElement('strong'),type=document.createElement('small');label.textContent=n.label;type.textContent=n.type;button.append(label,type);button.onclick=()=>{focus(n.id);Promise.resolve(chooseNode(n.id)).catch(fail);};results.append(button);}
  };
  search.onkeydown=e=>{if(e.key==='Escape'){search.value='';hide();stage.focus();e.stopPropagation();}if(e.key==='ArrowDown'){e.preventDefault();results.querySelector('button')?.focus();}if(e.key==='Enter'&&!results.hidden){e.preventDefault();results.querySelector('button')?.click();}};
  const outside=e=>{if(!e.target.closest('.graph-search-wrap'))hide();};document.addEventListener('pointerdown',outside);
  return {fit,zoom,focus,dispose(){observer.disconnect();document.removeEventListener('pointerdown',outside);stage.removeEventListener('pointerdown',down);stage.removeEventListener('pointermove',move);stage.removeEventListener('pointerup',up);stage.removeEventListener('pointercancel',cancel);stage.removeEventListener('lostpointercapture',cancel);stage.removeEventListener('wheel',wheel);stage.removeEventListener('keydown',key);}};
}
