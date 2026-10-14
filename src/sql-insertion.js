import {phpLanguage} from '@codemirror/lang-php';

const phpParser=phpLanguage.parser.configure({top:'Template'});

export function sqlInsertion(sql,{asPhp=false,source='',from=0,to=from}={}){
  const query=sql.trim();
  if(!query)return '';
  const statement=query.endsWith(';')?query:query+';';
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
  const body=`$sql = '${literal}';\n${indent}$result = $conn->query($sql);`;
  return (!inPhp(from)?'<?php\n'+indent:'')+body+(!inPhp(to)?'\n'+indent+'?>':'');
}
