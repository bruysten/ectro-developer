import assert from 'node:assert/strict';
import {previewQuery} from '../src/sql-composer.js';
import {sqlInsertion} from '../src/sql-insertion.js';
import {spawnSync} from 'node:child_process';
const cols=[{Field:'id',Type:'INT',Null:'NO',Default:null,Extra:'auto_increment'},{Field:'name',Type:'VARCHAR(80)',Null:'NO',Default:null,Extra:''},{Field:'price',Type:'DECIMAL',Null:'YES',Default:'0',Extra:''}];
let checks=0;
const base={table:'products',action:'insert',values:{name:"O'Brien"},conditions:[],columns:[],order:[],limit:20,distinct:false};
let result=previewQuery(base,cols);assert.ok(result.ready&&result.sql.includes("'O''Brien'"));checks++;
assert.ok(!previewQuery({...base,values:{}},cols).ready);checks++;
assert.ok(!previewQuery({...base,values:{price:'2'}},cols).ready);checks++;
assert.ok(previewQuery({...base,values:{name:'First',price:null}},cols).ready);checks++;
assert.ok(!previewQuery({...base,values:{name:null}},cols).ready);checks++;
assert.ok(!previewQuery({...base,values:{name:'First',price:'text'}},cols).ready);checks++;
assert.ok(!previewQuery({...base,action:'delete'},cols).ready);checks++;
assert.ok(!previewQuery({...base,action:'update'},cols).ready);checks++;
result=previewQuery({...base,action:'select',columns:['name'],distinct:true,conditions:[{column:'id',operator:'>=',value:'2'}],order:[{column:'price',direction:'DESC'}],limit:10},cols);assert.ok(result.ready&&result.sql.includes('SELECT DISTINCT `name`')&&result.sql.includes('ORDER BY `price` DESC')&&result.sql.endsWith('LIMIT 10;'));checks++;
assert.ok(!previewQuery({...base,limit:101},cols).ready);checks++;
result=previewQuery({...base,rows:[{name:'First'},{name:'Second'}]},cols);assert.ok(result.ready&&result.sql.includes("('First'),\n  ('Second')"));checks++;
console.log(`${checks} contextual SQL preview checks passed.`);

assert.equal(sqlInsertion(' SELECT * FROM `products` '),'SELECT * FROM `products`;');
assert.equal(sqlInsertion('SELECT 1;'),'SELECT 1;');
assert.equal(sqlInsertion('   ',{asPhp:true}),'');
const statement="SELECT `price$usd`, `O'Brien`, `back\\slash`, `two\nlines`, `?>`, `Größe` FROM `products` LIMIT 20;";
const contexts=[
  ['',0,0],
  ['<?php\n',6,6],
  ["<?php echo '?>';\n",16,16],
  ['<?php /* ?> */\n',15,15],
  ['<p>Template</p>',15,15],
  ['<?php echo 1;?>\n',16,16],
  ['<?php\nif (true) {\n    \n}\n',22,22],
  ['<?php\n?>text',6,12],
  ['text<?php\n',0,10],
  ['<?php $old = 1;',0,15],
];
for(const [source,from,to] of contexts){
  const insert=sqlInsertion(statement,{asPhp:true,source,from,to});
  const document=source.slice(0,from)+insert+source.slice(to);
  const stub='<?php $conn=new class {public function query($sql){echo "__SQL__".base64_encode($sql)."__END__";return true;}}; ?>';
  const execution=spawnSync('php',[],{input:stub+document,encoding:'utf8'});
  assert.equal(execution.status,0,execution.stderr+'\n'+document);
  assert.equal(execution.stderr,'',document);
  const match=execution.stdout.match(/__SQL__([A-Za-z0-9+/=]+)__END__/);
  assert.ok(match,execution.stdout);
  assert.equal(Buffer.from(match[1],'base64').toString(),statement,'SQL must survive PHP quoting and indentation unchanged');
}
assert.ok(!sqlInsertion('SELECT 1',{asPhp:true,source:'<?php\n',from:6}).includes('<?php'));
assert.ok(sqlInsertion('SELECT 1',{asPhp:true}).startsWith('<?php\n'));
console.log(`${contexts.length+5} PHP SQL insertion checks passed.`);
