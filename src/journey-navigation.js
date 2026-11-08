import {escapeHtml as e} from './studio-charts.js';

// Fit complete cards into the available space, including a single narrow phone column.
export function journeyColumns(width,count){return Math.max(1,Math.min(count||1,Math.floor((width+12)/202)));}
export function journeyRevealScroll(left,width,start,end,max){
 const target=start<left?start:end>left+width?end-width:left;
 return Math.max(0,Math.min(max,target));
}

export function bindJourneyNavigation({board,picker,previous,next,position,getStages,getSelected,onSelect,onResize=()=>{},windowRef=window}){
 let disposed=false,frame=0,lastWidth=0,lastSelection='',options='';
 const motion=()=>windowRef.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
 function reveal(behavior='instant'){
  if(!board.clientWidth)return;
  const card=[...board.children].find(el=>el.dataset.stage===getSelected());if(!card)return;
  const view=board.getBoundingClientRect(),rect=card.getBoundingClientRect(),left=board.scrollLeft;
  const target=journeyRevealScroll(left,board.clientWidth,rect.left-view.left+left-3,rect.right-view.left+left+3,board.scrollWidth-board.clientWidth);
  board.scrollTo({left:target,behavior});
 }
 function fit(){
  if(disposed||!board.clientWidth)return;
  const width=board.clientWidth;
  board.style.setProperty('--journey-columns',journeyColumns(width,getStages().length));
  if(width!==lastWidth){lastWidth=width;reveal();onResize();}
 }
 function choose(id,focusCard=false){
  if(!getStages().some(s=>s.id===id))return;
  onSelect(id);
  if(focusCard)[...board.children].find(el=>el.dataset.stage===id)?.focus({preventScroll:true});
 }
 function refresh(){
  const stages=getStages(),index=stages.findIndex(s=>s.id===getSelected());
  const html=stages.map((s,i)=>`<option value="${e(s.id)}">${i+1} · ${e(s.name||'Unbenannte Phase')}</option>`).join('');
  if(html!==options){options=html;picker.innerHTML=html;}
  picker.value=getSelected()||'';picker.disabled=index<0;
  previous.disabled=index<=0;next.disabled=index<0||index>=stages.length-1;
  const label=index<0?'Noch keine Phasen':`Phase ${index+1} von ${stages.length}`;
  if(position.textContent!==label)position.textContent=label;
  for(const card of board.children)if(card.dataset.stage)card.tabIndex=card.dataset.stage===getSelected()?0:-1;
  fit();
  const selection=`${getSelected()}:${index}`;
  if(selection!==lastSelection){lastSelection=selection;reveal(motion());}
 }
 const click=ev=>{const card=ev.target.closest('[data-stage]');if(card&&board.contains(card))choose(card.dataset.stage,true);};
 const keydown=ev=>{
  const card=ev.target.closest('[data-stage]');if(!card)return;
  const stages=getStages(),index=stages.findIndex(s=>s.id===card.dataset.stage);
  const target={ArrowLeft:index-1,ArrowRight:index+1,Home:0,End:stages.length-1}[ev.key];
  if(target===undefined||ev.altKey||ev.ctrlKey||ev.metaKey)return;
  ev.preventDefault();if(stages[target])choose(stages[target].id,true);
 };
 const change=()=>choose(picker.value),back=()=>{const stages=getStages(),index=stages.findIndex(s=>s.id===getSelected());if(index>0)choose(stages[index-1].id);};
 const forward=()=>{const stages=getStages(),index=stages.findIndex(s=>s.id===getSelected());if(index>=0&&stages[index+1])choose(stages[index+1].id);};
 board.addEventListener('click',click);board.addEventListener('keydown',keydown);
 picker.addEventListener('change',change);previous.addEventListener('click',back);next.addEventListener('click',forward);
 const resize=new windowRef.ResizeObserver(()=>{windowRef.cancelAnimationFrame(frame);frame=windowRef.requestAnimationFrame(fit);});resize.observe(board);
 return {refresh,dispose(){disposed=true;resize.disconnect();windowRef.cancelAnimationFrame(frame);board.removeEventListener('click',click);board.removeEventListener('keydown',keydown);picker.removeEventListener('change',change);previous.removeEventListener('click',back);next.removeEventListener('click',forward);}};
}
