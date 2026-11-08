<?php
declare(strict_types=1);
$private=sys_get_temp_dir().'/ectro-directions-'.bin2hex(random_bytes(6));mkdir($private,0700);putenv('APP_DATA_DIR='.$private);putenv('APP_ENV=development');putenv('APP_KEY='.base64_encode(random_bytes(32)));
register_shutdown_function(function()use($private){$it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($private,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);foreach($it as $f)$f->isDir()?rmdir($f->getPathname()):unlink($f->getPathname());rmdir($private);});
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/templates.php';require __DIR__.'/../app/mysql.php';require __DIR__.'/../app/lab-api.php';
$uid=id();query('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',[$uid,'Graph','graph@example.test','unused','user',now()]);$u=one('SELECT * FROM users WHERE id=?',[$uid]);$pid=createProject($u,'Graph','web');
$base=['nodes'=>[['id'=>'a','label'=>'A','type'=>'Person'],['id'=>'b','label'=>'B','type'=>'Firma']],'edges'=>[['id'=>'e','from'=>'a','to'=>'b','label'=>'kennt']],'types'=>[['name'=>'Person','fields'=>[]],['name'=>'Firma','fields'=>[]]],'relations'=>[['name'=>'kennt','from'=>'Person','to'=>'Firma']]];
foreach(['forward','reverse','both','none'] as $direction){$content=$base;$content['edges'][0]['direction']=$direction;$o=labSave($u,['project'=>$pid,'kind'=>'graph','name'=>$direction,'content'=>$content]);if(labObject($u,$o['id'])['content']['edges'][0]['direction']!==$direction)throw new RuntimeException('Direction persistence');
 foreach([['a','b',$direction!=='reverse'],['b','a',$direction!=='forward']] as [$node,$target,$expected]){$r=labRpc($u,['project'=>$pid,'op'=>'graph.path','args'=>['id'=>$o['id'],'node'=>$node,'target'=>$target]]);if((bool)$r['value']!==$expected)throw new RuntimeException('Direction traversal '.$direction);}
 $r=studioReadSource($u,$pid,['type'=>'graph_edges','id'=>$o['id']]);if($r['rows'][0]['direction']!==$direction)throw new RuntimeException('Direction source');
}
foreach([false,null,'backward',123] as $bad){$c=$base;$c['edges'][0]['direction']=$bad;try{labValidate('graph',$c);throw new RuntimeException('Invalid direction accepted');}catch(ApiError $e){if($e->status!==422)throw $e;}}
echo "Graph directions verified: all four modes persist with ontology endpoints intact, source extraction and path traversal follow direction, invalid modes rejected.\n";
