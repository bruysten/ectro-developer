// Content detection supplements file types, including markup/styles inside scripts and templates.
const WEB_TYPES=/\.(?:html?|css|scss|sass|less|vue|svelte|jsx|tsx|svg)$/i;
const TAGS='html|head|body|title|meta|link|style|script|div|span|p|a|h[1-6]|main|section|article|aside|header|footer|nav|button|input|label|form|textarea|select|option|table|thead|tbody|tfoot|tr|td|th|ul|ol|li|img|picture|source|video|audio|canvas|svg|path|circle|rect|g|text|br|hr|strong|em|small|b|i|u|pre|code|details|summary|dialog|figure|figcaption|blockquote|fieldset|legend|iframe|template|slot|address|abbr|time|output|datalist|optgroup|progress|meter|dl|dt|dd|sup|sub|mark|samp|kbd|var|wbr|area|base|col|embed|param|track|math|[a-z][\\w]*-[\\w-]+';
const HTML=new RegExp('<!doctype\\s+html\\b|<\\/?(?:'+TAGS+')(?=[\\s/>])[^<>]*>','i');
const DECLARATION=/(?:^|;)\s*(?:--[\w-]+|(?:color|background(?:-[\w-]+)?|font(?:-[\w-]+)?|border(?:-[\w-]+)?|outline(?:-[\w-]+)?|margin(?:-[\w-]+)?|padding(?:-[\w-]+)?|display|position|width|height|min-width|max-width|min-height|max-height|fill|stroke|opacity|box-shadow|text-shadow|text-align|line-height|gap|grid(?:-[\w-]+)?|flex(?:-[\w-]+)?|transform|animation(?:-[\w-]+)?|transition(?:-[\w-]+)?))\s*:\s*[^;{}]+(?:;|$)/i;
export function hasColorContext(path,content){
  if(WEB_TYPES.test(path))return true;
  // Comments alone do not activate a helper; quoted markup in executable strings does.
  let text=content.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g,'');
  if(/\.(?:m?js|ts|php|py|cpp?|h|java)$/i.test(path))text=text.replace(/(^|\n)\s*\/\/[^\n]*/g,'$1');
  if(HTML.test(text))return true;
  const closing=new Set([...text.matchAll(/<\/([a-z][\w:-]*)\s*>/gi)].map(m=>m[1].toLowerCase()));
  if(closing.size)for(const tag of text.matchAll(/<([a-z][\w:-]*)\b[^<>]*>/gi))if(closing.has(tag[1].toLowerCase()))return true;
  // Visit brace boundaries once; avoid repeated scans of large plain-text documents.
  let boundary=0,rule=null;
  for(const brace of text.matchAll(/[{}]/g)){
    if(brace[0]==='{'){rule={selector:text.slice(boundary,brace.index),start:brace.index+1};}
    else if(rule){
      let selector=rule.selector.split(/[\n;`]/).pop().trim();
      selector=selector.slice(Math.max(selector.lastIndexOf('"'),selector.lastIndexOf("'"))+1).trim();
      if(selector&&!/[=]/.test(selector.replace(/\[[^\]]*\]/g,''))&&!/\b(?:const|let|var|function|class|def|return|if|while|for|switch)\b/.test(selector)&&DECLARATION.test(text.slice(rule.start,brace.index)))return true;
      rule=null;
    }
    boundary=brace.index+1;
  }
  // Useful for standalone CSS declarations pasted into a text file or emitted by PHP.
  return text.split(/[\n"'`]/).some(fragment=>/;\s*$/.test(fragment)&&DECLARATION.test(fragment));
}
