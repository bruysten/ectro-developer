// Export the chart and its visible legend as a standalone SVG, without page CSS.
export function exportChartSvg(root,{title='',description=''}={}){
 const original=root.querySelector('svg');if(!original)return null;
 const svg=original.cloneNode(true),[x,y,width,height]=svg.getAttribute('viewBox').split(/\s+/).map(Number),fontSize=parseFloat(svg.style.fontSize)||12;
 const items=[...root.querySelectorAll('.studio-legend>span')],columns=width>=600?2:1,rowHeight=Math.max(26,fontSize*1.8),heading=42,legendHeight=items.length?Math.ceil(items.length/columns)*rowHeight+22:0;
 const total=height+heading+legendHeight,ns='http://www.w3.org/2000/svg';
 const el=(tag,attrs={},text)=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;return node;};
 const shorten=(value,count)=>{const chars=[...value];return chars.length>count?chars.slice(0,count-1).join('')+'…':value;};
 const background=svg.querySelector(':scope > rect'),plot=el('g',{transform:`translate(0 ${heading})`});
 for(const child of [...svg.children])if(child!==background&&child.tagName.toLowerCase()!=='title')plot.append(child);
 if(background)background.setAttribute('height',String(total));
 svg.setAttribute('viewBox',`${x} ${y} ${width} ${total}`);svg.setAttribute('width',String(width));svg.setAttribute('height',String(total));svg.append(plot);
 const headline=el('text',{x:24,y:28,fill:'currentColor','font-weight':600},shorten(title,Math.floor((width-48)/(fontSize*.7))));headline.append(el('title',{},title));svg.append(headline);
 svg.append(el('desc',{},description));
 items.forEach((item,index)=>{const col=index%columns,row=Math.floor(index/columns),left=24+col*(width-48)/columns,top=height+heading+20+row*rowHeight,color=item.querySelector('i')?.style.background||'currentColor',label=item.textContent.trim();
  const group=el('g');group.append(el('rect',{x:left,y:top-10,width:10,height:10,fill:color,rx:2}));
  const text=el('text',{x:left+18,y:top,fill:'currentColor'},shorten(label,Math.max(5,Math.floor(((width-48)/columns-30)/(fontSize*.65)))));text.append(el('title',{},label));group.append(text);svg.append(group);
 });
 return svg.outerHTML;
}
