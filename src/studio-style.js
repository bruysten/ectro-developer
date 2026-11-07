// Only local fonts, finite numeric ranges and opaque HEX colors enter the renderer.
export const CHART_FONTS={sans:{label:'Sans Serif',css:'system-ui, sans-serif'},serif:{label:'Serif',css:'Georgia, serif'},mono:{label:'Monospace',css:'ui-monospace, monospace'}};
export const CHART_STYLE={palette:['#b2026c','#246f88','#72549d','#b16a13','#237653','#985647','#4056aa','#686b24'],background:'#ffffff',text:'#222222',grid:'#e1e3e5',fontFamily:'sans',fontSize:12,fontWeight:400,radius:2,lineWidth:2.5,pointSize:5,pointShape:'circle',donutWidth:55,showGrid:true,showLegend:true};
export const CHART_PRESETS={
 clear:{label:'Klar',style:{}},
 soft:{label:'Sanft',style:{background:'#faf8f4',text:'#302e35',grid:'#ddd8d1',palette:['#786297','#367c83','#a35c74','#846b33','#517d52','#a6523e','#526ca6','#767429'],radius:8}},
 dark:{label:'Dunkel',style:{background:'#18202c',text:'#f2f5fa',grid:'#445063',palette:['#ef83bd','#69cddd','#c4a6f0','#f3be6b','#81d5a4','#f09f90','#97b2fa','#c4d676']}},
 contrast:{label:'Kontrastreich',style:{text:'#111111',grid:'#b8b8b8',palette:['#850047','#005c78','#523080','#754500','#006143','#813b25','#243e8f','#4b5200'],fontSize:14,fontWeight:500,lineWidth:3,pointSize:6}},
};
const color=(value,fallback)=>typeof value==='string'&&/^#[\da-f]{6}$/i.test(value)?value.toLowerCase():fallback;
export function normalizeChartStyle(input={}){
 const s=input&&typeof input==='object'?input:{},out={...CHART_STYLE,palette:CHART_STYLE.palette.map((v,i)=>color(s.palette?.[i],v))};
 for(const key of ['background','text','grid'])out[key]=color(s[key],out[key]);
 for(const [key,min,max] of [['fontSize',10,18],['radius',0,18],['lineWidth',1,6],['pointSize',3,9],['donutWidth',25,90]])if(typeof s[key]==='number'&&Number.isFinite(s[key]))out[key]=Math.min(max,Math.max(min,s[key]));
 if(Object.hasOwn(CHART_FONTS,s.fontFamily))out.fontFamily=s.fontFamily;
 if([400,500,600,700].includes(s.fontWeight))out.fontWeight=s.fontWeight;
 if(['circle','square','diamond'].includes(s.pointShape))out.pointShape=s.pointShape;
 for(const key of ['showGrid','showLegend'])if(typeof s[key]==='boolean')out[key]=s[key];
 return out;
}
export function chartStylePreset(key){return normalizeChartStyle(CHART_PRESETS[key]?.style);}
const luminance=hex=>{const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
export function contrastRatio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export const inkFor=color=>contrastRatio(color,'#ffffff')>contrastRatio(color,'#111111')?'#ffffff':'#111111';
export function blendColor(foreground,background,opacity){return '#'+[1,3,5].map(i=>Math.round(parseInt(foreground.slice(i,i+2),16)*opacity+parseInt(background.slice(i,i+2),16)*(1-opacity)).toString(16).padStart(2,'0')).join('');}
export function chartStyleCss(input){const s=normalizeChartStyle(input);return `--chart-bg:${s.background};--chart-text:${s.text};--chart-grid:${s.grid};--chart-font:${CHART_FONTS[s.fontFamily].css};--chart-font-size:${s.fontSize}px;--chart-radius:${s.radius}px;--chart-weight:${s.fontWeight}`;}
