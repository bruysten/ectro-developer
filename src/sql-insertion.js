import {phpLanguage} from '@codemirror/lang-php';

const phpParser=phpLanguage.parser.configure({top:'Template'});

export function sqlInsertion(sql,{asPhp=false,source='',from=0,to=from,academy=false,language='sql'}={}){
  const query=sql.trim();
  if(!query)return '';
  const statement=query.endsWith(';')?query:query+';';
  if(academy&&language==='python')return 'import academy\nresult = await academy.sql('+JSON.stringify(statement)+')\nprint(result)';
  if(academy&&language==='javascript')return 'const result = await academy.sql('+JSON.stringify(statement)+');\nconsole.log(result);';
  if(!asPhp)return statement;
  const literal=statement.replaceAll('\\','\\\\').replaceAll("'","\\'");
  // Use parsed PHP tags so tags inside strings and comments do not change context.
  const tree=phpParser.parse(source);
  const inPhp=position=>{
    let active=false;
    tree.iterate({to:position,enter:node=>{
      if(node.to<=position){if(node.name==='PhpOpen')active=true;else if(node.name==='PhpClose')active=false;}
    }});
    return active;
  };
  const linePrefix=source.slice(source.lastIndexOf('\n',from-1)+1,from);
  const indent=/^[\t ]*$/.test(linePrefix)?linePrefix:'';
  const body=`$sql = '${literal}';\n${indent}$result = ${academy?'academy_sql($sql)':'$conn->query($sql)'};`;
  return (!inPhp(from)?'<?php\n'+indent:'')+body+(!inPhp(to)?'\n'+indent+'?>':'');
}
