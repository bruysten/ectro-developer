// Only action fly-outs: learning panels and the sidebar keep native disclosure behavior.
const selector='details.studio-overflow,details.graph-overflow';
export function mountDisclosureMenus(documentRef=document){
 const windowRef=documentRef.defaultView;
 const opened=()=>[...documentRef.querySelectorAll(selector)].filter(menu=>menu.open);
 const position=menu=>{const panel=menu.querySelector(':scope > div');if(!panel?.getBoundingClientRect||!windowRef)return;panel.style.setProperty('--menu-shift','0px');const bounds=panel.getBoundingClientRect(),width=documentRef.documentElement.clientWidth;panel.style.setProperty('--menu-shift',(bounds.left<12?12-bounds.left:bounds.right>width-12?width-12-bounds.right:0)+'px');};
 const closeOthers=except=>{for(const menu of opened())if(menu!==except)menu.open=false;};
 const outside=event=>{for(const menu of opened())if(!menu.contains(event.target))menu.open=false;};
 const click=event=>{
  const menu=event.target.closest?.(selector);if(!menu)return;
  const summary=event.target.closest?.('summary');if(summary?.parentElement===menu){closeOthers(menu);return;}
  const action=event.target.closest?.('button,a[href]');if(!action||action.disabled||action.getAttribute('aria-disabled')==='true')return;
  menu.open=false;menu.querySelector('summary')?.focus({preventScroll:true});
 };
 const key=event=>{if(event.key!=='Escape')return;const menus=opened();if(!menus.length)return;const current=menus.find(menu=>menu.contains(event.target))||menus.at(-1);closeOthers();current.querySelector('summary')?.focus({preventScroll:true});event.preventDefault();event.stopPropagation();};
 const toggle=event=>{if(event.target.matches?.(selector)&&event.target.open){closeOthers(event.target);position(event.target);}};
 const resize=()=>opened().forEach(position);
 documentRef.addEventListener('pointerdown',outside,true);
 documentRef.addEventListener('focusin',outside);
 documentRef.addEventListener('click',click,true);
 documentRef.addEventListener('keydown',key,true);
 documentRef.addEventListener('toggle',toggle,true);
 windowRef?.addEventListener('resize',resize);
 return()=>{documentRef.removeEventListener('pointerdown',outside,true);documentRef.removeEventListener('focusin',outside);documentRef.removeEventListener('click',click,true);documentRef.removeEventListener('keydown',key,true);documentRef.removeEventListener('toggle',toggle,true);windowRef?.removeEventListener('resize',resize);};
}
