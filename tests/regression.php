<?php
declare(strict_types=1);
$private=sys_get_temp_dir().'/ectro-regression-'.bin2hex(random_bytes(6));mkdir($private,0700);putenv('APP_DATA_DIR='.$private);putenv('APP_ENV=development');putenv('APP_KEY='.base64_encode(random_bytes(32)));
register_shutdown_function(function()use($private){foreach(glob($private.'/*') as $f)unlink($f);rmdir($private);});
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/templates.php';require __DIR__.'/../app/mysql.php';require __DIR__.'/../app/lab-api.php';
$reg=json_decode(stream_get_contents(STDIN),true,64,JSON_THROW_ON_ERROR);$uid=id();query('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',[$uid,'Regression','regression@example.test','unused','user',now()]);$u=one('SELECT * FROM users WHERE id=?',[$uid]);$pid=createProject($u,'Regression','web');
$basket=['products'=>['A','B'],'baskets'=>[['id'=>'1','items'=>['A','B']]],'rule'=>['antecedent'=>['A'],'consequent'=>['B']],'sourceLabel'=>'Existing basket','minSupport'=>0,'minConfidence'=>0];
$legacy=labSave($u,['project'=>$pid,'kind'=>'statistics','name'=>'Statistics','content'=>$basket]);if($legacy['content']!=$basket)throw new RuntimeException('Legacy basket changed.');
$both=[...$basket,'analysis'=>'regression','regression'=>$reg];$saved=labSave($u,[...$legacy,'project'=>$pid,'content'=>$both]);if(labObject($u,$saved['id'])['content']!=$both)throw new RuntimeException('Regression round trip failed.');$both['analysis']='basket';$switched=labSave($u,[...$saved,'project'=>$pid,'content'=>$both]);if($switched['content']['regression']!=$reg||$switched['content']['baskets']!=$basket['baskets'])throw new RuntimeException('Switching erased an experiment.');
function rejectRegression(callable $f,int $status=422):void{try{$f();throw new RuntimeException('Expected rejection.');}catch(ApiError $e){if($e->status!==$status)throw $e;}}
foreach([
 [...$reg,'points'=>[['id'=>'1','x'=>null,'y'=>2,'included'=>true]]],
 [...$reg,'points'=>[['id'=>'1','x'=>'1','y'=>2,'included'=>true]]],
 [...$reg,'points'=>[['id'=>'1','x'=>1e9,'y'=>2,'included'=>true]]],
 [...$reg,'points'=>[['id'=>'1','x'=>1,'y'=>2,'included'=>'false']]],
 [...$reg,'points'=>array_fill(0,1001,$reg['points'][0])],
 [...$reg,'points'=>[$reg['points'][0],$reg['points'][0]]],
 [...$reg,'mode'=>'unknown'],[...$reg,'showSquares'=>'yes'],[...$reg,'predictionX'=>INF],
 [...$reg,'line'=>['slope'=>1e13,'intercept'=>0]],
 [...$reg,'example'=>'unknown'],[...$reg,'example'=>[]]
] as $bad)rejectRegression(fn()=>regressionValidate($bad));
rejectRegression(fn()=>statisticsValidate([...$basket,'analysis'=>'other']));rejectRegression(fn()=>statisticsValidate([...$basket,'analysis'=>'regression']));rejectRegression(fn()=>labSave($u,[...$saved,'project'=>$pid,'content'=>$both]),409);
query('UPDATE users SET features=? WHERE id=?',['{"statistics_lab":false}',$uid]);rejectRegression(fn()=>labObject(one('SELECT * FROM users WHERE id=?',[$uid]),$saved['id']),403);
echo "Regression persistence, legacy baskets, independent procedure switching, strict validation, stale revisions and Statistics permissions verified.\n";
