<?php
declare(strict_types=1);
$private=sys_get_temp_dir().'/ectro-statistics-'.bin2hex(random_bytes(6));mkdir($private,0700);putenv('APP_DATA_DIR='.$private);putenv('APP_ENV=development');putenv('APP_KEY='.base64_encode(random_bytes(32)));
register_shutdown_function(function()use($private){foreach(glob($private.'/*') as $f)unlink($f);rmdir($private);});
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/templates.php';require __DIR__.'/../app/mysql.php';require __DIR__.'/../app/lab-api.php';
$example=json_decode(stream_get_contents(STDIN),true,64,JSON_THROW_ON_ERROR);
// Simulate a real database at the preceding catalog, with dependent readiness history.
$pdo=new PDO('sqlite:'.$private.'/app.sqlite');$pdo->exec(str_replace([",'statistics'",",'geo'",",'agent'",",'archive'"],'',file_get_contents(__DIR__.'/../app/schema.sql')));
$uid=id();$pid=id();$restricted=id();$oid=id();$pdo->prepare('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)')->execute([$uid,'Learner','stat@example.test','unused','user',now()]);foreach([$pid,$restricted] as $p)$pdo->prepare('INSERT INTO projects(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)')->execute([$p,$uid,'Existing',now(),now()]);
$pdo->prepare('INSERT INTO lab_objects(id,project_id,kind,name,content,version,updated_at) VALUES(?,?,?,?,?,?,?)')->execute([$oid,$pid,'readiness','Existing check','{}',4,now()]);$pdo->prepare('INSERT INTO readiness_revisions VALUES(?,?,?,?,?)')->execute([$oid,4,$uid,'{"organization":"Übung"}',now()]);
$pdo->prepare('INSERT INTO lab_project_config VALUES(?,?)')->execute([$pid,json_encode(['tools'=>array_values(array_diff(LAB_KINDS,['statistics','geo','agent','archive'])),'entry'=>'dataset'])]);$limited='{"tools":["dataset"],"entry":"dataset"}';$pdo->prepare('INSERT INTO lab_project_config VALUES(?,?)')->execute([$restricted,$limited]);$pdo=null;
$d=db();if((int)query('SELECT COUNT(*) FROM readiness_revisions WHERE object_id=?',[$oid])->fetchColumn()!==1||one('SELECT version FROM lab_objects WHERE id=?',[$oid])['version']!==4)throw new RuntimeException('Migration lost object/history.');if($d->query('PRAGMA foreign_key_check')->fetch()||!(int)$d->query('PRAGMA foreign_keys')->fetchColumn())throw new RuntimeException('Migration broke foreign keys.');if(json_decode(one('SELECT config FROM lab_project_config WHERE project_id=?',[$pid])['config'],true)['tools']!==LAB_KINDS||one('SELECT config FROM lab_project_config WHERE project_id=?',[$restricted])['config']!==$limited)throw new RuntimeException('Catalog migration widened restrictions.');
$u=one('SELECT * FROM users WHERE id=?',[$uid]);$saved=labSave($u,['project'=>$pid,'kind'=>'statistics','name'=>'Basket test','content'=>$example]);if(labObject($u,$saved['id'])['content']!=$example)throw new RuntimeException('Round trip changed basket data.');
function badStatistics(callable $fn,int $status=422):void{try{$fn();throw new RuntimeException('Expected rejection.');}catch(ApiError $e){if($e->status!==$status)throw $e;}}
badStatistics(fn()=>labSave($u,['project'=>$restricted,'kind'=>'statistics','name'=>'Denied','content'=>$example]),403);
foreach([
 [...$example,'products'=>['A','A']],
 [...$example,'baskets'=>[['id'=>'1','items'=>['unknown']]]],
 [...$example,'baskets'=>[['id'=>'1','items'=>['Hemd','Hemd']]]],
 [...$example,'baskets'=>[['id'=>'1','items'=>[]],['id'=>'1','items'=>[]]]],
 [...$example,'rule'=>['antecedent'=>['Hemd'],'consequent'=>['Hemd']]],
 [...$example,'minSupport'=>101], [...$example,'minConfidence'=>'50'],
 [...$example,'baskets'=>array_fill(0,1001,['id'=>'1','items'=>[]])]
] as $bad)badStatistics(fn()=>studioValidate('statistics',$bad));
$gid=id();query('INSERT INTO groups(id,name,created_at,features) VALUES(?,?,?,?)',[$gid,'Statistics off',now(),'{"statistics_lab":false}']);query('INSERT INTO group_members VALUES(?,?)',[$gid,$uid]);badStatistics(fn()=>labObject($u,$saved['id']),403);query('UPDATE groups SET features=? WHERE id=?',['{}',$gid]);labObject($u,$saved['id']);
echo "Statistics persistence, validation, group/project authorization and migration with readiness histories verified.\n";
